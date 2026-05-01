import * as fs from 'fs'
import * as path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { traceable } from 'langsmith/traceable'
import {
  getGuidedSystemPrompt,
  getDeepSystemPrompt,
  buildForcedSummaryPrompt,
  type EvalDummyUser,
} from '../lib/agents/constellation'
import { buildAutoGeneratePrompt, extractHabitsFromMessage } from '../lib/agents/architect'

// ── Load env ──────────────────────────────────────────────────────────────────
function loadEnv() {
  const candidates = [
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../.env'),
  ]
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const EVAL_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'gpt-4o-mini',
  'gpt-4o',
] as const

const OPENAI_EVAL_MODELS = ['gpt-4o', 'gpt-4o-mini'] as const

const JUDGE_MODEL = 'claude-sonnet-4-6' as const
const USER_SIM_MODEL = 'claude-haiku-4-5-20251001' as const
const SUMMARY_MARKER = 'IDENTITY_GATHERER_SUMMARY:'

const BATCH_SIZE = 3
const BATCH_DELAY_MS = 3_000

const MAX_TURNS: Record<EvalMode, number> = { guided: 5, depth: 15 }

// ── Types ─────────────────────────────────────────────────────────────────────
type EvalModel = typeof EVAL_MODELS[number]
type EvalMode = 'guided' | 'depth'
type EvalPersona = 'expressive' | 'moderate' | 'uninterested'
type Message = { role: 'user' | 'assistant'; content: string }

type ParsedHabit = {
  identity_label: string
  habit_name: string
  cue: string
  two_minute_version: string
  category: string
}

type GuidedScores = {
  questionSpecificity: number
  atomicHabitsCoverage: number
  questionSharpness: number
  vagueUserHandling: number
  efficiency: number
}

type DeepScores = GuidedScores & { skinInTheGame: number }

type ArchitectScores = {
  identityAlignment: number
  habitSpecificity: number
  informationUtilization: number
  journeyDisplay: number
  habitVariety: number
}

type RunResult = {
  mode: EvalMode
  persona: EvalPersona
  model: EvalModel
  user: EvalDummyUser
  conversation: Message[]
  conversationText?: string
  summary: string | null
  turns: number
  forcedSummary: boolean
  durationMs: number
  guidedScores: GuidedScores
  deepScores: DeepScores | null
  architectScores: ArchitectScores
  habitOutput: string
  parsedHabits: ParsedHabit[]
  error: string | null
}

// ── Lazy client refs (set in main() after loadEnv()) ──────────────────────────
let _anthropic: Anthropic
let _openai: OpenAI

// ── Option pools ──────────────────────────────────────────────────────────────
const IDENTITY_TEMPLATES = [
  "I'm a college student who spends most of my time studying and scrolling. In a year I want to be someone who has real energy, reads regularly, and feels in control of my time.",
  "I'm pretty scattered right now — jumping between projects without finishing anything. I want to evolve into someone focused, consistent, and building something I'm proud of.",
  "Honestly I'm just surviving. In a year I want to feel calm, rested, and like I actually take care of myself.",
  "I work a lot and don't move my body enough. I want to be someone athletic, energetic, and disciplined about fitness.",
  "I'm creative but inconsistent. I want to be someone who ships work regularly and has built a real creative practice.",
  "I know what I want to do but I never follow through. In a year I want to be someone who does what they say they're going to do.",
  "I feel overwhelmed most of the time. I want to evolve into someone calm, intentional, and in control of their day.",
]

const FOCUS_AREA_OPTIONS = [
  'Health & Fitness', 'Career & Learning', 'Mindset & Energy',
  'Creativity', 'Relationships', 'Sleep & recovery', 'Productivity',
]

const DIRECTION_OPTIONS = [
  'I know exactly what I want, I just need to do it',
  'I have a sense of direction but it\'s fuzzy',
  'I\'m still figuring out what matters to me',
]

const BLOCKER_OPTIONS = [
  'Time — I don\'t have enough of it',
  'Consistency — I start strong then stop',
  'Motivation — I know what to do but don\'t do it',
  'Clarity — I\'m not sure what to focus on',
  'Accountability — I need someone/something to check in',
  'Overwhelm — too much going on to add anything new',
]

const PEAK_ENERGY_OPTIONS = [
  'Morning (before work/school)', 'Midday', 'Afternoon', 'Evening', 'Late night', 'It varies',
]

const STICK_TO_IT_OPTIONS = [
  'Morning (before work/school)', 'Midday', 'Afternoon', 'Evening', 'Late night', 'It varies',
]

const SLEEP_OPTIONS = ['Under 5h', '5–6h', '6–7h', '7–8h', '8h+']

