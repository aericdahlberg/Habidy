import { NextRequest, NextResponse } from 'next/server'
import { callClaude, resolveModel, Message } from '@/lib/claude'
import { agentGuard } from '@/lib/agentGuard'
import {
  buildArchitectSystemPrompt,
  buildAutoGenerateSystemPrompt,
  buildArchitectUserContext,
  buildAutoGenerateUserMessage,
  extractHabitsFromMessage,
  type ArchitectContext,
  type QuickHabitData,
} from '@/lib/agents/architect'
import { adminClient, getProfileContext } from '@/lib/supabase'
import { getValidAccessToken } from '@/lib/google-auth'
import { getCalendarEvents, formatEventsForContext } from '@/lib/google-calendar'
import { logAgentSession } from '@/lib/logger'
import { traceable } from '@/lib/langsmith'
import {
  FlaggedInputError,
  sanitizeMessageHistory,
  sanitizeLatestUserMessage,
} from '@/lib/sanitize'

const AGENT_MODEL = resolveModel()

const MAX_TURNS = 20
const WRAP_UP_AT = 3

const supabase = adminClient()

const runArchitect = traceable(
  async (
    systemPrompt: string,
    messages: Message[],
    model: string,
    _userId: string | null,
    _turnsUsed: number,
  ): Promise<string> => callClaude({ systemPrompt, messages, model }),
  {
    name: 'architect_agent',
    run_type: 'chain',
    tags: ['habidy', 'architect'],
  }
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, userId, autoGenerate, mode, quickHabitData } = body as {
      messages: Message[]
      userId?: string
      autoGenerate?: boolean
      mode?: 'quick' | 'guided' | 'deep'
      quickHabitData?: QuickHabitData
    }

    if (!messages) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // ── Sanitize incoming messages (flag latest user turn) ────────────────────
    let safeMessages: Message[]
    try {
      safeMessages = sanitizeLatestUserMessage(
        sanitizeMessageHistory(messages, userId ?? null),
        userId ?? null,
      )
    } catch (err) {
      if (err instanceof FlaggedInputError) {
        return NextResponse.json(
          { error: "I wasn't able to process that message. Please try rephrasing." },
          { status: 422 },
        )
      }
      throw err
    }

    const turnsUsed = messages.filter((m) => m.role === 'user').length
    const turnsRemaining = MAX_TURNS - turnsUsed

    if (!autoGenerate && turnsUsed >= MAX_TURNS) {
      await logAgentSession({
        userId,
        agent: 'architect',
        model: AGENT_MODEL,
        turnsUsed,
        tokenUsage: null,
        goalReached: false,
        conversation: messages,
      })
      return NextResponse.json({
        message: "We've covered a lot of ground. Let me generate what we have.",
        limitReached: true,
        turnsUsed,
        turnsRemaining: 0,
      })
    }

    // ── Load user context from DB ─────────────────────────────────────────────
    let userRow: Record<string, unknown> | null = null
    if (userId) {
      try {
        type UserResult = { data: Record<string, unknown> | null; error: unknown }
        const result = await agentGuard<UserResult>({
          agentName: 'architect',
          toolName: 'getUser',
          input: { userId },
          userId,
          fn: async (): Promise<UserResult> => {
            const r = await supabase
              .from('users')
              .select('id, display_name, identity_statement, goal_category, friction_point, time_available')
              .eq('id', userId)
              .single()
            return r as UserResult
          },
          assert: (r) => { if (!r.data) throw new Error('User not found') },
        })
        userRow = result.data
      } catch {
        // Fall through — context will be minimal
      }
    }

    const ctx: ArchitectContext = {
      userName: (userRow?.display_name as string) ?? 'Friend',
      identityStatement: (userRow?.identity_statement as string) ?? '',
      goalCategory: (userRow?.goal_category as string) ?? '',
      frictionPoint: (userRow?.friction_point as string) ?? '',
      timeAvailable: (userRow?.time_available as string) ?? '',
      crystalBallSummary: '',
      profileContext: null,
      calendarContext: null,
    }

    if (userId) {
      try {
        const { data } = await supabase
          .from('conversation_memory')
          .select('summary')
          .eq('user_id', userId)
          .eq('agent', 'identity-gatherer')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        ctx.crystalBallSummary = (data?.summary as string) ?? ''
      } catch {
        // No Crystal Ball summary yet
      }
    }

    if (userId) {
      try {
        ctx.profileContext = await getProfileContext(userId)
      } catch {
        // Non-fatal
      }
    }

    if (userId) {
      try {
        const accessToken = await getValidAccessToken(userId)
        if (accessToken) {
          const now = new Date()
          const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
          const events = await getCalendarEvents(accessToken, now, twoWeeksOut)
          ctx.calendarContext = formatEventsForContext(events)
        }
      } catch {
        // Non-fatal — architect works without calendar context
      }
    }

    console.log('[Architect] context loaded:', {
      userId,
      autoGenerate: !!autoGenerate,
      mode: mode ?? 'default',
      hasIdentity: !!ctx.identityStatement,
      hasCrystalBallSummary: !!ctx.crystalBallSummary,
      hasProfileContext: !!ctx.profileContext,
    })

    // ── Auto-generate: skip conversation, output habits immediately ───────────
    if (autoGenerate) {
      let userMsg: string
      try {
        userMsg = buildAutoGenerateUserMessage(ctx, userId ?? null, quickHabitData)
      } catch (err) {
        if (err instanceof FlaggedInputError) {
          return NextResponse.json(
            { error: "I wasn't able to process that request. Please try rephrasing." },
            { status: 422 },
          )
        }
        throw err
      }

      const systemPrompt = buildAutoGenerateSystemPrompt({
        hasQuickHabit: !!quickHabitData,
        hasCrystalBallNotes: !!ctx.crystalBallSummary,
        isLevelUp: quickHabitData?.mode === 'level_up',
      })

      const reply = await agentGuard({
        agentName: 'architect',
        toolName: 'autoGenerate',
        input: { userId, autoGenerate: true },
        userId: userId ?? null,
        fn: () => runArchitect(systemPrompt, [{ role: 'user', content: userMsg }], AGENT_MODEL, userId ?? null, 0),
      })

      const habits = extractHabitsFromMessage(reply)

      if (!habits) {
        console.error('[Architect] autoGenerate: HABITS_READY not found in reply:', reply.slice(0, 200))
        return NextResponse.json({ error: 'Failed to generate habits — no HABITS_READY marker' }, { status: 500 })
      }

      let proposedIds: string[] = []
      if (userId) {
        try {
          const rows = habits.map((h) => ({ user_id: userId, habit_data: h, selected: false }))
          const { data: inserted } = await adminClient().from('proposed_habits').insert(rows).select('id')
          proposedIds = (inserted ?? []).map((r: { id: string }) => r.id)
        } catch {
          // Non-fatal
        }
      }

      const cleanReply = reply.replace(/HABITS_READY:[\s\S]+$/, '').trim()

      return NextResponse.json({
        message: cleanReply,
        habitsReady: habits.map((h, i) => ({ ...h, proposedId: proposedIds[i] ?? null })),
        turnsUsed: 0,
        turnsRemaining: MAX_TURNS,
      })
    }

    // ── Normal conversational mode ────────────────────────────────────────────
    let systemPrompt = buildArchitectSystemPrompt({ hasCrystalBallNotes: !!ctx.crystalBallSummary })

    if (turnsRemaining <= WRAP_UP_AT) {
      systemPrompt += `\n\n[SYSTEM: ${turnsRemaining} exchange${turnsRemaining === 1 ? '' : 's'} remaining. You must write your closing line and output the HABITS_READY JSON array now — even if you have to extrapolate. Do not leave the user with nothing.]`
    }

    const contextBlock = buildArchitectUserContext(ctx, userId ?? null)
    const finalMessages: Message[] = [
      { role: 'user', content: contextBlock },
      ...safeMessages,
    ]

    const reply = await agentGuard({
      agentName: 'architect',
      toolName: 'chat',
      input: { userId: userId ?? null, turnsUsed, turnsRemaining },
      userId: userId ?? null,
      fn: () => runArchitect(systemPrompt, finalMessages, AGENT_MODEL, userId ?? null, turnsUsed),
    })

    const habits = extractHabitsFromMessage(reply)
    if (habits) {
      const cleanReply = reply.replace(/HABITS_READY:[\s\S]+$/, '').trim()

      let proposedIds: string[] = []
      if (userId) {
        try {
          const rows = habits.map((h) => ({ user_id: userId, habit_data: h, selected: false }))
          const { data: inserted } = await adminClient().from('proposed_habits').insert(rows).select('id')
          proposedIds = (inserted ?? []).map((r: { id: string }) => r.id)
        } catch {
          // Non-fatal
        }
      }

      await logAgentSession({
        userId,
        agent: 'architect',
        model: AGENT_MODEL,
        turnsUsed: turnsUsed + 1,
        tokenUsage: null,
        goalReached: true,
        conversation: [...messages, { role: 'assistant', content: cleanReply }],
      })

      return NextResponse.json({
        message: cleanReply,
        habitsReady: habits.map((h, i) => ({ ...h, proposedId: proposedIds[i] ?? null })),
        turnsUsed,
        turnsRemaining,
      })
    }

    return NextResponse.json({ message: reply, turnsUsed, turnsRemaining })
  } catch (err) {
    console.error('[POST /api/agents/architect]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
