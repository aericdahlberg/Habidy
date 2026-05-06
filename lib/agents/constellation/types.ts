export type OnboardingContext = {
  identity: string
  goalCategory: string
  frictionPoint: string
  timeAvailable: string
  displayName: string
  // Rich questionnaire fields (sessionStorage fallback — not stored in main DB columns)
  stickTime?: string
  sleep?: string
  stress?: string
  anchorHabits?: string[]
  wastedTime?: string
  location?: string
  goalClarity?: string
  allBlockers?: string[]
}

export type IdentityGathererContext = {
  onboarding: OnboardingContext
  profileContext: string | null
}

export type ForcedSummaryContext = {
  userName: string
  identityStatement: string
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>
}

export type EvalDummyUser = {
  identityStatement: string
  focusArea: string
  direction: string
  blockers: string[]
  peakEnergy: string
  bestTimeToStick: string
  sleepAmount: string
  stressLevel: string
  existingDailyHabits: string[]
  wastedTime: string
  primaryLocation: string
}