const STRESS_OPTIONS = ['Pretty calm', 'Busy but okay', 'Noticeably stressed', 'Running on empty']

const EXISTING_HABITS_OPTIONS = [
  'Make coffee/tea', 'Brush teeth', 'Eat breakfast', 'Commute',
  'Lunch break', 'Come home from work', 'Eat dinner', 'Watch TV', 'Scroll phone before bed',
]

const WASTED_TIME_OPTIONS = [
  'Morning before work', 'Commute', 'Lunch', 'After work wind-down', 'Before bed', 'I\'m not sure',
]

const LOCATION_OPTIONS = [
  'Home office', 'Kitchen', 'Bedroom', 'Gym', 'Commuting', 'Office/school', 'Mix',
]

// ── User generation ───────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

function generateDummyUser(): EvalDummyUser {
  return {
    identityStatement: pick(IDENTITY_TEMPLATES),
    focusArea: pick(FOCUS_AREA_OPTIONS),
    direction: pick(DIRECTION_OPTIONS),
    blockers: pickN(BLOCKER_OPTIONS, Math.random() > 0.5 ? 2 : 1),
    peakEnergy: pick(PEAK_ENERGY_OPTIONS),
    bestTimeToStick: pick(STICK_TO_IT_OPTIONS),
    sleepAmount: pick(SLEEP_OPTIONS),
    stressLevel: pick(STRESS_OPTIONS),
    existingDailyHabits: pickN(EXISTING_HABITS_OPTIONS, Math.floor(Math.random() * 3) + 1),
    wastedTime: pick(WASTED_TIME_OPTIONS),
    primaryLocation: pick(LOCATION_OPTIONS),
  }
}

function buildUserMatrix(modes: EvalMode[], personas: EvalPersona[]): Record<string, Record<string, EvalDummyUser>> {
  const matrix: Record<string, Record<string, EvalDummyUser>> = {}
  for (const mode of modes) {
    matrix[mode] = {}
    for (const persona of personas) {
      matrix[mode][persona] = generateDummyUser()
    }
  }
  return matrix
}

// ── Model caller ──────────────────────────────────────────────────────────────
async function callModel(
  model: string,
  systemPrompt: string,
  messages: Message[],
  maxTokens = 512,
): Promise<string> {
  if ((OPENAI_EVAL_MODELS as readonly string[]).includes(model)) {
    const res = await _openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    })
    return res.choices[0]?.message?.content ?? ''
  }

  const res = await _anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  })
  return res.content[0].type === 'text' ? res.content[0].text : ''
}

// ── Judge (always Anthropic sonnet) ──────────────────────────────────────────
async function judgeCall(prompt: string): Promise<number> {
  const res = await _anthropic.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 64,
    system: 'You are an evaluation judge. Respond with ONLY a decimal number between 0 and 1. No explanation, no other text.',
    messages: [{ role: 'user', content: prompt }],
  })
  const text = res.content[0].type === 'text' ? res.content[0].text.trim() : '0'
  const val = parseFloat(text)
  return isNaN(val) ? 0 : Math.min(1, Math.max(0, val))
}

// ── Persona system prompts ────────────────────────────────────────────────────
const PERSONA_PROMPTS: Record<EvalPersona, string> = {
  expressive: `You are a real person using a habit coaching app for the first time. Your identity goal is: "{identity}".
You are expressive — give detailed, enthusiastic answers of 2–4 sentences. Share specific details from your life, schedule, and feelings. Volunteer relevant context naturally even if not asked.
Example: "I really want to fix my sleep because I wake up exhausted every single day — I usually scroll my phone for like an hour before bed and I know that's the problem. My room is pretty dark which should help but I just can't stop reaching for my phone."
Respond only as the user. Never break character.`,

  moderate: `You are a real person using a habit coaching app. Your identity goal is: "{identity}".
You are cooperative but brief — give clear responses of 1–2 sentences. Answer the question but don't volunteer extra detail unless prompted.
Example: "I usually have more energy in the mornings before class", "I've tried before but I always forget after a few days."
Respond only as the user. Never break character.`,

  uninterested: `You are a skeptical person using a habit app halfheartedly. Your identity goal is: "{identity}".
You are vague and disengaged — keep most answers under 5 words. Use phrases like "idk", "maybe", "I guess", "probably mornings?". You're not rude, just checked out.
Example: "idk", "yeah maybe", "I guess mornings", "not really".
Respond only as the user. Never break character.`,
}

