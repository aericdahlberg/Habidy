import { NextRequest, NextResponse } from 'next/server'
import { callClaude, Message } from '@/lib/claude'
import { agentGuard } from '@/lib/agentGuard'
import { buildArchitectSystemPrompt, extractHabitFromMessage } from '@/lib/agents/architect'
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
    const { messages, userId } = body as {
      messages: Message[]
      userId?: string
    }

    if (!messages) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // Count only user messages — each is one turn
    const turnsUsed = messages.filter((m) => m.role === 'user').length
    const turnsRemaining = MAX_TURNS - turnsUsed

    if (turnsUsed >= MAX_TURNS) {
      return NextResponse.json({
        message: "We've built something solid here. Even without a complete cue, you have everything you need to start. Let's save what we have and you can refine it as you go.",
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
            friction_point: (result.data.friction_point as string) ?? '',
            time_available: (result.data.time_available as string) ?? '',
          }
        }
      } catch {
        // Fall back to mock context if DB unavailable
      }
    }

    // Load Constellation summary
    let constellationSummary = ''
    if (userId) {
      try {
        const { data } = await supabase
          .from('conversation_memory')
          .select('summary')
          .eq('user_id', userId)
          .eq('agent', 'constellation')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        constellationSummary = (data?.summary as string) ?? ''
      } catch {
        // No summary — continue without it (per guard rules)
      }
    }

    let systemPrompt = buildArchitectSystemPrompt({
      userName: userCtx.name,
      identityStatement: userCtx.identity_statement,
      goalCategory: userCtx.goal_category,
      timeAvailable: userCtx.time_available,
      constellationSummary,
    })

    // Inject wrap-up hint when turns are running low
    if (turnsRemaining <= WRAP_UP_AT) {
      systemPrompt += `\n\n[SYSTEM: You have ${turnsRemaining} exchange${turnsRemaining === 1 ? '' : 's'} remaining. Move to close the loop now — summarize the habit and output HABIT_READY even if the cue isn't fully refined. Don't leave the user with nothing.]`
    }

    const reply = await agentGuard({
      agentName: 'architect',
      toolName: 'chat',
      input: { userId: userCtx.id, turnsUsed, turnsRemaining },
      userId: userCtx.id,
      fn: () => callClaude({ systemPrompt, messages }),
    })

    // Check if habit is ready to save
    const habitData = extractHabitFromMessage(reply)
    const cleanReply = reply.replace(/HABIT_READY:\{[\s\S]+\}/, '').trim()

    return NextResponse.json({
      message: cleanReply,
      habitReady: habitData ? true : false,
      habitData: habitData ?? null,
      turnsUsed,
      turnsRemaining,
    })
  } catch (err) {
    console.error('[POST /api/agents/architect]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
