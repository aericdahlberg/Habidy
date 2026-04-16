import { NextRequest, NextResponse } from 'next/server'
import { callClaude, Message } from '@/lib/claude'
import { agentGuard } from '@/lib/agentGuard'
import { buildArchitectSystemPrompt, extractHabitsFromMessage } from '@/lib/agents/architect'
import { supabase, getProfileContext } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const MAX_TURNS = 20
const WRAP_UP_AT = 3

const MOCK_USER = {
  id: 'mock-user-id',
  name: 'Friend',
  identity_statement: 'someone who takes care of themselves',
  goal_category: 'Health & Fitness',
  time_available: '15 minutes',
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, userId } = body as {
      messages: Message[]
      userId?: string
    }

    if (!messages) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const turnsUsed = messages.filter((m) => m.role === 'user').length
    const turnsRemaining = MAX_TURNS - turnsUsed

    if (turnsUsed >= MAX_TURNS) {
      return NextResponse.json({
        message: "We've covered a lot of ground. Even without a perfect cue, you have everything you need to start. Let's save what we have.",
        limitReached: true,
        turnsUsed,
        turnsRemaining: 0,
      })
    }

    // ── Load user context ─────────────────────────────────────────────────────
    let userCtx = MOCK_USER
    if (userId) {
      try {
        type UserResult = { data: Record<string, unknown> | null; error: unknown }
        const result = await agentGuard<UserResult>({
          agentName: 'architect',
          toolName: 'getUser',
          input: { userId },
          userId,
          fn: async (): Promise<UserResult> => {
            const r = await supabase.from('users').select('*').eq('id', userId).single()
            return r as UserResult
          },
          assert: (r) => { if (!r.data) throw new Error('User not found') },
        })
        if (result.data) {
          userCtx = {
            id: result.data.id as string,
            name: (result.data.name as string) ?? 'Friend',
            identity_statement: (result.data.identity_statement as string) ?? '',
            goal_category: (result.data.goal_category as string) ?? '',
            time_available: (result.data.time_available as string) ?? '',
          }
        }
      } catch {
        // Fall back to mock context
      }
    }

    // ── Load Crystal Ball session summary ─────────────────────────────────────
    let crystalBallSummary = ''
    if (userId) {
      try {
        const { data } = await supabase
          .from('conversation_memory')
          .select('summary')
          .eq('user_id', userId)
          .eq('agent', 'crystal-ball')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        crystalBallSummary = (data?.summary as string) ?? ''
      } catch {
        // No Crystal Ball summary yet — continue without it
      }
    }

    // ── Load profile context ──────────────────────────────────────────────────
    let profileContext: string | null = null
    if (userId) {
      try {
        profileContext = await getProfileContext(userId)
      } catch {
        // Non-fatal
      }
    }

    // ── Build system prompt ───────────────────────────────────────────────────
    let systemPrompt = buildArchitectSystemPrompt({
      userName: userCtx.name,
      identityStatement: userCtx.identity_statement,
      goalCategory: userCtx.goal_category,
      timeAvailable: userCtx.time_available,
      crystalBallSummary,
      profileContext,
    })

    if (turnsRemaining <= WRAP_UP_AT) {
      systemPrompt += `\n\n[SYSTEM: ${turnsRemaining} exchange${turnsRemaining === 1 ? '' : 's'} remaining. You must write your closing line and output the HABITS_READY JSON array now — even if you have to extrapolate. Do not leave the user with nothing.]`
    }

    // ── Call Claude ────────────────────────────────────────────────────────────
    const reply = await agentGuard({
      agentName: 'architect',
      toolName: 'chat',
      input: { userId: userCtx.id, turnsUsed, turnsRemaining },
      userId: userCtx.id,
      fn: () => callClaude({ systemPrompt, messages }),
    })

    // ── Detect HABITS_READY ───────────────────────────────────────────────────
    const habits = extractHabitsFromMessage(reply)
    if (habits) {
      const cleanReply = reply.replace(/HABITS_READY:[\s\S]+$/, '').trim()

      // Save all habits to proposed_habits (best-effort)
      let proposedIds: string[] = []
      if (userId) {
        try {
          const rows = habits.map((h) => ({
            user_id: userId,
            habit_data: h,
            selected: false,
          }))
          const { data: inserted } = await adminClient()
            .from('proposed_habits')
            .insert(rows)
            .select('id')
          proposedIds = (inserted ?? []).map((r: { id: string }) => r.id)
        } catch {
          // Non-fatal — IDs just won't be available for later marking
        }
      }

      return NextResponse.json({
        message: cleanReply,
        habitsReady: habits.map((h, i) => ({ ...h, proposedId: proposedIds[i] ?? null })),
        turnsUsed,
        turnsRemaining,
      })
    }

    return NextResponse.json({
      message: reply,
      turnsUsed,
      turnsRemaining,
    })
  } catch (err) {
    console.error('[POST /api/agents/architect]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