// ── User simulator (always haiku, with role-flip) ─────────────────────────────
async function simulateUserMessage(
  user: EvalDummyUser,
  persona: EvalPersona,
  conversationSoFar: Message[],
): Promise<string> {
  const systemPrompt = PERSONA_PROMPTS[persona].replace('{identity}', user.identityStatement)

  // Role-flip: agent messages become "user" prompts for the simulator
  const flipped: Anthropic.MessageParam[] = conversationSoFar.map(m => ({
    role: m.role === 'user' ? 'assistant' as const : 'user' as const,
    content: m.content,
  }))

  const seed: Anthropic.MessageParam = flipped.length === 0
    ? { role: 'user', content: 'The agent just greeted you and asked their first question. What do you say?' }
    : { role: 'user', content: 'What do you say next?' }

  const res = await _anthropic.messages.create({
    model: USER_SIM_MODEL,
    max_tokens: 150,
    system: systemPrompt,
    messages: flipped.length === 0 ? [seed] : [...flipped, seed],
  })
  return res.content[0].type === 'text' ? res.content[0].text.trim() : 'I dunno'
}

// ── Conversation runner (inner) ───────────────────────────────────────────────
async function _runConversation(
  agentModel: string,
  systemPrompt: string,
  user: EvalDummyUser,
  persona: EvalPersona,
  mode: EvalMode,
): Promise<{ conversation: Message[]; conversationText: string; summary: string | null; turns: number; forcedSummary: boolean }> {
  const messages: Message[] = []

  const openingText = await callModel(agentModel, systemPrompt, [{ role: 'user', content: 'Hello' }], 512)
  messages.push({ role: 'user', content: 'Hello' })
  messages.push({ role: 'assistant', content: openingText })

  let summary: string | null = null
  let turns = 0

  for (let t = 0; t < MAX_TURNS[mode]; t++) {
    const userText = await simulateUserMessage(user, persona, messages)
    messages.push({ role: 'user', content: userText })
    turns++

    const agentText = await callModel(agentModel, systemPrompt, messages, 512)
    messages.push({ role: 'assistant', content: agentText })

    const markerIdx = agentText.indexOf(SUMMARY_MARKER)
    if (markerIdx !== -1) {
      summary = agentText.slice(markerIdx + SUMMARY_MARKER.length).trim()
      break
    }
  }

  if (!summary) {
    const forcedPrompt = buildForcedSummaryPrompt({
      userName: 'Friend',
      identityStatement: user.identityStatement,
      conversation: messages,
    })
    const forced = await _anthropic.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 512,
      system: 'Extract a habit-building summary from this conversation. Output only the JSON object requested.',
      messages: [{ role: 'user', content: forcedPrompt }],
    })
    summary = forced.content[0].type === 'text' ? forced.content[0].text.trim() : null
    const conversationText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
    return { conversation: messages, conversationText, summary, turns, forcedSummary: true }
  }

  const conversationText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
  return { conversation: messages, conversationText, summary, turns, forcedSummary: false }
}

// ── Traced conversation wrapper — visible in LangSmith as a child span ────────
function makeConversationTrace(agentModel: string, mode: EvalMode, persona: EvalPersona) {
  return traceable(
    async (user: EvalDummyUser) => {
      const systemPrompt = mode === 'guided' ? getGuidedSystemPrompt(user) : getDeepSystemPrompt(user)
      return _runConversation(agentModel, systemPrompt, user, persona, mode)
    },
    {
      name: `investigator_conversation`,
      run_type: 'chain',
      tags: ['habidy', 'agent-eval-v1', 'investigator', mode, shortModel(agentModel), persona],
      metadata: { agentModel, mode, persona },
    },
  )
}

// ── Traced architect wrapper — visible in LangSmith as a child span ───────────
function makeArchitectTrace(agentModel: string, mode: EvalMode, persona: EvalPersona) {
  return traceable(
    async (user: EvalDummyUser, crystalBallSummary: string) => {
      const architectPrompt = buildAutoGeneratePrompt({
        userName: 'Friend',
        identityStatement: user.identityStatement,
        goalCategory: user.focusArea,
        frictionPoint: user.blockers.join('; '),
        timeAvailable: user.peakEnergy,
        crystalBallSummary,
        profileContext: null,
      })

      const habitOutput = await callModel(agentModel, architectPrompt, [
        { role: 'user', content: 'Generate my habits now.' },
      ], 1024)

      const parsedHabits = (extractHabitsFromMessage(habitOutput) ?? []) as ParsedHabit[]

      return {
        habitOutput,
        parsedHabits,
        habitCount: parsedHabits.length,
      }
    },
    {
      name: `architect_generation`,
      run_type: 'chain',
      tags: ['habidy', 'agent-eval-v1', 'architect', mode, shortModel(agentModel), persona],
      metadata: { agentModel, mode, persona },
    },
  )
}

