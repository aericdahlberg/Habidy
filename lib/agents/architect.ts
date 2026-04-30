const HABITS_READY_RULES = `
Output exactly 5 habits as a JSON array:
HABITS_READY:[
  {
    "identity_label": "I am a ___",
    "habit_name": "short habit name",
    "cue": "After I [existing routine], I will [new behavior] at [location/time]",
    "two_minute_version": "the smallest possible start — under 2 minutes",
    "category": "Health & Fitness|Career & Learning|Relationships|Creativity|Mindset & Energy|Something else"
  }
]

Rules for the JSON:
- Exactly 5 habits. All fields required, no nulls.
- Vary difficulty: some very easy (2 minutes), some more ambitious (5-8 minutes).
- Vary time of day: include morning, afternoon, and evening options.
- identity_label must be "I am a ___" format — specific ("I am a runner", not "I am healthy").
- cue must follow the exact "After I..., I will... at..." format with a real existing behavior as the anchor.
- All 5 habits must be distinct — different behaviors and times, not variations of the same thing.
- category must be one of the six options exactly.
- Output valid JSON. No trailing text after the closing bracket.`

export type ArchitectContext = {
  userName: string
  identityStatement: string
  goalCategory: string
  frictionPoint: string
  timeAvailable: string
  crystalBallSummary: string
  profileContext: string | null
}

export function buildArchitectSystemPrompt(ctx: ArchitectContext): string {
  const crystalBallSection = ctx.crystalBallSummary
    ? `Crystal Ball investigation notes:\n${ctx.crystalBallSummary}`
    : `Crystal Ball investigation notes: (no prior session — ask what you need)`

  const profileSection = ctx.profileContext
    ? `User profile context:\n${ctx.profileContext}`
    : ''

  const frictionSection = ctx.frictionPoint
    ? `What gets in their way: "${ctx.frictionPoint}"`
    : ''

  return `You are Architect, a habit-building coach inside Hab-Idy.
Your job: design exactly 5 precise, identity-based habits for ${ctx.userName} using the Atomic Habits framework.

User context:
- Identity statement: "${ctx.identityStatement}"
- Focus area: ${ctx.goalCategory}
- Time available: ${ctx.timeAvailable}
${frictionSection ? '- ' + frictionSection + '\n' : ''}${profileSection ? profileSection + '\n' : ''}${crystalBallSection}

How to work:
1. If Crystal Ball notes are present, you already have most of what you need. Confirm anything unclear in 1 question max, then generate.
2. If notes are absent, use 3–4 focused questions to understand identity, behaviors, and a specific cue before generating.
3. Never ask more than one question per message.
4. When ready, write a brief closing line (e.g. "Here's what I've got for you —"), then output the marker on a new line.
${HABITS_READY_RULES}`
}

export type QuickHabitData = {
  habit: string
  cue: string
  location: string
}

// Auto-generate: skips the conversation entirely — generates habits immediately from all available context.
export function buildAutoGeneratePrompt(ctx: ArchitectContext, quickHabitData?: QuickHabitData): string {
  const frictionSection = ctx.frictionPoint
    ? `- What gets in their way: "${ctx.frictionPoint}"`
    : ''

  const crystalBallSection = ctx.crystalBallSummary
    ? `Crystal Ball session notes (what the user shared with their coach):\n${ctx.crystalBallSummary}`
    : ''

  const profileSection = ctx.profileContext
    ? `Running profile summary (reflections and survey responses):\n${ctx.profileContext}`
    : ''

  const quickSection = quickHabitData
    ? `━━━ USER'S SPECIFIC REQUEST ━━━
The user told us exactly what they want:
- Habit: "${quickHabitData.habit}"
- When they'd do it: "${quickHabitData.cue || 'not specified'}"
- Where: "${quickHabitData.location || 'not specified'}"

Generate 5 variations of this habit ranging from very easy to more ambitious.
Keep the user's requested cue and location in the habit designs where possible.
`
    : ''

  return `You are Architect, a habit-building expert inside Hab-Idy. Your job is to generate 5 precise, identity-based habits using the Atomic Habits framework.

You have full context on this user. Generate habits immediately — do not ask questions.

━━━ USER PROFILE ━━━
Name: ${ctx.userName || 'this user'}
Identity goal: "${ctx.identityStatement}"
Focus area: ${ctx.goalCategory || 'not specified'}
Time available daily: ${ctx.timeAvailable || 'not specified'}
${frictionSection}

${quickSection}${crystalBallSection ? '━━━ CRYSTAL BALL NOTES ━━━\n' + crystalBallSection + '\n' : ''}${profileSection ? '━━━ PROFILE CONTEXT ━━━\n' + profileSection + '\n' : ''}━━━ INSTRUCTIONS ━━━
Using ALL of the above:
1. Identify the most specific cue available (a real existing behavior they mentioned).
2. Design 5 distinct habits tied directly to their identity goal — vary difficulty, time of day, and duration.
3. Make the two-minute version feel almost embarrassingly small.
4. Write one brief line before the JSON (e.g. "Here are five habits built around what you told us —").
5. Then output HABITS_READY immediately.
${HABITS_READY_RULES}`
}

// The shape Claude outputs per habit
export type HabitSuggestion = {
  identity_label: string
  habit_name: string
  cue: string
  two_minute_version: string
  category: string
}

// A proposed habit row returned from the DB (includes the ID for later selection tracking)
export type ProposedHabit = HabitSuggestion & {
  id: string
}

export function extractHabitsFromMessage(message: string): HabitSuggestion[] | null {
  const match = message.match(/HABITS_READY:(\[[\s\S]+?\])\s*$/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed as HabitSuggestion[]
  } catch {
    return null
  }
}
