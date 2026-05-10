import * as fs from 'fs'
import * as path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { Client } from 'langsmith'
import { traceable } from 'langsmith/traceable'
import { buildIdentityGathererSystemPrompt, buildConstellationUserContext, type IdentityGathererContext } from '../lib/agents/constellation'
import { buildArchitectSystemPrompt, buildArchitectUserContext, extractHabitsFromMessage } from '../lib/agents/architect'

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
loadEnv()

// ── Config ────────────────────────────────────────────────────────────────────
const AGENT_MODEL = 'claude-sonnet-4-6'
const JUDGE_MODEL = 'claude-sonnet-4-6'
const USER_SIM_MODEL = 'claude-haiku-4-5-20251001'
const DATASET_NAME = 'Habidy-Identity-Investigator-Agent'
const PASS_THRESHOLD = 0.7
const MAX_TURNS = 5
const BATCH_SIZE = 3
const BATCH_DELAY_MS = 2_000
const SUMMARY_MARKER = 'IDENTITY_GATHERER_SUMMARY:'

// ── Types ─────────────────────────────────────────────────────────────────────
type Message = { role: 'user' | 'assistant'; content: string }

type GathererScores = {
  specificity: number
  atomic_habits_coverage: number
  vague_user_recovery: number
  efficiency: number
}

type ArchitectScores = {
  habit_specificity: number
  identity_alignment: number
  context_utilization: number
}

type ExampleResult = {
  exampleId: string
  identity: string
  gathererScores: GathererScores
  architectScores: ArchitectScores
  turnsUsed: number
  summaryProduced: boolean
  habitsParsed: boolean
  conversation: Message[]
  summary: string | null
  habitOutput: string
  error: string | null
}

// ── Judge: return a 0-1 score ─────────────────────────────────────────────────
async function judge(client: Anthropic, prompt: string): Promise<number> {
  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 64,
    system:
      'You are an evaluation judge. Respond with ONLY a decimal number between 0 and 1. No explanation, no other text.',
    messages: [{ role: 'user', content: prompt }],
  })
  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '0'
  const val = parseFloat(text)
  return isNaN(val) ? 0 : Math.min(1, Math.max(0, val))
}

// ── Simulate one vague user reply ─────────────────────────────────────────────
async function simulateVagueUser(
  client: Anthropic,
  identity: string,
  history: Message[],
): Promise<string> {
  const flipped: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role === 'user' ? ('assistant' as const) : ('user' as const),
    content: m.content,
  }))

  const seedMessage: Anthropic.MessageParam =
    flipped.length === 0
      ? { role: 'user', content: 'The agent just greeted you. What do you say?' }
      : { role: 'user', content: 'What do you say next?' }

  const response = await client.messages.create({
    model: USER_SIM_MODEL,
    max_tokens: 150,
    system: `You are a real person using a habit app. Your identity goal: "${identity}".
You are a vague user — you give short, unclear responses of 1 sentence, you're unsure what you want, often off-topic.
Examples: "I dunno, just whenever", "maybe mornings?", "I haven't really thought about it".
Respond only as the user. Never break character. Be brief.`,
    messages: flipped.length === 0 ? [seedMessage] : [...flipped, seedMessage],
  })

  return response.content[0].type === 'text' ? response.content[0].text.trim() : 'I dunno'
}

// ── Run Identity Gatherer conversation ────────────────────────────────────────
async function runGatherer(
  client: Anthropic,
  identity: string,
): Promise<{ conversation: Message[]; summary: string | null; turns: number }> {
  return traceable(
    async (identity: string) => _runGatherer(client, identity),
    {
      name: 'identity-gatherer-conversation',
      run_type: 'chain',
      tags: ['habidy', 'prompt-eval-v1', 'identity-gatherer'],
      metadata: { identity, agentModel: AGENT_MODEL, userSimModel: USER_SIM_MODEL },
    },
  )(identity)
}