// ── Scoring ───────────────────────────────────────────────────────────────────
function scoreEfficiency(turns: number, mode: EvalMode): number {
  if (mode === 'guided') {
    if (turns <= 5) return 1.0
    if (turns <= 7) return 0.75
    if (turns <= 9) return 0.5
    return 0.0
  }
  if (turns <= 10) return 1.0
  if (turns <= 13) return 0.75
  if (turns <= 15) return 0.5
  return 0.0
}

async function scoreGuidedMode(
  conversation: Message[],
  user: EvalDummyUser,
  persona: EvalPersona,
  turns: number,
  mode: EvalMode,
): Promise<GuidedScores> {
  const transcript = conversation.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')

  const [questionSpecificity, atomicHabitsCoverage, questionSharpness, vagueUserHandling] =
    await Promise.all([
      judgeCall(`Rate QUESTION SPECIFICITY (0-1).
User identity: "${user.identityStatement}"
User focus: "${user.focusArea}"
Do the agent's questions directly reference this user's specific identity and focus area, or are they generic?
1.0 = every question tied to their specific situation
0.5 = mix of specific and generic
0.0 = generic questions for any user

CONVERSATION:
${transcript}

Score 0-1:`),

      judgeCall(`Rate ATOMIC HABITS COVERAGE (0-1).
Count how many of these 7 elements were meaningfully surfaced:
1. Cue — a specific "After I [X]" trigger
2. Environment — where they are, physical context
3. Time of day — when specifically this could happen
4. Energy level — when they have the most capacity
5. Two-minute version — smallest possible starting habit
6. Reward — what would make it satisfying for THIS person
7. Craving/motivation — why they actually want this change

Score = elements found / 7. Vague or passing mentions do not count.
User's existing habits (potential cues): ${user.existingDailyHabits.join(', ')}
User's location: ${user.primaryLocation}

CONVERSATION:
${transcript}

Score 0-1:`),

      judgeCall(`Rate QUESTION SHARPNESS (0-1).
Are the agent's messages concise (under 3 sentences), warm, and free of filler language?
1.0 = consistently short, warm, precise — no preamble or padding
0.5 = occasionally too long or uses filler ("Great!", "That's wonderful!")
0.0 = wordy, preachy, or repetitive

CONVERSATION:
${transcript}

Score 0-1:`),

      judgeCall(`Rate VAGUE USER HANDLING (0-1).
User persona was: "${persona}".
When the user gave short or vague answers, did the agent draw out more useful information?
1.0 = consistently probed with follow-ups to extract specifics
0.5 = probed sometimes but accepted some vague answers
0.0 = accepted vague answers throughout

CONVERSATION:
${transcript}

Score 0-1:`),
    ])

  return {
    questionSpecificity,
    atomicHabitsCoverage,
    questionSharpness,
    vagueUserHandling,
    efficiency: scoreEfficiency(turns, mode),
  }
}

async function scoreDeepMode(
  conversation: Message[],
  user: EvalDummyUser,
  persona: EvalPersona,
  turns: number,
): Promise<DeepScores> {
  const transcript = conversation.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
  const [guided, skinInTheGame] = await Promise.all([
    scoreGuidedMode(conversation, user, persona, turns, 'depth'),
    judgeCall(`Rate SKIN IN THE GAME (0-1).
Did the agent explore the emotional WHY — what happens if they don't change, what life looks like if they succeed, personal stakes?
User's blockers: ${user.blockers.join(', ')}
1.0 = clearly explored intrinsic motivation, stakes, emotional meaning
0.5 = touched on motivation but stayed surface-level
0.0 = never explored deeper motivation or stakes

CONVERSATION:
${transcript}

Score 0-1:`),
  ])
  return { ...guided, skinInTheGame }
}

