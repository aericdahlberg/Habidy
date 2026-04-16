import { NextRequest, NextResponse } from 'next/server'
import { callClaude, Message } from '@/lib/claude'
import { agentGuard } from '@/lib/agentGuard'
import { buildCrystalBallSystemPrompt, buildForcedSummaryPrompt } from '@/lib/agents/constellation'
import { supabase, getProfileContext } from '@/lib/supabase'

const MAX_TURNS = 10
const WRAP_UP_AT = 2  // inject wrap-up hint when this many user turns remain

const SUMMARY_MARKER = 'CRYSTAL_BALL_SUMMARY:'

const MOCK_USER = {
  id: 'mock-user-id',
  name: 'Friend',
  identity_statement: 'someone who takes care of themselves',
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

    // ── Limit reached: force-generate summary from conversation ──────────────
    if (turnsUsed >= MAX_TURNS) {
      let summaryJson: string | null = null

      if (userId) {
        try {
          const { data: userRow } = await supabase
            .from('users')
            .select('name, identity_statement')
            .eq('id', userId)
            .single()

          const forcedSummary = await agentGuard({
            agentName: 'crystal-ball',
            toolName: 'forcedSummary',
            input: { userId, messageCount: messages.length },
            userId,
            fn: () =>
              callClaude({
                systemPrompt: buildForcedSummaryPrompt({
                  userName: (userRow?.name as string) ?? 'Friend',
                  identityStatement: (userRow?.identity_statement as string) ?? '',
                  conversation: messages,
                }),
                messages: [{ role: 'user', content: 'Generate the summary now.' }],
                maxTokens: 512,
              }),
          })

          summaryJson = forcedSummary

          await supabase.from('conversation_memory').insert({
            user_id: userId,
            agent: 'crystal-ball',
            summary: summaryJson,
          })
        } catch {
          // Non-fatal — still show handoff
        }
      }

      return NextResponse.json({
        message: "We've covered a lot of ground. I have what I need — let's hand this to Architect.",
        limitReached: true,
        showHandoff: true,
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
          agentName: 'crystal-ball',
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
          }
        }
      } catch {
        // Fall back to mock context
      }
    }

    if (!userCtx.identity_statement) {
      return NextResponse.json({
        message: "Before we begin — what kind of person are you trying to become? Finish this sentence: \"I want to be someone who...\"",
        turnsUsed,
        turnsRemaining,
      })
    }

    // ── Load profile context (from Explore reflections) ───────────────────────
    let profileContext: string | null = null
    if (userId) {
      try {
        profileContext = await getProfileContext(userId)
      } catch {
        // Non-fatal
      }
    }

    // ── Build system prompt ───────────────────────────────────────────────────
    let systemPrompt = buildCrystalBallSystemPrompt({
      userName: userCtx.name,
      identityStatement: userCtx.identity_statement,
      profileContext,
    })

    // Inject wrap-up hint when turns are running low
    if (turnsRemaining <= WRAP_UP_AT) {
      systemPrompt += `\n\n[SYSTEM: You have ${turnsRemaining} exchange${turnsRemaining === 1 ? '' : 's'} remaining. You must now write your closing message to the user and output the CRYSTAL_BALL_SUMMARY JSON on the next line — even if you have to extrapolate the missing fields from context. Do not leave it blank.]`
    }

    // ── Call Claude ────────────────────────────────────────────────────────────
    const reply = await agentGuard({
      agentName: 'crystal-ball',
      toolName: 'chat',
      input: { userId: userCtx.id, turnsUsed, turnsRemaining },
      userId: userCtx.id,
      fn: () => callClaude({ systemPrompt, messages }),
    })

    // ── Detect CRYSTAL_BALL_SUMMARY marker ────────────────────────────────────
    const markerIdx = reply.indexOf(SUMMARY_MARKER)
    if (markerIdx !== -1) {
      const cleanReply = reply.slice(0, markerIdx).trim()
      const jsonStr = reply.slice(markerIdx + SUMMARY_MARKER.length).trim()

      // Save to conversation_memory (best-effort)
      if (userId) {
        try {
          await supabase.from('conversation_memory').insert({
            user_id: userId,
            agent: 'crystal-ball',
            summary: jsonStr,
          })
        } catch {
          // Non-fatal
        }
      }

      return NextResponse.json({
        message: cleanReply,
        showHandoff: true,
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
    console.error('[POST /api/agents/constellation]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
