import { NextRequest, NextResponse } from 'next/server'
import { callClaude, Message } from '@/lib/claude'
import { agentGuard } from '@/lib/agentGuard'
import { buildConstellationSystemPrompt, buildSummaryPrompt } from '@/lib/agents/constellation'
import { supabase } from '@/lib/supabase'

const MAX_TURNS = 20
const WRAP_UP_AT = 3  // inject wrap-up hint when this many turns remain

const MOCK_USER = {
  id: 'mock-user-id',
  name: 'Friend',
  identity_statement: 'someone who takes care of themselves',
  goal_category: 'Health & Fitness',
  friction_point: 'I stay up too late scrolling',
  time_available: '15 minutes',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, userId, generateSummary } = body as {
      messages: Message[]
      userId?: string
      generateSummary?: boolean
    }

    if (!messages) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // Count only user messages — each is one turn
    const turnsUsed = messages.filter((m) => m.role === 'user').length
    const turnsRemaining = MAX_TURNS - turnsUsed

    if (turnsUsed >= MAX_TURNS) {
      return NextResponse.json({
        message: "We've covered a lot of ground together. This is a good place to pause — want to take what you've explored and turn it into a real habit?",
        limitReached: true,
        turnsUsed,
        turnsRemaining: 0,
      })
    }

    // Load user context
    let userCtx = MOCK_USER
    if (userId) {
      try {
        type UserResult = { data: Record<string, unknown> | null; error: unknown }
        const result = await agentGuard<UserResult>({
          agentName: 'constellation',
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
            friction_point: (result.data.friction_point as string) ?? '',
            time_available: (result.data.time_available as string) ?? '',
          }
        }
      } catch {
        // Fall back to mock context if DB unavailable
      }
    }

    if (!userCtx.identity_statement) {
      return NextResponse.json({
        message: "I'd love to learn more about you first — what kind of person are you hoping to become?",
        turnsUsed,
        turnsRemaining,
      })
    }

    // Generate session summary if requested
    if (generateSummary) {
      const summaryPrompt = buildSummaryPrompt({ userName: userCtx.name, conversation: messages })
      const summary = await agentGuard({
        agentName: 'constellation',
        toolName: 'generateSummary',
        input: { userId: userCtx.id, messageCount: messages.length },
        userId: userCtx.id,
        fn: () => callClaude({ systemPrompt: summaryPrompt, messages, maxTokens: 256 }),
      })

      if (userId) {
        await supabase.from('conversation_memory').insert({
          user_id: userId,
          agent: 'constellation',
          summary,
        })
      }

      return NextResponse.json({ summary })
    }

    let systemPrompt = buildConstellationSystemPrompt({
      userName: userCtx.name,
      identityStatement: userCtx.identity_statement,
      goalCategory: userCtx.goal_category,
      frictionPoint: userCtx.friction_point,
    })

    // Inject wrap-up hint when turns are running low
    if (turnsRemaining <= WRAP_UP_AT) {
      systemPrompt += `\n\n[SYSTEM: You have ${turnsRemaining} exchange${turnsRemaining === 1 ? '' : 's'} remaining in this session. Naturally begin wrapping up and offer the habit-building handoff.]`
    }

    const reply = await agentGuard({
      agentName: 'constellation',
      toolName: 'chat',
      input: { userId: userCtx.id, turnsUsed, turnsRemaining },
      userId: userCtx.id,
      fn: () => callClaude({ systemPrompt, messages }),
    })

    // Auto-trigger handoff offer on last available turn
    const isLastTurn = turnsRemaining === 1

    return NextResponse.json({
      message: reply,
      turnsUsed,
      turnsRemaining,
      showHandoff: isLastTurn,
    })
  } catch (err) {
    console.error('[POST /api/agents/constellation]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