async function scoreArchitect(
  habitOutput: string,
  user: EvalDummyUser,
  summary: string,
): Promise<ArchitectScores> {
  const [identityAlignment, habitSpecificity, informationUtilization, journeyDisplay, habitVariety] =
    await Promise.all([
      judgeCall(`Rate IDENTITY ALIGNMENT (0-1).
User identity: "${user.identityStatement}"
User focus: "${user.focusArea}"
Do the generated habits connect to who this user wants to become?
1.0 = every habit explicitly tied to their identity and focus
0.5 = loose or partial connection
0.0 = generic habits unrelated to their identity

HABIT OUTPUT:
${habitOutput}

Score 0-1:`),

      judgeCall(`Rate HABIT SPECIFICITY (0-1).
Does each habit follow "After I [existing behavior], I will [new behavior] at [location/time]"?
Is the two-minute version genuinely under 2 minutes?
Is the identity label in "I am a [specific role]" format?
1.0 = all habits fully specific with correct format
0.5 = some formatting issues or one habit is weak
0.0 = vague, generic, or missing required fields

HABIT OUTPUT:
${habitOutput}

Score 0-1:`),

      judgeCall(`Rate INFORMATION UTILIZATION (0-1).
Did Architect use the user's existing habits as cue anchors, their location, energy patterns?
User's existing habits: ${user.existingDailyHabits.join(', ')}
User's primary location: ${user.primaryLocation}
User's peak energy: ${user.peakEnergy}
Investigation summary: ${summary}

1.0 = habits clearly built from user's real routine and context
0.5 = some context used but habits could still be generic
0.0 = generic habits ignoring gathered context

HABIT OUTPUT:
${habitOutput}

Score 0-1:`),

      judgeCall(`Rate JOURNEY DISPLAY (0-1).
Does the output show a compelling path from a tiny daily habit to a larger identity?
Does the identity label ("I am a ___") make the vision tangible and exciting?
1.0 = clear, exciting journey — identity feels real and achievable
0.5 = some vision but not compelling
0.0 = habits feel like chores with no identity story

HABIT OUTPUT:
${habitOutput}

Score 0-1:`),

      judgeCall(`Rate HABIT VARIETY (0-1).
Are the 5 habits meaningfully distinct with a clear range from easy to ambitious?
Do they span different times of day, contexts, and difficulty levels?
1.0 = 5 distinct habits with clear difficulty range and different contexts
0.5 = some variety but habits feel too similar
0.0 = repetitive habits at the same difficulty level

HABIT OUTPUT:
${habitOutput}

Score 0-1:`),
    ])

  return { identityAlignment, habitSpecificity, informationUtilization, journeyDisplay, habitVariety }
}

// ── Run one combination — parent trace with nested child spans ────────────────
async function runCombination(
  mode: EvalMode,
  persona: EvalPersona,
  model: EvalModel,
  user: EvalDummyUser,
): Promise<RunResult> {
  const tag = `[${shortModel(model)}/${mode}/${persona}]`

  // Parent trace — inputs include full user context so it's readable in LangSmith
  const parentTrace = traceable(
    async (evalUser: EvalDummyUser): Promise<RunResult> => {
      const start = Date.now()
      try {
        // ── Investigator conversation (child span) ──────────────────────────
        const convTrace = makeConversationTrace(model, mode, persona)
        const { conversation, conversationText, summary, turns, forcedSummary } =
          await convTrace(evalUser)

        // ── Score investigator ──────────────────────────────────────────────
        const guidedScores = await scoreGuidedMode(conversation, evalUser, persona, turns, mode)
        const deepScores = mode === 'depth'
          ? await scoreDeepMode(conversation, evalUser, persona, turns)
          : null

        // ── Architect generation (child span) ───────────────────────────────
        const crystalBallSummary = summary ?? `Identity: ${evalUser.identityStatement}.`
        const archTrace = makeArchitectTrace(model, mode, persona)
        const { habitOutput, parsedHabits } = await archTrace(evalUser, crystalBallSummary)

        // ── Score architect ─────────────────────────────────────────────────
        const architectScores = await scoreArchitect(habitOutput, evalUser, crystalBallSummary)

        console.log(
          `  ✓ ${tag} turns=${turns}${forcedSummary ? ' [forced]' : ''} habits=${parsedHabits.length}`,
        )

        // Return full result — this becomes the parent trace output in LangSmith
        return {
          mode, persona, model, user: evalUser,
          conversation, conversationText, summary, turns, forcedSummary,
          durationMs: Date.now() - start,
          guidedScores, deepScores, architectScores,
          habitOutput, parsedHabits, error: null,
        }
      } catch (err) {
        console.log(`  ✗ ${tag}: ${err}`)
        const zeroGuided: GuidedScores = {
          questionSpecificity: 0, atomicHabitsCoverage: 0,
          questionSharpness: 0, vagueUserHandling: 0, efficiency: 0,
        }
        return {
          mode, persona, model, user: evalUser,
          conversation: [], summary: null, turns: 0, forcedSummary: false,
          durationMs: 0,
          guidedScores: zeroGuided, deepScores: null,
          architectScores: { identityAlignment: 0, habitSpecificity: 0, informationUtilization: 0, journeyDisplay: 0, habitVariety: 0 },
          habitOutput: '', parsedHabits: [],
          error: err instanceof Error ? err.message : String(err),
        }
      }
    },
    {
      name: `agentEval__${mode}__${shortModel(model)}__${persona}`,
      run_type: 'chain',
      tags: ['habidy', 'agent-eval-v1', mode, shortModel(model), persona],
      metadata: { mode, model, persona },
    },
  )

  return parentTrace(user)
}

