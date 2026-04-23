import { NextRequest, NextResponse } from 'next/server'
import { callClaude, resolveModel, Message } from '@/lib/claude'
import type { TokenUsage } from '@/lib/claude'
import { agentGuard } from '@/lib/agentGuard'
import { logAgentSession } from '@/lib/logger'
import { buildIdentityGathererSystemPrompt, buildForcedSummaryPrompt } from '@/lib/agents/constellation'
import { adminClient, getProfileContext } from '@/lib/supabase'
import { traceable } from '@/lib/langsmith'

const supabase = adminClient()

const AGENT_MODEL = resolveModel()

const runIdentityGatherer = traceable(
  async (
    systemPrompt: string,
    messages: Message[],
    model: string,
    _userId: string,
    _turnsUsed: number,
  ): Promise<string> => callClaude({ systemPrompt, messages, model }),
  {
    name: 'identity_gatherer_agent',
    run_type: 'chain',
    tags: ['habidy', 'identity_gatherer'],
  }
)

const MAX_TURNS = 10
const WRAP_UP_AT = 2

const SUMMARY_MARKER = 'IDENTITY_GATHERER_SUMMARY:'

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

    const turnsUsed = messages.filter((m) => m.role === 'user').length
    const turnsRemaining = MAX_TURNS - turnsUsed

    // ── Limit reached: force-generate summary ────────────────────────────────
    if (turnsUsed >= MAX_TURNS) {
      let summaryJson: string | null = null
      let forcedUsage: TokenUsage | null = null

      if (userId) {
        try {
          const { data: userRow } = await supabase
            .from('users')
            .select('identity_statement')
            .eq('id', userId)
            .single()

          const forcedSummary = await agentGuard({
            agentName: 'identity-gatherer',
            toolName: 'forcedSummary',
            input: { userId, messageCount: messages.length },
            userId,
            fn: () =>
              callClaude({
                systemPrompt: buildForcedSummaryPrompt({
                  userName: 'Friend',
                  identityStatement: (userRow?.identity_statement as string) ?? '',
                  conversation: messages,
                }),
                messages: [{ role: 'user', content: 'Generate the summary now.' }],
                maxTokens: 512,
                model: AGENT_MODEL,
                onUsage: (u) => { forcedUsage = u },
              }),
          })

          summaryJson = forcedSummary

          await supabase.from('conversation_memory').insert({
            user_id: userId,
            agent: 'identity-gatherer',
            summary: summaryJson,
          })
        } catch {
          // Non-fatal — still show handoff
        }
      }

      await logAgentSession({
        userId,
        agent: 'identity-gatherer',
        model: AGENT_MODEL,
        turnsUsed,
        tokenUsage: forcedUsage,
        goalReached: false,
        conversation: messages,
      })

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
          agentName: 'identity-gatherer',
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
    let systemPrompt = buildIdentityGathererSystemPrompt({
      userName: userCtx.name,
      identityStatement: userCtx.identity_statement,
      profileContext,
    })

    if (turnsRemaining <= WRAP_UP_AT) {
      systemPrompt += `\n\n[SYSTEM: You have ${turnsRemaining} exchange${turnsRemaining === 1 ? '' : 's'} remaining. Write your closing recap now — 3–4 sentences covering who they want to become, what's been getting in the way, and what kind of habit would fit their life. End with "Ready to build your first habit around this?" Then on the next line output the IDENTITY_GATHERER_SUMMARY JSON. Do not leave any field blank.]`
    }

    // ── Call Claude ───────────────────────────────────────────────────────────
    let turnUsage: TokenUsage | null = null

    const reply = await agentGuard({
      agentName: 'identity-gatherer',
      toolName: 'chat',
      input: { userId: userCtx.id, turnsUsed, turnsRemaining },
      userId: userCtx.id,
      fn: () => runIdentityGatherer(systemPrompt, messages, AGENT_MODEL, userCtx.id, turnsUsed),
    })

    // ── Detect IDENTITY_GATHERER_SUMMARY marker ───────────────────────────────
    const markerIdx = reply.indexOf(SUMMARY_MARKER)
    if (markerIdx !== -1) {
      const cleanReply = reply.slice(0, markerIdx).trim()
      const jsonStr = reply.slice(markerIdx + SUMMARY_MARKER.length).trim()

      // Combine structured JSON + plain-text recap into one record
      if (userId) {
        try {
          let summaryToSave = jsonStr
          try {
            const parsed = JSON.parse(jsonStr)
            parsed.recap = cleanReply
            summaryToSave = JSON.stringify(parsed)
          } catch {
            // If JSON parse fails, save raw + recap appended
            summaryToSave = jsonStr + '\n\nRECAP:\n' + cleanReply
          }

          await supabase.from('conversation_memory').insert({
            user_id: userId,
            agent: 'identity-gatherer',
            summary: summaryToSave,
          })
        } catch {
          // Non-fatal
        }
      }

      await logAgentSession({
        userId,
        agent: 'identity-gatherer',
        model: AGENT_MODEL,
        turnsUsed: turnsUsed + 1,
        tokenUsage: turnUsage,
        goalReached: true,
        conversation: [...messages, { role: 'assistant', content: cleanReply }],
      })

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
