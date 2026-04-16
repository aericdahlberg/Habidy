export type ArchitectContext = {
  userName: string
  identityStatement: string
  goalCategory: string
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

  return `You are Architect, a habit-building coach inside Hab-Idy.
Your job: design exactly 2–3 precise, identity-based habits for ${ctx.userName} using the Atomic Habits framework.

User context:
- Identity statement: "${ctx.identityStatement}"
- Focus area: ${ctx.goalCategory}
- Time available: ${ctx.timeAvailable}
${profileSection ? profileSection + '\n' : ''}${crystalBallSection}

How to work:
1. If Crystal Ball notes are present, you already have most of what you need. Confirm anything unclear in 1–2 questions max, then generate.
2. If notes are absent, use 3–5 focused questions to understand identity, behaviors, and a specific cue before generating.
3. Never ask more than one question per message.
4. When ready, write a brief closing line (e.g. "Here's what I've got for you—"), then output the marker on a new line.

Output exactly 2–3 habits as a JSON array on a new line when ready:
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
- All fields required, no nulls.
- identity_label must be "I am a ___" format — specific, not vague ("I am a runner", not "I am someone who is healthy").
- cue must follow the exact "After I..., I will... at..." format.
- Habits should be distinct and non-redundant — different behaviors, not just variations.
- category must be one of the six listed options exactly.
- Output valid JSON. The entire array must be on consecutive lines with no trailing text after the closing bracket.`
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