// ── Table helpers ─────────────────────────────────────────────────────────────
const COL_LABEL = 26
const COL_MODEL = 12

function shortModel(model: string): string {
  if (model.includes('haiku')) return 'haiku'
  if (model.includes('sonnet')) return 'sonnet'
  if (model === 'gpt-4o-mini') return 'gpt-4o-mini'
  if (model === 'gpt-4o') return 'gpt-4o'
  return model.split('-').pop() ?? model
}

function col(s: string, w: number) { return s.slice(0, w).padEnd(w) }
function fmt(n: number | null) { return n === null ? '  --  ' : n.toFixed(2) }
function avg(nums: (number | null)[]): number {
  const valid = nums.filter((n): n is number => n !== null)
  return valid.length === 0 ? 0 : valid.reduce((a, b) => a + b, 0) / valid.length
}
function tableHeader(labels: string[]): string {
  return col('', COL_LABEL) + labels.map(l => col(l, COL_MODEL)).join('')
}
function tableSep(n: number): string {
  return '─'.repeat(COL_LABEL) + '─'.repeat(COL_MODEL * n)
}
function tableRow(label: string, values: (number | null)[]): string {
  return col(label, COL_LABEL) + values.map(v => col(fmt(v), COL_MODEL)).join('')
}

// ── Print functions ───────────────────────────────────────────────────────────
function printGuidedTable(results: RunResult[]) {
  const guided = results.filter(r => r.mode === 'guided' && !r.error)
  if (guided.length === 0) return
  const modelLabels = EVAL_MODELS.map(shortModel)
  const s = (m: EvalModel, k: keyof GuidedScores) =>
    avg(guided.filter(r => r.model === m).map(r => r.guidedScores[k]))
  const overall = (m: EvalModel) =>
    avg(guided.filter(r => r.model === m).flatMap(r => Object.values(r.guidedScores)))

  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║               GUIDED AGENT RESULTS (5 criteria)                 ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')
  console.log(tableHeader(modelLabels))
  console.log(tableSep(EVAL_MODELS.length))
  const rows: [string, keyof GuidedScores][] = [
    ['Question Specificity', 'questionSpecificity'],
    ['Atomic Habits Coverage', 'atomicHabitsCoverage'],
    ['Question Sharpness', 'questionSharpness'],
    ['Vague User Handling', 'vagueUserHandling'],
    ['Efficiency', 'efficiency'],
  ]
  for (const [label, key] of rows) console.log(tableRow(label, EVAL_MODELS.map(m => s(m, key))))
  console.log(tableSep(EVAL_MODELS.length))
  console.log(tableRow('AVERAGE', EVAL_MODELS.map(overall)))
}

function printDeepTable(results: RunResult[]) {
  const deep = results.filter(r => r.mode === 'depth' && !r.error && r.deepScores)
  if (deep.length === 0) return
  const modelLabels = EVAL_MODELS.map(shortModel)
  const sg = (m: EvalModel, k: keyof GuidedScores) =>
    avg(deep.filter(r => r.model === m).map(r => r.deepScores![k]))
  const sd = (m: EvalModel) =>
    avg(deep.filter(r => r.model === m).map(r => r.deepScores!.skinInTheGame))
  const overall = (m: EvalModel) =>
    avg(deep.filter(r => r.model === m).flatMap(r => Object.values(r.deepScores!)))

  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║               DEEP AGENT RESULTS (6 criteria)                   ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')
  console.log(tableHeader(modelLabels))
  console.log(tableSep(EVAL_MODELS.length))
  const rows: [string, keyof GuidedScores][] = [
    ['Question Specificity', 'questionSpecificity'],
    ['Atomic Habits Coverage', 'atomicHabitsCoverage'],
    ['Question Sharpness', 'questionSharpness'],
    ['Vague User Handling', 'vagueUserHandling'],
    ['Efficiency', 'efficiency'],
  ]
  for (const [label, key] of rows) console.log(tableRow(label, EVAL_MODELS.map(m => sg(m, key))))
  console.log(tableRow('Skin In The Game', EVAL_MODELS.map(m => sd(m))))
  console.log(tableSep(EVAL_MODELS.length))
  console.log(tableRow('AVERAGE', EVAL_MODELS.map(overall)))
}