async function _runGatherer(
  client: Anthropic,
  identity: string,
): Promise<{ conversation: Message[]; summary: string | null; turns: number }> {
  const gathererCtx: IdentityGathererContext = {
    onboarding: { identity, goalCategory: '', frictionPoint: '', timeAvailable: '', displayName: 'Friend' },
    profileContext: null,
  }
  const systemPrompt = buildIdentityGathererSystemPrompt(!!identity)
  const contextBlock = buildConstellationUserContext(gathererCtx, null)
  const contextPrefix = [
    { role: 'user' as const, content: contextBlock },
    { role: 'assistant' as const, content: 'Understood. I have the user context.' },
  ]

  const messages: Message[] = []

  // Opening message
  const opening = await client.messages.create({
    model: AGENT_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [...contextPrefix, { role: 'user', content: 'Hello' }],
  })
  const openingText = opening.content[0].type === 'text' ? opening.content[0].text : ''
  messages.push({ role: 'user', content: 'Hello' })
  messages.push({ role: 'assistant', content: openingText })

  let summary: string | null = null
  let turns = 0

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const userText = await simulateVagueUser(client, identity, messages)
    messages.push({ role: 'user', content: userText })
    turns++

    const agentResp = await client.messages.create({
      model: AGENT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [...contextPrefix, ...messages.map((m) => ({ role: m.role, content: m.content }))],
    })
    const agentText = agentResp.content[0].type === 'text' ? agentResp.content[0].text : ''
    messages.push({ role: 'assistant', content: agentText })

    const markerIdx = agentText.indexOf(SUMMARY_MARKER)
    if (markerIdx !== -1) {
      summary = agentText.slice(markerIdx + SUMMARY_MARKER.length).trim()
      break
    }
  }

  return { conversation: messages, summary, turns }
}

// ── Run Architect ─────────────────────────────────────────────────────────────
async function runArchitect(
  client: Anthropic,
  identity: string,
  summary: string,
): Promise<string> {
  return traceable(
    async (identity: string, summary: string) => _runArchitect(client, identity, summary),
    {
      name: 'architect-habit-generation',
      run_type: 'chain',
      tags: ['habidy', 'prompt-eval-v1', 'architect'],
      metadata: { identity, agentModel: AGENT_MODEL },
    },
  )(identity, summary)
}

