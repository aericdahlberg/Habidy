import type { Message } from '@/lib/claude'
import {
  buildGuidedSystemPrompt,
  buildDeepSystemPrompt,
} from './systemPrompts'
import { buildConstellationUserContext } from './context'
import { buildForcedSummaryUserMessage } from './forcedSummary'
import type { OnboardingContext, EvalDummyUser, IdentityGathererContext, ForcedSummaryContext } from './types'

export function dummyUserToOnboarding(user: EvalDummyUser): OnboardingContext {
  return {
    identity: user.identityStatement,
    goalCategory: user.focusArea,
    frictionPoint: user.blockers.join('; '),
    timeAvailable: user.peakEnergy,
    displayName: 'Friend',
    stickTime: user.bestTimeToStick,
    sleep: user.sleepAmount,
    stress: user.stressLevel,
    anchorHabits: user.existingDailyHabits,
    wastedTime: user.wastedTime,
    location: user.primaryLocation,
    goalClarity: user.direction,
    allBlockers: user.blockers,
  }
}

export type EvalAgentConfig = {
  systemPrompt: string
  contextPrefix: Message[]
}

function makeEvalConfig(
  systemPrompt: string,
  ctx: IdentityGathererContext,
): EvalAgentConfig {
  const contextBlock = buildConstellationUserContext(ctx, null)
  return {
    systemPrompt,
    contextPrefix: [
      { role: 'user', content: contextBlock },
      { role: 'assistant', content: 'Understood. I have the user context.' },
    ],
  }
}

export function getGuidedSystemPrompt(user: EvalDummyUser): EvalAgentConfig {
  const onboarding = dummyUserToOnboarding(user)
  const ctx: IdentityGathererContext = { onboarding, profileContext: null }
  return makeEvalConfig(buildGuidedSystemPrompt(!!user.identityStatement), ctx)
}

export function getDeepSystemPrompt(user: EvalDummyUser): EvalAgentConfig {
  const onboarding = dummyUserToOnboarding(user)
  const ctx: IdentityGathererContext = { onboarding, profileContext: null }
  return makeEvalConfig(buildDeepSystemPrompt(!!user.identityStatement), ctx)
}

// Backward-compatible wrapper: builds the forced-summary user message string.
// Evals pass this as the user message to a separate Anthropic call with their own system prompt.
export function buildForcedSummaryPrompt(ctx: ForcedSummaryContext): string {
  return buildForcedSummaryUserMessage(ctx, null)
}