function printArchitectTable(results: RunResult[]) {
  const valid = results.filter(r => !r.error)
  if (valid.length === 0) return
  const modelLabels = EVAL_MODELS.map(shortModel)
  const s = (m: EvalModel, k: keyof ArchitectScores) =>
    avg(valid.filter(r => r.model === m).map(r => r.architectScores[k]))
  const overall = (m: EvalModel) =>
    avg(valid.filter(r => r.model === m).flatMap(r => Object.values(r.architectScores)))

  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║               ARCHITECT RESULTS (5 criteria)                    ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')
  console.log(tableHeader(modelLabels))
  console.log(tableSep(EVAL_MODELS.length))
  const rows: [string, keyof ArchitectScores][] = [
    ['Identity Alignment', 'identityAlignment'],
    ['Habit Specificity', 'habitSpecificity'],
    ['Information Utilization', 'informationUtilization'],
    ['Journey Display', 'journeyDisplay'],
    ['Habit Variety', 'habitVariety'],
  ]
  for (const [label, key] of rows) console.log(tableRow(label, EVAL_MODELS.map(m => s(m, key))))
  console.log(tableSep(EVAL_MODELS.length))
  console.log(tableRow('AVERAGE', EVAL_MODELS.map(overall)))
}

function printPersonaBreakdown(results: RunResult[]) {
  const valid = results.filter(r => !r.error)
  if (valid.length === 0) return
  const personas: EvalPersona[] = ['expressive', 'moderate', 'uninterested']
  const modelPersonaAvg = (m: EvalModel, p: EvalPersona) =>
    avg(valid.filter(r => r.model === m && r.persona === p).flatMap(r => [
      ...Object.values(r.guidedScores),
      ...(r.deepScores ? Object.values(r.deepScores) : []),
      ...Object.values(r.architectScores),
    ]))

  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║         PERSONA BREAKDOWN (avg across all modes + agents)        ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')
  console.log(tableHeader(personas))
  console.log(tableSep(personas.length))
  for (const m of EVAL_MODELS) {
    console.log(tableRow(shortModel(m), personas.map(p => modelPersonaAvg(m, p))))
  }
}

function printRecommendations(results: RunResult[]) {
  const valid = results.filter(r => !r.error)
  if (valid.length === 0) return

  const modelOverall = (m: EvalModel) =>
    avg(valid.filter(r => r.model === m).flatMap(r => [
      ...Object.values(r.guidedScores),
      ...(r.deepScores ? Object.values(r.deepScores) : []),
      ...Object.values(r.architectScores),
    ]))

  const bestModel = [...EVAL_MODELS].sort((a, b) => modelOverall(b) - modelOverall(a))[0]

  const criteriaAvgs: Record<string, number[]> = {}
  for (const r of valid) {
    const add = (k: string, v: number) => { (criteriaAvgs[k] ??= []).push(v) }
    Object.entries(r.guidedScores).forEach(([k, v]) => add(k, v))
    if (r.deepScores) Object.entries(r.deepScores).forEach(([k, v]) => add(k, v))
    Object.entries(r.architectScores).forEach(([k, v]) => add(k, v))
  }
  const worstCriteria = Object.entries(criteriaAvgs)
    .map(([k, vs]) => [k, avg(vs)] as [string, number])
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)

  const uninterestedAvg = (m: EvalModel) =>
    avg(valid.filter(r => r.model === m && r.persona === 'uninterested').flatMap(r => [
      ...Object.values(r.guidedScores), ...Object.values(r.architectScores),
    ]))
  const bestUninterested = [...EVAL_MODELS].sort((a, b) => uninterestedAvg(b) - uninterestedAvg(a))[0]

  const efficiencyAvg = (m: EvalModel) =>
    avg(valid.filter(r => r.model === m).map(r => r.guidedScores.efficiency))
  const bestEfficient = [...EVAL_MODELS].sort((a, b) => efficiencyAvg(b) - efficiencyAvg(a))[0]

  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║                      RECOMMENDATIONS                            ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')
  console.log(`  Best overall model:            ${shortModel(bestModel)} (avg ${modelOverall(bestModel).toFixed(2)})`)
  console.log(`  Best with uninterested users:  ${shortModel(bestUninterested)} (${uninterestedAvg(bestUninterested).toFixed(2)})`)
  console.log(`  Most efficient (fewest turns): ${shortModel(bestEfficient)} (${efficiencyAvg(bestEfficient).toFixed(2)})`)
  console.log('\n  Weakest criteria (fix these prompts):')
  for (const [k, score] of worstCriteria) {
    const label = k.replace(/([A-Z])/g, ' $1').toLowerCase().trim()
    console.log(`    • ${label}: ${score.toFixed(2)} — see EVAL_GUIDE.md for which prompt to edit`)
  }
  console.log('')
}

// ── Rate limit helpers ────────────────────────────────────────────────────────
function is429(err: unknown): boolean {
  if (err instanceof Error)
    return err.message.includes('429') || err.message.toLowerCase().includes('rate limit')
  return false
}

async function withRetry<T>(fn: () => Promise<T>, tag: string): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (is429(err)) {
      console.log(`  ⏳ Rate limited ${tag} — waiting 10s...`)
      await new Promise(r => setTimeout(r, 10_000))
      return fn()
    }
    throw err
  }
}

