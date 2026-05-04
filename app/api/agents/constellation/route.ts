import { NextRequest, NextResponse } from 'next/server'
import { callClaude, resolveModel, Message } from '@/lib/claude'
import { agentGuard } from '@/lib/agentGuard'
import { logAgentSession } from '@/lib/logger'
import {
  buildIdentityGathererSystemPrompt,
  buildGuidedSystemPrompt,
  buildDeepSystemPrompt,
  buildForcedSummaryPrompt,
  type OnboardingContext,
  type IdentityGathererContext,
} from '@/lib/agents/constellation'
import { adminClient, getProfileContext } from '@/lib/supabase'
import { traceable } from '@/lib/langsmith'

const supabase = adminClient()
const AGENT_MODEL = resolveModel()
const SUMMARY_MARKER = 'IDENTITY_GATHERER_SUMMARY:'

const MODE_CONFIG = {
  guided: { maxTurns: 5,  wrapUpAt: 1 },
  deep:   { maxTurns: 15, wrapUpAt: 2 },
  default:{ maxTurns: 5,  wrapUpAt: 1 },
} as const
type ConstellationMode = 'guided' | 'deep'

const runIdentityGatherer = traceable(
  async (
    systemPrompt: string,
    messages: Message[],
    model: string,
    _userId: string | null,
    _turnsUsed: number,
  ): Promise<string> => callClaude({ systemPrompt, messages, model }),
  {
    name: 'identity_gatherer_agent',
    run_type: 'chain',
    tags: ['habidy', 'identity_gatherer'],
  }
)