async function _runArchitect(
  client: Anthropic,
  identity: string,
  summary: string,
): Promise<string> {
  const ctx = {
    userName: 'Friend',
    identityStatement: identity,
    goalCategory: '',
    frictionPoint: '',
    timeAvailable: '15 minutes',
    crystalBallSummary: summary,
    profileContext: null,
      calendarContext: null,
  }
  const systemPrompt = buildArchitectSystemPrompt({ hasCrystalBallNotes: !!summary })
  const contextBlock = buildArchitectUserContext(ctx, null)

  const response = await client.messages.create({
    model: AGENT_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: contextBlock },
      { role: 'assistant', content: 'Understood. I have the user context.' },
      { role: 'user', content: 'Based on everything you know about me, build my habits now.' },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

// ── Score Identity Gatherer ───────────────────────────────────────────────────
async function scoreGatherer(
  client: Anthropic,
  conversation: Message[],
  identity: string,
  turns: number,
  summary: string | null,
): Promise<GathererScores> {
  const transcript = conversation
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  const [specificity, atomic_habits_coverage, vague_user_recovery, efficiency] =
    await Promise.all([
      judge(
        client,
        `Rate SPECIFICITY (0-1) for this Identity Gatherer conversation.
Does the agent ask questions specifically tailored to this user's identity goal: "${identity}"?
1.0 = every question is specific to this goal (e.g. if they want to read more, asks about where/when they read)
0.5 = mix of specific and generic questions
0.0 = generic questions that could apply to any user regardless of their goal

CONVERSATION:
${transcript}

Score 0-1:`,
      ),
      judge(
        client,
        `Rate ATOMIC HABITS COVERAGE (0-1) for this conversation.
Count how many of these 6 elements were meaningfully surfaced by the end:
1. Cue — a specific "After I [X]" trigger in their existing routine
2. Environment — where they are, physical space, schedule context
3. Time of day — when specifically this could happen
4. Two-minute version — the smallest possible start
5. Motivation/reward — what would make this enjoyable for THEM
6. Identity connection — how this ties to who they want to become

Score = elements found / 6. Vague or partial mentions do not count.

CONVERSATION:
${transcript}

Score 0-1:`,
      ),
      judge(
        client,
        `Rate VAGUE USER RECOVERY (0-1) for this conversation.
The user in this conversation gave short, unclear, or non-committal answers (e.g. "I dunno", "maybe mornings?", "I haven't thought about it").
Did the agent probe to extract specific details despite vague answers? Or did it accept vague answers and move on?
1.0 = agent consistently re-asked or rephrased to draw out specifics; rarely accepted "I don't know" at face value
0.5 = agent probed sometimes but let some vague answers slide
0.0 = agent accepted every vague answer and produced a generic or empty outcome

CONVERSATION:
${transcript}

Score 0-1:`,
      ),
      judge(
        client,
        `Rate EFFICIENCY (0-1) for this Identity Gatherer.
Did the agent gather enough context and produce a summary without wasting turns?

Scoring:
1.0 = produced a complete IDENTITY_GATHERER_SUMMARY in ≤ 4 user turns
0.5 = produced a complete summary in exactly 5 user turns
0.0 = did not produce a summary at all after ${MAX_TURNS} turns

This conversation used ${turns} user turns.
Summary produced: ${summary ? 'YES' : 'NO'}

Score 0-1:`,
      ),
    ])

  return { specificity, atomic_habits_coverage, vague_user_recovery, efficiency }
}

// ── Score Architect ───────────────────────────────────────────────────────────
async function scoreArchitect(
  client: Anthropic,
  habitOutput: string,
  identity: string,
  summary: string,
): Promise<ArchitectScores> {
  const [habit_specificity, identity_alignment, context_utilization] = await Promise.all([
    judge(
      client,
      `Rate HABIT SPECIFICITY (0-1) for this Architect output.
Are the habits concrete, actionable, and correctly formatted?
Check:
- Does each habit cue follow exactly "After I [existing behavior], I will [new behavior] at [location/time]"?
- Is the two-minute version genuinely small (completable in under 2 minutes)?
- Is the identity_label in "I am a [specific role]" format, not vague?
- Are there exactly 2 distinct habits?

1.0 = both habits fully specific with correct format throughout
0.5 = some formatting issues or one habit is weak
0.0 = vague, generic, or missing required fields

HABIT OUTPUT:
${habitOutput}

Score 0-1:`,
    ),
    judge(
      client,
      `Rate IDENTITY ALIGNMENT (0-1) for this Architect output.
User's identity goal: "${identity}"
Do the habits directly help the user become the person they described?
1.0 = habits are clearly and specifically tied to this identity goal
0.5 = habits are loosely related
0.0 = generic habits that could belong to anyone regardless of their goal

HABIT OUTPUT:
${habitOutput}

Score 0-1:`,
    ),
    judge(
      client,
      `Rate CONTEXT UTILIZATION (0-1) for this Architect output.
Did the Architect use the specific details gathered during the Identity Gatherer session?
Look for: specific cues from the user's real routine, their environment, named times of day, or friction points they mentioned.
1.0 = habit is clearly built around details from the conversation (e.g. "After I brush my teeth at 9pm in my dorm...")
0.5 = some specifics used but the habit could still be generic
0.0 = habit ignores the gathered context entirely

IDENTITY GATHERER SUMMARY (what was gathered):
${summary}

HABIT OUTPUT:
${habitOutput}

Score 0-1:`,
    ),
  ])

  return { habit_specificity, identity_alignment, context_utilization }
}

// ── Extract identity from LangSmith example ───────────────────────────────────
function extractIdentity(inputs: Record<string, unknown>): string {
  // Try common field names from the dataset
  const candidates = ['identity', 'identity_goal', 'input', 'message', 'content', 'text']
  for (const key of candidates) {
    const val = inputs[key]
    if (typeof val === 'string' && val.trim()) return val.trim()
  }
  // Try messages array
  if (Array.isArray(inputs['messages'])) {
    const msgs = inputs['messages'] as Array<{ role?: string; content?: string }>
    const user = msgs.find((m) => m.role === 'user' || !m.role)
    if (user?.content) return user.content.trim()
  }
  // Fallback: stringify first value
  const first = Object.values(inputs)[0]
  return typeof first === 'string' ? first.trim() : 'I want to become a better version of myself'
}

// ── Run one example ───────────────────────────────────────────────────────────
async function runExample(
  client: Anthropic,
  exampleId: string,
  identity: string,
): Promise<ExampleResult> {
  const runFn = traceable(
    async (exampleId: string, identity: string): Promise<ExampleResult> => {
      try {
        // 1. Run Identity Gatherer with vague user
        const { conversation, summary, turns } = await runGatherer(client, identity)

        // 2. Score Identity Gatherer
        const gathererScores = await scoreGatherer(client, conversation, identity, turns, summary)

        // 3. Run Architect (use summary or fallback)
        const summaryInput = summary ?? `Identity: ${identity}. No session context available.`
        const habitOutput = await runArchitect(client, identity, summaryInput)

        // 4. Score Architect
        const architectScores = await scoreArchitect(client, habitOutput, identity, summaryInput)

        // 5. Check if habits parsed correctly
        const habits = extractHabitsFromMessage(habitOutput)

        return {
          exampleId,
          identity,
          gathererScores,
          architectScores,
          turnsUsed: turns,
          summaryProduced: summary !== null,
          habitsParsed: habits !== null && habits.length > 0,
          conversation,
          summary,
          habitOutput,
          error: null,
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return {
          exampleId,
          identity,
          gathererScores: { specificity: 0, atomic_habits_coverage: 0, vague_user_recovery: 0, efficiency: 0 },
          architectScores: { habit_specificity: 0, identity_alignment: 0, context_utilization: 0 },
          turnsUsed: 0,
          summaryProduced: false,
          habitsParsed: false,
          conversation: [],
          summary: null,
          habitOutput: '',
          error: msg,
        }
      }
    },
    {
      name: `prompt-eval__${exampleId.slice(-8)}`,
      run_type: 'chain',
      tags: ['habidy', 'prompt-eval-v1', 'identity-gatherer', 'architect'],
      metadata: { exampleId, identity, agentModel: AGENT_MODEL, judgeModel: JUDGE_MODEL },
    },
  )

  return runFn(exampleId, identity)
}

// ── Rate-limit helpers ────────────────────────────────────────────────────────
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
      console.log(`  ⏳ Rate limited ${tag} — waiting 10s before retry...`)
      await new Promise((r) => setTimeout(r, 10_000))
      return fn()
    }
    throw err
  }
}

