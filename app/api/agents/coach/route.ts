import { NextRequest, NextResponse } from 'next/server'
import { callClaude, resolveModel, Message } from '@/lib/claude'
import { agentGuard } from '@/lib/agentGuard'
import {
  buildCoachSystemPrompt,
  buildCoachUserContext,
  extractProposalsFromMessage,
  loadCoachContext,
} from '@/lib/agents/coach'
import type { CoachContext, WeeklyAnalysis } from '@/lib/agents/coach'
import { logAgentSession } from '@/lib/logger'
import { traceable } from '@/lib/langsmith'
import { FlaggedInputError, sanitizeMessageHistory, sanitizeLatestUserMessage } from '@/lib/sanitize'

const AGENT_MODEL = resolveModel()
const MAX_TURNS = 12
const WRAP_UP_AT = 2

const runCoach = traceable(
  async (systemPrompt: string, messages: Message[], model: string): Promise<string> =>
    callClaude({ systemPrompt, messages, model }),
  { name: 'habit_coach_agent', run_type: 'chain', tags: ['habidy', 'coach'] },
)

const EMPTY_ANALYSIS: WeeklyAnalysis = {
  weekOf: new Date().toISOString().split('T')[0],
  overallCompletionRate: 0, completedTotal: 0, possibleTotal: 0,
  habitBreakdown: [], dayOfWeekStats: [], proposedAdjustments: [],
  hasSurveyData: false, hasCalendarData: false,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, userId, isFreestyleChat } = body as {
      messages: Message[]
      userId?: string
      isFreestyleChat?: boolean
    }

    if (!messages) return NextResponse.json({ error: 'messages required' }, { status: 400 })

    // ── Sanitize ──────────────────────────────────────────────────────────────
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

    if (turnsUsed >= MAX_TURNS) {
      await logAgentSession({
        userId, agent: 'coach', model: AGENT_MODEL,
        turnsUsed, tokenUsage: null, goalReached: false, conversation: messages,
      })
      return NextResponse.json({
        message: "We've covered a lot. Would you like to apply any of the changes we discussed?",
        limitReached: true, turnsUsed, turnsRemaining: 0,
      })
    }

    // ── Load context ──────────────────────────────────────────────────────────
    let loaded: Awaited<ReturnType<typeof loadCoachContext>> | null = null
    if (userId) {
      try {
        loaded = await agentGuard({
          agentName: 'coach', toolName: 'loadContext', input: { userId }, userId,
          fn: () => loadCoachContext(userId),
        })
      } catch { /* fall through with empty context */ }
    }

    const ctx: CoachContext = {
      userName: loaded?.userName ?? 'Friend',
      identityStatement: loaded?.identityStatement ?? '',
      weeklyAnalysis: loaded?.weeklyAnalysis ?? EMPTY_ANALYSIS,
      profileContext: loaded?.profileContext ?? null,
      calendarContext: loaded?.calendarContext ?? null,
      priorAdjustmentsSummary: loaded?.priorAdjustmentsSummary ?? '',
    }

    const hasWeeklyData = ctx.weeklyAnalysis.possibleTotal > 0

    let systemPrompt = buildCoachSystemPrompt({
      hasWeeklyData,
      hasSurveyData: ctx.weeklyAnalysis.hasSurveyData,
      hasCalendarData: !!ctx.calendarContext,
      isFreestyleChat: !!isFreestyleChat,
    })

    if (turnsRemaining <= WRAP_UP_AT) {
      systemPrompt += `\n\n[SYSTEM: ${turnsRemaining} exchange${turnsRemaining === 1 ? '' : 's'} remaining. If the user agreed to changes, output COACH_PROPOSALS now. Otherwise, summarize takeaways and ask if they want to apply anything.]`
    }

    // ── Build messages ────────────────────────────────────────────────────────
    const contextBlock = buildCoachUserContext(ctx, userId ?? null)
    const finalMessages: Message[] = [
      { role: 'user', content: contextBlock },
      ...safeMessages,
    ]

    const reply = await agentGuard({
      agentName: 'coach', toolName: 'chat',
      input: { userId: userId ?? null, turnsUsed, turnsRemaining },
      userId: userId ?? null,
      fn: () => runCoach(systemPrompt, finalMessages, AGENT_MODEL),
    })

    // ── Detect COACH_PROPOSALS marker ─────────────────────────────────────────
    const proposals = extractProposalsFromMessage(reply)
    if (proposals) {
      const cleanReply = reply.replace(/COACH_PROPOSALS:[\s\S]+$/, '').trim()
      await logAgentSession({
        userId, agent: 'coach', model: AGENT_MODEL,
        turnsUsed: turnsUsed + 1, tokenUsage: null, goalReached: true,
        conversation: [...messages, { role: 'assistant', content: cleanReply }],
      })
      return NextResponse.json({ message: cleanReply, proposalsReady: proposals, turnsUsed, turnsRemaining })
    }

    return NextResponse.json({ message: reply, turnsUsed, turnsRemaining })
  } catch (err) {
    console.error('[POST /api/agents/coach]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