type OnboardingFallback = Partial<OnboardingContext>

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, userId, onboardingFallback, mode } = body as {
      messages: Message[]
      userId?: string
      onboardingFallback?: OnboardingFallback
      mode?: ConstellationMode
    }

    if (!messages) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const { maxTurns, wrapUpAt } = MODE_CONFIG[mode ?? 'default'] ?? MODE_CONFIG.default
    const turnsUsed = messages.filter((m) => m.role === 'user').length
    const turnsRemaining = maxTurns - turnsUsed

    // ── Load user row from DB ──────────────────────────────────────────────────
    let userRow: Record<string, unknown> | null = null
    if (userId) {
      try {
        type UserResult = { data: Record<string, unknown> | null; error: unknown }
        const result = await agentGuard<UserResult>({
          agentName: 'identity-gatherer',
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
        // Fall through to onboardingFallback
      }
    }

    // ── Build onboarding context: DB primary, sessionStorage fallback ──────────
    const fb = onboardingFallback ?? {}
    const onboarding: OnboardingContext = {
      identity: (userRow?.identity_statement as string) || fb.identity || '',
      goalCategory: (userRow?.goal_category as string) || fb.goalCategory || '',
      frictionPoint: (userRow?.friction_point as string) || fb.frictionPoint || '',
      timeAvailable: (userRow?.time_available as string) || fb.timeAvailable || '',
      displayName: (userRow?.display_name as string) || fb.displayName || 'Friend',
      // Rich fields only available from sessionStorage fallback (not in DB columns)
      stickTime: fb.stickTime,
      sleep: fb.sleep,
      stress: fb.stress,
      anchorHabits: fb.anchorHabits,
      wastedTime: fb.wastedTime,
      location: fb.location,
      goalClarity: fb.goalClarity,
      allBlockers: fb.allBlockers,
    }

    // ── Debug log ─────────────────────────────────────────────────────────────
    console.log('[Crystal Ball] context loaded:', {
      userId,
      hasIdentity: !!onboarding.identity,
      identity: onboarding.identity || '(empty)',
      hasGoalCategory: !!onboarding.goalCategory,
      goalCategory: onboarding.goalCategory || '(empty)',
      hasFrictionPoint: !!onboarding.frictionPoint,
      frictionPoint: onboarding.frictionPoint || '(empty)',
      hasTimeAvailable: !!onboarding.timeAvailable,
      hasAnchorHabits: !!(onboarding.anchorHabits?.length),
      anchorHabits: onboarding.anchorHabits ?? [],
      sourceDB: !!userRow,
      sourceFallback: !!onboardingFallback,
      turnsUsed,
    })

    // ── Limit reached: force-generate summary ─────────────────────────────────
    if (turnsUsed >= maxTurns) {
      if (userId) {
        try {
          const forcedSummary = await agentGuard({
            agentName: 'identity-gatherer',
            toolName: 'forcedSummary',
            input: { userId, messageCount: messages.length },
            userId,
            fn: () =>
              callClaude({
                systemPrompt: buildForcedSummaryPrompt({
                  userName: onboarding.displayName,
                  identityStatement: onboarding.identity,
                  conversation: messages,
                }),
                messages: [{ role: 'user', content: 'Generate the summary now.' }],
                maxTokens: 512,
                model: AGENT_MODEL,
              }),
          })

          await supabase.from('conversation_memory').insert({
            user_id: userId,
            agent: 'identity-gatherer',
            summary: forcedSummary,
          })
        } catch {
          // Non-fatal
        }
      }

      await logAgentSession({
        userId,
        agent: 'identity-gatherer',
        model: AGENT_MODEL,
        turnsUsed,
        tokenUsage: null,
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

    // ── Load profile context ──────────────────────────────────────────────────
    let profileContext: string | null = null
    if (userId) {
      try {
        profileContext = await getProfileContext(userId)
      } catch {
        // Non-fatal
      }
    }

    // ── Build system prompt based on mode ────────────────────────────────────
    const gathererCtx: IdentityGathererContext = { onboarding, profileContext }
    let systemPrompt =
      mode === 'deep'   ? buildDeepSystemPrompt(gathererCtx) :
      mode === 'guided' ? buildGuidedSystemPrompt(gathererCtx) :
                          buildIdentityGathererSystemPrompt(gathererCtx)

    if (turnsRemaining <= wrapUpAt) {
      systemPrompt += `\n\n[SYSTEM: ${turnsRemaining} exchange${turnsRemaining === 1 ? '' : 's'} remaining. Write your closing recap now — 3–4 sentences covering who they want to become, what's been getting in the way, and what kind of habit would fit their life. End with "Ready to build your first habit around this?" Then output the IDENTITY_GATHERER_SUMMARY JSON on the next line. Do not leave any field blank.]`
    }

    // ── Call Claude ───────────────────────────────────────────────────────────
    const reply = await agentGuard({
      agentName: 'identity-gatherer',
      toolName: 'chat',
      input: { userId: userId ?? null, turnsUsed, turnsRemaining },
      userId: userId ?? null,
      fn: () => runIdentityGatherer(systemPrompt, messages, AGENT_MODEL, userId ?? null, turnsUsed),
    })

    // ── Detect IDENTITY_GATHERER_SUMMARY marker ───────────────────────────────
    const markerIdx = reply.indexOf(SUMMARY_MARKER)
    if (markerIdx !== -1) {
      const cleanReply = reply.slice(0, markerIdx).trim()
      const jsonStr = reply.slice(markerIdx + SUMMARY_MARKER.length).trim()

      if (userId) {
        try {
          let summaryToSave = jsonStr
          try {
            const parsed = JSON.parse(jsonStr)
            parsed.recap = cleanReply
            // Enrich with onboarding context so Architect has maximum data
            if (onboarding.identity && !parsed.who_they_want_to_be) {
              parsed.who_they_want_to_be = onboarding.identity
            }
            if (onboarding.anchorHabits?.length && !parsed.existing_behaviors) {
              parsed.existing_behaviors = onboarding.anchorHabits.join(', ')
            }
            summaryToSave = JSON.stringify(parsed)
          } catch {
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
        tokenUsage: null,
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

    return NextResponse.json({ message: reply, turnsUsed, turnsRemaining })
  } catch (err) {
    console.error('[POST /api/agents/constellation]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