async function runInBatches<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number,
  delayMs: number,
  onBatchComplete: (done: number, total: number, bn: number, tb: number) => void,
): Promise<T[]> {
  const results: T[] = []
  const totalBatches = Math.ceil(tasks.length / batchSize)
  for (let i = 0; i < tasks.length; i += batchSize) {
    const bn = Math.floor(i / batchSize) + 1
    const batchResults = await Promise.all(tasks.slice(i, i + batchSize).map(t => t()))
    results.push(...batchResults)
    onBatchComplete(results.length, tasks.length, bn, totalBatches)
    if (i + batchSize < tasks.length) await new Promise(r => setTimeout(r, delayMs))
  }
  return results
}

// ── CLI args ──────────────────────────────────────────────────────────────────
function parseArgs(): { modes: EvalMode[]; personas: EvalPersona[] } {
  const args = process.argv.slice(2)
  const getFlag = (flag: string) => {
    const idx = args.indexOf(flag)
    return idx !== -1 ? args[idx + 1] : undefined
  }
  const modeFlag = getFlag('--mode') ?? 'all'
  const personaFlag = getFlag('--persona') ?? 'all'
  const ALL_MODES: EvalMode[] = ['guided', 'depth']
  const ALL_PERSONAS: EvalPersona[] = ['expressive', 'moderate', 'uninterested']
  return {
    modes: modeFlag === 'all' ? ALL_MODES : [modeFlag as EvalMode],
    personas: personaFlag === 'all' ? ALL_PERSONAS : [personaFlag as EvalPersona],
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv()

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set')
    process.exit(1)
  }

  _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠  OPENAI_API_KEY not set — gpt-4o and gpt-4o-mini runs will fail')
  }
  if (!process.env.LANGCHAIN_API_KEY) {
    console.warn('⚠  LANGCHAIN_API_KEY not set — LangSmith tracing disabled')
  } else if (process.env.LANGCHAIN_TRACING_V2 !== 'true') {
    console.warn('⚠  LANGCHAIN_TRACING_V2 is not set to "true" — traces will not be recorded')
    console.warn('   Add LANGCHAIN_TRACING_V2=true to your .env to enable LangSmith')
  }

  const { modes, personas } = parseArgs()
  const userMatrix = buildUserMatrix(modes, personas)
  const total = modes.length * personas.length * EVAL_MODELS.length

  console.log('\nHabidy Agent Eval')
  console.log(`  Modes:    ${modes.join(', ')}`)
  console.log(`  Personas: ${personas.join(', ')}`)
  console.log(`  Models:   ${EVAL_MODELS.map(shortModel).join(', ')}`)
  console.log(`  Runs:     ${total} investigator + ${total} architect = ${total * 2} LangSmith spans`)
  console.log(`  Judge:    ${JUDGE_MODEL}  |  User sim: ${USER_SIM_MODEL}`)
  console.log(`  LangSmith project: ${process.env.LANGCHAIN_PROJECT ?? '(default)'}`)
  console.log(`\nRunning in batches of ${BATCH_SIZE} with ${BATCH_DELAY_MS / 1000}s delay...\n`)

  const tasks = modes.flatMap(mode =>
    personas.flatMap(persona =>
      EVAL_MODELS.map(model => {
        const user = userMatrix[mode][persona]
        const tag = `[${shortModel(model)}/${mode}/${persona}]`
        return () => withRetry(() => runCombination(mode, persona, model, user), tag)
      }),
    ),
  )

  const globalStart = Date.now()
  // NOTE: do NOT reference `allResults` inside this callback — it is in TDZ until runInBatches resolves
  const allResults = await runInBatches(tasks, BATCH_SIZE, BATCH_DELAY_MS, (done, tot, bn, tb) => {
    const elapsed = (Date.now() - globalStart) / 1000
    const eta = elapsed > 0 && done > 0 ? Math.round((tot - done) / (done / elapsed)) : '?'
    console.log(`  Batch ${bn}/${tb} — ${done}/${tot} done | ETA ${eta}s`)
  })

  const elapsed = ((Date.now() - globalStart) / 1000).toFixed(1)
  const succeeded = allResults.filter(r => !r.error).length
  console.log(`\nDone in ${elapsed}s — ${succeeded}/${total} succeeded`)

  if (modes.includes('guided')) printGuidedTable(allResults)
  if (modes.includes('depth')) printDeepTable(allResults)
  printArchitectTable(allResults)
  printPersonaBreakdown(allResults)
  printRecommendations(allResults)

  console.log('View traces at https://smith.langchain.com\n')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