async function runInBatches<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number,
  delayMs: number,
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map((t) => t()))
    results.push(...batchResults)
    if (i + batchSize < tasks.length) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return results
}

// ── Report helpers ────────────────────────────────────────────────────────────
function avg(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length
}

function pf(score: number): string {
  return score >= PASS_THRESHOLD ? '✅ PASS' : '❌ FAIL'
}

function fmt(n: number): string {
  return n.toFixed(2)
}

function col(s: string, w: number): string {
  return s.slice(0, w).padEnd(w)
}

function printReport(results: ExampleResult[]) {
  const successful = results.filter((r) => !r.error)

  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║           HABIDY PROMPT QUALITY EVALUATION REPORT               ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')
  console.log(`\n  Agent model : ${AGENT_MODEL}`)
  console.log(`  Judge model : ${JUDGE_MODEL}`)
  console.log(`  Dataset     : ${DATASET_NAME}`)
  console.log(`  Examples    : ${results.length} (${successful.length} successful)`)
  console.log(`  Pass threshold: ${PASS_THRESHOLD}`)

  if (successful.length === 0) {
    console.log('\n  No successful runs to report.\n')
    return
  }

  // ── Per-criterion summary ─────────────────────────────────────────────────
  const gScores = {
    specificity:           avg(successful.map((r) => r.gathererScores.specificity)),
    atomic_habits_coverage: avg(successful.map((r) => r.gathererScores.atomic_habits_coverage)),
    vague_user_recovery:   avg(successful.map((r) => r.gathererScores.vague_user_recovery)),
    efficiency:            avg(successful.map((r) => r.gathererScores.efficiency)),
  }
  const aScores = {
    habit_specificity:   avg(successful.map((r) => r.architectScores.habit_specificity)),
    identity_alignment:  avg(successful.map((r) => r.architectScores.identity_alignment)),
    context_utilization: avg(successful.map((r) => r.architectScores.context_utilization)),
  }

  const allGatherer = Object.values(gScores)
  const allArchitect = Object.values(aScores)
  const overallAvg = avg([...allGatherer, ...allArchitect])

  console.log('\n──────────────────────────────────────────────────────────────────')
  console.log('  IDENTITY GATHERER PROMPT')
  console.log('──────────────────────────────────────────────────────────────────')
  console.log(`  ${col('Criterion', 28)} ${col('Score', 8)} Status`)
  console.log(`  ${col('─'.repeat(27), 28)} ${col('─'.repeat(7), 8)} ──────`)
  console.log(`  ${col('SPECIFICITY', 28)} ${col(fmt(gScores.specificity), 8)} ${pf(gScores.specificity)}`)
  console.log(`  ${col('ATOMIC_HABITS_COVERAGE', 28)} ${col(fmt(gScores.atomic_habits_coverage), 8)} ${pf(gScores.atomic_habits_coverage)}`)
  console.log(`  ${col('VAGUE_USER_RECOVERY', 28)} ${col(fmt(gScores.vague_user_recovery), 8)} ${pf(gScores.vague_user_recovery)}`)
  console.log(`  ${col('EFFICIENCY', 28)} ${col(fmt(gScores.efficiency), 8)} ${pf(gScores.efficiency)}`)
  console.log(`  ${col('─'.repeat(27), 28)} ${col('─'.repeat(7), 8)} ──────`)
  console.log(`  ${col('Gatherer average', 28)} ${col(fmt(avg(allGatherer)), 8)} ${pf(avg(allGatherer))}`)

  console.log('\n──────────────────────────────────────────────────────────────────')
  console.log('  ARCHITECT PROMPT')
  console.log('──────────────────────────────────────────────────────────────────')
  console.log(`  ${col('Criterion', 28)} ${col('Score', 8)} Status`)
  console.log(`  ${col('─'.repeat(27), 28)} ${col('─'.repeat(7), 8)} ──────`)
  console.log(`  ${col('HABIT_SPECIFICITY', 28)} ${col(fmt(aScores.habit_specificity), 8)} ${pf(aScores.habit_specificity)}`)
  console.log(`  ${col('IDENTITY_ALIGNMENT', 28)} ${col(fmt(aScores.identity_alignment), 8)} ${pf(aScores.identity_alignment)}`)
  console.log(`  ${col('CONTEXT_UTILIZATION', 28)} ${col(fmt(aScores.context_utilization), 8)} ${pf(aScores.context_utilization)}`)
  console.log(`  ${col('─'.repeat(27), 28)} ${col('─'.repeat(7), 8)} ──────`)
  console.log(`  ${col('Architect average', 28)} ${col(fmt(avg(allArchitect)), 8)} ${pf(avg(allArchitect))}`)

  console.log('\n══════════════════════════════════════════════════════════════════')
  console.log(`  OVERALL PROMPT QUALITY: ${fmt(overallAvg)}  ${pf(overallAvg)}`)
  console.log('══════════════════════════════════════════════════════════════════')

  // ── Per-example breakdown ─────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────────────────────────────')
  console.log('  PER-EXAMPLE BREAKDOWN')
  console.log('──────────────────────────────────────────────────────────────────')
  for (const r of results) {
    const label = r.identity.slice(0, 50)
    if (r.error) {
      console.log(`\n  ✗ "${label}"`)
      console.log(`    ERROR: ${r.error}`)
      continue
    }
    const gAvg = avg(Object.values(r.gathererScores))
    const aAvg = avg(Object.values(r.architectScores))
    const exAvg = avg([gAvg, aAvg])
    console.log(`\n  ${pf(exAvg)} "${label}"`)
    console.log(`    Turns: ${r.turnsUsed}  Summary: ${r.summaryProduced ? 'yes' : 'NO'}  Habits parsed: ${r.habitsParsed ? 'yes' : 'NO'}`)
    console.log(`    Gatherer — spec:${fmt(r.gathererScores.specificity)} ahc:${fmt(r.gathererScores.atomic_habits_coverage)} vur:${fmt(r.gathererScores.vague_user_recovery)} eff:${fmt(r.gathererScores.efficiency)}  avg:${fmt(gAvg)}`)
    console.log(`    Architect — hs:${fmt(r.architectScores.habit_specificity)} ia:${fmt(r.architectScores.identity_alignment)} cu:${fmt(r.architectScores.context_utilization)}  avg:${fmt(aAvg)}`)
  }

  // ── Failing criteria callout ───────────────────────────────────────────────
  const failing: string[] = []
  if (gScores.specificity < PASS_THRESHOLD) failing.push('SPECIFICITY — questions are too generic for the user\'s specific goal')
  if (gScores.atomic_habits_coverage < PASS_THRESHOLD) failing.push('ATOMIC_HABITS_COVERAGE — not surfacing enough habit elements (cue, env, time, 2-min)')
  if (gScores.vague_user_recovery < PASS_THRESHOLD) failing.push('VAGUE_USER_RECOVERY — agent accepts unclear answers instead of probing deeper')
  if (gScores.efficiency < PASS_THRESHOLD) failing.push('EFFICIENCY — too many turns before producing a summary')
  if (aScores.habit_specificity < PASS_THRESHOLD) failing.push('HABIT_SPECIFICITY — habits lack correct cue format or two-minute version')
  if (aScores.identity_alignment < PASS_THRESHOLD) failing.push('IDENTITY_ALIGNMENT — habits don\'t clearly connect to the user\'s identity goal')
  if (aScores.context_utilization < PASS_THRESHOLD) failing.push('CONTEXT_UTILIZATION — Architect ignores specific details from the Gatherer session')

  if (failing.length > 0) {
    console.log('\n──────────────────────────────────────────────────────────────────')
    console.log('  CRITERIA BELOW THRESHOLD — fix these prompts:')
    console.log('──────────────────────────────────────────────────────────────────')
    for (const f of failing) {
      console.log(`  • ${f}`)
    }
  }

  console.log('\n  View traces at https://smith.langchain.com\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set in .env.local')
    process.exit(1)
  }
  if (!process.env.LANGCHAIN_API_KEY) {
    console.warn('LANGCHAIN_API_KEY not set — LangSmith logging disabled')
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const langsmith = new Client()

  // ── Fetch examples from LangSmith dataset ──────────────────────────────────
  console.log(`\nFetching examples from dataset: "${DATASET_NAME}"...`)
  const exampleList: Array<{ id: string; inputs: Record<string, unknown> }> = []
  try {
    for await (const example of langsmith.listExamples({ datasetName: DATASET_NAME })) {
      exampleList.push({
        id: String(example.id ?? ''),
        inputs: (example.inputs ?? {}) as Record<string, unknown>,
      })
    }
  } catch (err) {
    console.error(`Failed to load dataset "${DATASET_NAME}":`, err)
    console.error('Make sure LANGCHAIN_API_KEY is set and the dataset exists.')
    process.exit(1)
  }

  if (exampleList.length === 0) {
    console.error(`Dataset "${DATASET_NAME}" is empty or not found.`)
    process.exit(1)
  }

  console.log(`  Loaded ${exampleList.length} examples`)
  console.log(`  Agent model : ${AGENT_MODEL}`)
  console.log(`  Judge model : ${JUDGE_MODEL}`)
  console.log(`  User sim    : ${USER_SIM_MODEL} (vague persona)`)
  console.log(`  Batch size  : ${BATCH_SIZE} concurrent`)
  console.log(`  LangSmith project: ${process.env.LANGCHAIN_PROJECT ?? '(default)'}`)
  console.log('\nRunning evaluations...\n')

  const globalStart = Date.now()

  const tasks = exampleList.map((ex, i) => {
    const identity = extractIdentity(ex.inputs)
    const tag = `[ex${i + 1}/${exampleList.length}]`
    return () =>
      withRetry(() => {
        console.log(`  Running ${tag} "${identity.slice(0, 45)}..."`)
        return runExample(client, ex.id, identity)
      }, tag)
  })

  const results = await runInBatches(tasks, BATCH_SIZE, BATCH_DELAY_MS)

  const elapsed = ((Date.now() - globalStart) / 1000).toFixed(1)
  const succeeded = results.filter((r) => !r.error).length
  console.log(`\nAll runs complete in ${elapsed}s — ✓ ${succeeded}/${results.length} succeeded`)

  printReport(results)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
