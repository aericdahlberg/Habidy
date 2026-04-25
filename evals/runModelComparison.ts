import * as fs from 'fs'
import * as path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { traceable } from 'langsmith/traceable'
import { buildIdentityGathererSystemPrompt } from '../lib/agents/constellation'
import { buildArchitectSystemPrompt, extractHabitsFromMessage } from '../lib/agents/architect'

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
const MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  // 'claude-opus-4-6',
] as const

type Model = typeof MODELS[number]

function shortModel(model: string): string {
  if (model.includes('haiku')) return 'haiku'
  if (model.includes('sonnet')) return 'sonnet'
  if (model.includes('opus')) return 'opus'
  return model.split('-').pop() ?? model
}

const JUDGE_MODEL: Model = 'claude-sonnet-4-6'

const IDENTITIES = [
  'I want to be someone who reads every day',
  'I want to be someone who works out consistently',
  'I want to be someone who is less stressed',
]

const PERSONAS = ['engaged', 'vague', 'distracted'] as const
type Persona = typeof PERSONAS[number]

const PERSONA_DESCRIPTIONS: Record<Persona, string> = {
  engaged:
    'engaged — you give clear, detailed responses of 2-3 sentences, you know what you want, e.g. "I usually watch TV after dinner around 9pm, I\'ve tried reading before but always forget"',
  vague:
    'vague — you give short, unclear responses of 1 sentence, you\'re not sure what you want, often off-topic, e.g. "I dunno, just whenever I guess"',
  distracted:
    'distracted — your responses are inconsistent, sometimes detailed, sometimes one word, occasionally off-topic, e.g. "yeah maybe mornings? actually no evenings are better. idk"',
}

const MAX_TURNS = 10

// ── Types ─────────────────────────────────────────────────────────────────────
type Message = { role: 'user' | 'assistant'; content: string }

type InvestigationScores = {
  question_quality: number
  atomic_habits_coverage: number
  vague_user_handling: number | null
  efficiency: number
}

type ArchitectScores = {
  habit_output_quality: number
  identity_alignment: number
  information_utilization: number
}

type InvestigationResult = {
  model: Model
  identity: string
  persona: Persona
  turns: number
  tokens: number
  durationMs: number
  conversation: Message[]
  summary: string | null
  scores: InvestigationScores
  error: string | null
}

type ArchitectResult = {
  model: Model
  identity: string
  persona: Persona
  tokens: number
  durationMs: number
  habitOutput: string
  scores: ArchitectScores
  error: string | null
}

// ── Simulate one user message ─────────────────────────────────────────────────
async function simulateUserMessage(
  client: Anthropic,
  identity: string,
  persona: Persona,
  conversationSoFar: Message[],
): Promise<string> {
  const systemPrompt = `You are a real person using a habit app. Your identity goal is: "${identity}".
Respond as a ${PERSONA_DESCRIPTIONS[persona]} user.
Keep it realistic — you are on your phone, not writing an essay.
Only respond as the user. Never break character.`

  const messages: Anthropic.MessageParam[] = [
    ...conversationSoFar.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    {
      role: 'user' as const,
      content: 'What do you say next? (respond only with your message, no quotes or labels)',
    },
  ]

  // Flip perspective: the agent messages become "user" history for the simulator
  // so it understands what questions were asked
  const flipped: Anthropic.MessageParam[] = conversationSoFar.map((m) => ({
    role: m.role === 'user' ? ('assistant' as const) : ('user' as const),
    content: m.content,
  }))

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', // cheap model for user simulation
    max_tokens: 200,
    system: systemPrompt,
    messages:
      flipped.length === 0
        ? [{ role: 'user', content: 'The agent just greeted you and asked their first question. What do you say?' }]
        : [
            ...flipped,
            { role: 'user', content: 'What do you say next?' },
          ],
  })

  return response.content[0].type === 'text' ? response.content[0].text.trim() : ''
}

// ── Run Investigation Agent conversation ──────────────────────────────────────
async function runInvestigation(
  client: Anthropic,
  model: Model,
  identity: string,
  persona: Persona,
): Promise<{ conversation: Message[]; summary: string | null; tokens: number }> {
  const systemPrompt = buildIdentityGathererSystemPrompt({
    userName: 'Friend',
    identityStatement: identity,
    profileContext: null,
  })

  const messages: Message[] = []
  let totalTokens = 0
  let summary: string | null = null
  const SUMMARY_MARKER = 'IDENTITY_GATHERER_SUMMARY:'

  // Get opening message from agent (0 user turns)
  const opening = await client.messages.create({
    model,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: 'Hello' }],
  })
  totalTokens += opening.usage.input_tokens + opening.usage.output_tokens
  const openingText = opening.content[0].type === 'text' ? opening.content[0].text : ''
  messages.push({ role: 'user', content: 'Hello' })
  messages.push({ role: 'assistant', content: openingText })

  // Simulate turns
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const userText = await simulateUserMessage(client, identity, persona, messages)
    messages.push({ role: 'user', content: userText })

    const agentResponse = await client.messages.create({
      model,
      max_tokens: 512,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })
    totalTokens += agentResponse.usage.input_tokens + agentResponse.usage.output_tokens

    const agentText =
      agentResponse.content[0].type === 'text' ? agentResponse.content[0].text : ''
    messages.push({ role: 'assistant', content: agentText })

    const markerIdx = agentText.indexOf(SUMMARY_MARKER)
    if (markerIdx !== -1) {
      summary = agentText.slice(markerIdx + SUMMARY_MARKER.length).trim()
      break
    }
  }

  return { conversation: messages, summary, tokens: totalTokens }
}

// ── Run Architect Agent ───────────────────────────────────────────────────────
async function runArchitect(
  client: Anthropic,
  model: Model,
  identity: string,
  summary: string,
): Promise<{ habitOutput: string; tokens: number }> {
  const systemPrompt = buildArchitectSystemPrompt({
    userName: 'Friend',
    identityStatement: identity,
    goalCategory: '',
    timeAvailable: '15 minutes',
    crystalBallSummary: summary,
    profileContext: null,
  })

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content:
          'Based on everything you know about me, please build my habits now.',
      },
    ],
  })

  const tokens = response.usage.input_tokens + response.usage.output_tokens
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return { habitOutput: text, tokens }
}

// ── Judge: score a value 0-1 ──────────────────────────────────────────────────
async function judge(
  client: Anthropic,
  prompt: string,
): Promise<number> {
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

// ── Score Investigation ───────────────────────────────────────────────────────
async function scoreInvestigation(
  client: Anthropic,
  conversation: Message[],
  identity: string,
  persona: Persona,
  summary: string | null,
): Promise<InvestigationScores> {
  const transcript = conversation
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  const userTurns = conversation.filter((m) => m.role === 'user').length

  const [question_quality, atomic_habits_coverage, efficiency] = await Promise.all([
    judge(
      client,
      `Rate the QUESTION QUALITY of this habit investigator conversation (0-1).
Penalize for: stacked questions, generic questions, repeating what the user already said, or questions that don't help build a habit.
Reward for: specific, focused, single questions that build on prior answers.

CONVERSATION:
${transcript}

Score 0-1:`,
    ),
    judge(
      client,
      `Rate ATOMIC HABITS COVERAGE (0-1) for this conversation.
Count how many of these 6 elements were surfaced by the end:
1. Cue ("After X..." trigger)
2. Environment or physical context
3. Time of day
4. Energy level or motivation factor
5. Two-minute version possibility
6. Identity connection ("I am someone who...")

Score = elements found / 6. Be strict — vague mentions don't count.

CONVERSATION:
${transcript}

Score 0-1:`,
    ),
    judge(
      client,
      `Rate EFFICIENCY (0-1) for this habit investigator.
1.0 = gathered all key habit info (cue, environment, motivation, two-minute version) in 6 or fewer user turns
0.5 = gathered most key info in 7-9 user turns
0.0 = hit the turn limit (10 turns) without gathering the key info

This conversation had ${userTurns} user turns.
Summary produced: ${summary ? 'YES' : 'NO'}

CONVERSATION:
${transcript}

Score 0-1:`,
    ),
  ])

  let vague_user_handling: number | null = null
  if (persona === 'vague' || persona === 'distracted') {
    vague_user_handling = await judge(
      client,
      `Rate VAGUE USER HANDLING (0-1) for this conversation.
The user was giving unclear, short, or inconsistent answers.
Did the agent successfully draw out useful information despite that? Or did it accept vague responses and move on?
1.0 = agent consistently probed and drew out specific details despite vagueness
0.0 = agent accepted vague answers and produced a generic or empty output

CONVERSATION:
${transcript}

Score 0-1:`,
    )
  }

  return { question_quality, atomic_habits_coverage, vague_user_handling, efficiency }
}

// ── Score Architect ───────────────────────────────────────────────────────────
async function scoreArchitect(
  client: Anthropic,
  habitOutput: string,
  identity: string,
  summary: string,
): Promise<ArchitectScores> {
  const [habit_output_quality, identity_alignment, information_utilization] = await Promise.all([
    judge(
      client,
      `Rate HABIT OUTPUT QUALITY (0-1).
Is the habit specific, actionable, and realistic?
Does the cue follow exactly "After X, I will Y at Z" format?
Is the two-minute version genuinely small (under 2 minutes)?

HABIT OUTPUT:
${habitOutput}

Score 0-1:`,
    ),
    judge(
      client,
      `Rate IDENTITY ALIGNMENT (0-1).
Identity goal: "${identity}"
Does this habit output clearly help the user become that person?
1.0 = directly and specifically connected to the identity
0.0 = generic habit that could apply to anyone

HABIT OUTPUT:
${habitOutput}

Score 0-1:`,
    ),
    judge(
      client,
      `Rate INFORMATION UTILIZATION (0-1).
Does the habit output reflect the SPECIFIC details gathered in the investigation summary below?
Or is it generic advice that ignores the conversation context?
1.0 = habit is clearly tailored to the specific person, environment, and cue from the conversation
0.0 = generic habit that ignores the gathered details

INVESTIGATION SUMMARY:
${summary}

HABIT OUTPUT:
${habitOutput}

Score 0-1:`,
    ),
  ])

  return { habit_output_quality, identity_alignment, information_utilization }
}

// ── Full run: investigation + architect for one combination ───────────────────
async function runCombination(
  client: Anthropic,
  model: Model,
  identity: string,
  persona: Persona,
): Promise<{ investigation: InvestigationResult; architect: ArchitectResult }> {
  const tag = `[${shortModel(model)} / ${persona} / ${identity.slice(0, 30)}]`

  // ── Investigation ───────────────────────────────────────
  const investigationRun = traceable(
    async (): Promise<InvestigationResult> => {
      const start = Date.now()
      try {
        const { conversation, summary, tokens } = await runInvestigation(
          client, model, identity, persona,
        )
        const scores = await scoreInvestigation(client, conversation, identity, persona, summary)
        console.log(`  ✓ Investigation ${tag}`)
        return {
          model, identity, persona,
          turns: conversation.filter((m) => m.role === 'user').length,
          tokens, durationMs: Date.now() - start,
          conversation, summary, scores, error: null,
        }
      } catch (err) {
        console.log(`  ✗ Investigation ${tag}: ${err}`)
        return {
          model, identity, persona, turns: 0, tokens: 0,
          durationMs: Date.now() - start,
          conversation: [], summary: null,
          scores: { question_quality: 0, atomic_habits_coverage: 0, vague_user_handling: null, efficiency: 0 },
          error: err instanceof Error ? err.message : String(err),
        }
      }
    },
    {
      name: `investigation__${shortModel(model)}__${persona}`,
      run_type: 'chain',
      tags: ['habidy', 'model-comparison', 'investigation', shortModel(model), persona],
      metadata: { agent: 'investigation', model, persona, identity },
    },
  )

  const investigation = await investigationRun()

  // ── Architect (uses investigation summary) ──────────────
  const architectRun = traceable(
    async (): Promise<ArchitectResult> => {
      const start = Date.now()
      const summaryInput = investigation.summary ?? `Identity: ${identity}. Limited context available.`
      try {
        const { habitOutput, tokens } = await runArchitect(client, model, identity, summaryInput)
        const scores = await scoreArchitect(client, habitOutput, identity, summaryInput)
        console.log(`  ✓ Architect   ${tag}`)
        return {
          model, identity, persona, tokens,
          durationMs: Date.now() - start,
          habitOutput, scores, error: null,
        }
      } catch (err) {
        console.log(`  ✗ Architect   ${tag}: ${err}`)
        return {
          model, identity, persona, tokens: 0,
          durationMs: Date.now() - start,
          habitOutput: '',
          scores: { habit_output_quality: 0, identity_alignment: 0, information_utilization: 0 },
          error: err instanceof Error ? err.message : String(err),
        }
      }
    },
    {
      name: `architect__${shortModel(model)}__${persona}`,
      run_type: 'chain',
      tags: ['habidy', 'model-comparison', 'architect', shortModel(model), persona],
      metadata: { agent: 'architect', model, persona, identity },
    },
  )

  const architect = await architectRun()
  return { investigation, architect }
}

// ── Table helpers ─────────────────────────────────────────────────────────────
function col(s: string, w: number) {
  return s.slice(0, w).padEnd(w)
}

function fmt(n: number | null) {
  return n === null ? ' -- ' : n.toFixed(2)
}

function avg(nums: (number | null)[]): number {
  const valid = nums.filter((n): n is number => n !== null)
  return valid.length === 0 ? 0 : valid.reduce((a, b) => a + b, 0) / valid.length
}

// ── Dynamic table rendering ───────────────────────────────────────────────────
const COL_LABEL = 26
const COL_MODEL = 9

function tableHeader(labels: string[]): string {
  const last = labels[labels.length - 1]
  const rest = labels.slice(0, -1)
  return col('', COL_LABEL) + '| ' + rest.map((l) => col(l, COL_MODEL) + '| ').join('') + last
}

function tableSep(modelCount: number): string {
  return '─'.repeat(COL_LABEL) + ('+-' + '─'.repeat(COL_MODEL)).repeat(modelCount)
}

function tableRow(label: string, values: (number | null)[]): string {
  const last = fmt(values[values.length - 1])
  const rest = values.slice(0, -1)
  return col(label, COL_LABEL) + '| ' + rest.map((v) => col(fmt(v), COL_MODEL) + '| ').join('') + last
}

function printInvestigationTable(results: InvestigationResult[]) {
  const modelLabels = MODELS.map(shortModel)

  const score = (model: Model, key: keyof InvestigationScores) =>
    avg(results.filter((r) => r.model === model).map((r) => r.scores[key]))

  const personaAvg = (model: Model, persona: Persona) => {
    const runs = results.filter((r) => r.model === model && r.persona === persona)
    const allScores = runs.flatMap((r) => {
      const vals: number[] = [r.scores.question_quality, r.scores.atomic_habits_coverage, r.scores.efficiency]
      if (r.scores.vague_user_handling !== null) vals.push(r.scores.vague_user_handling)
      return vals
    })
    return avg(allScores)
  }

  const overallAvg = (model: Model) =>
    avg(results.filter((r) => r.model === model).flatMap((r) => {
      const vals: number[] = [r.scores.question_quality, r.scores.atomic_habits_coverage, r.scores.efficiency]
      if (r.scores.vague_user_handling !== null) vals.push(r.scores.vague_user_handling)
      return vals
    }))

  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║          INVESTIGATION AGENT (Identity Gatherer) RESULTS     ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  console.log(tableHeader(modelLabels))
  console.log(tableSep(MODELS.length))

  const criteriaRows: [string, keyof InvestigationScores][] = [
    ['Question Quality', 'question_quality'],
    ['Atomic Habits Coverage', 'atomic_habits_coverage'],
    ['Vague User Handling', 'vague_user_handling'],
    ['Efficiency', 'efficiency'],
  ]
  for (const [label, key] of criteriaRows) {
    console.log(tableRow(label, MODELS.map((m) => score(m, key))))
  }

  console.log(tableSep(MODELS.length))
  console.log(tableRow('AVERAGE', MODELS.map(overallAvg)))

  console.log('\n' + tableHeader(modelLabels))
  console.log(tableSep(MODELS.length))
  for (const persona of PERSONAS) {
    console.log(tableRow(`${persona} user avg`, MODELS.map((m) => personaAvg(m, persona))))
  }
}

function printArchitectTable(results: ArchitectResult[]) {
  const modelLabels = MODELS.map(shortModel)

  const score = (model: Model, key: keyof ArchitectScores) =>
    avg(results.filter((r) => r.model === model).map((r) => r.scores[key]))

  const overallAvg = (model: Model) =>
    avg(results.filter((r) => r.model === model).flatMap((r) =>
      [r.scores.habit_output_quality, r.scores.identity_alignment, r.scores.information_utilization],
    ))

  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║                   ARCHITECT AGENT RESULTS                    ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  console.log(tableHeader(modelLabels))
  console.log(tableSep(MODELS.length))

  const criteriaRows: [string, keyof ArchitectScores][] = [
    ['Habit Output Quality', 'habit_output_quality'],
    ['Identity Alignment', 'identity_alignment'],
    ['Information Utilization', 'information_utilization'],
  ]
  for (const [label, key] of criteriaRows) {
    console.log(tableRow(label, MODELS.map((m) => score(m, key))))
  }

  console.log(tableSep(MODELS.length))
  console.log(tableRow('AVERAGE', MODELS.map(overallAvg)))
}

// ── Retry wrapper for 429 rate limit errors ───────────────────────────────────
function is429(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes('429') || err.message.toLowerCase().includes('rate limit')
  }
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

// ── Batched executor ──────────────────────────────────────────────────────────
async function runInBatches<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number,
  delayMs: number,
  onBatchComplete: (completed: number, total: number, batchNum: number, totalBatches: number) => void,
): Promise<T[]> {
  const results: T[] = []
  const totalBatches = Math.ceil(tasks.length / batchSize)

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1
    const batch = tasks.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map((t) => t()))
    results.push(...batchResults)

    onBatchComplete(results.length, tasks.length, batchNum, totalBatches)

    if (i + batchSize < tasks.length) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  return results
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set')
    process.exit(1)
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const total = IDENTITIES.length * PERSONAS.length * MODELS.length
  const BATCH_SIZE = 5
  const BATCH_DELAY_MS = 2_000
  const totalBatches = Math.ceil(total / BATCH_SIZE)

  console.log(`\nHabidy Model Comparison Eval`)
  console.log(`  ${IDENTITIES.length} identities × ${PERSONAS.length} personas × ${MODELS.length} models = ${total} combinations`)
  console.log(`  2 agents per combination = ${total * 2} total traces`)
  console.log(`  Batch size: ${BATCH_SIZE} concurrent  |  Delay: ${BATCH_DELAY_MS / 1000}s between batches`)
  console.log(`  Judge model: ${JUDGE_MODEL}`)
  console.log(`  LangSmith project: ${process.env.LANGCHAIN_PROJECT ?? '(default)'}`)
  console.log(`\nRunning in ${totalBatches} batches...\n`)

  const globalStart = Date.now()
  let succeeded = 0
  let failed = 0

  const tasks = IDENTITIES.flatMap((identity) =>
    PERSONAS.flatMap((persona) =>
      MODELS.map((model) => {
        const tag = `[${shortModel(model)} / ${persona} / ${identity.slice(0, 25)}]`
        return () => withRetry(() => runCombination(client, model, identity, persona), tag)
      }),
    ),
  )

  const allResults = await runInBatches(
    tasks,
    BATCH_SIZE,
    BATCH_DELAY_MS,
    (completed, total, batchNum, totalBatches) => {
      const elapsed = (Date.now() - globalStart) / 1000
      const rate = completed / elapsed
      const remaining = total - completed
      const etaSec = rate > 0 ? Math.round(remaining / rate) : 0
      const etaStr = etaSec > 60
        ? `${Math.floor(etaSec / 60)}m ${etaSec % 60}s`
        : `${etaSec}s`

      succeeded = allResults.filter((r) => !r.investigation.error && !r.architect.error).length
      failed = completed - succeeded

      console.log(
        `  Batch ${batchNum}/${totalBatches} complete` +
        ` — ${completed}/${total} runs` +
        ` | ✓ ${succeeded} succeeded  ✗ ${failed} failed` +
        ` | ETA ${etaStr}`,
      )
    },
  )

  succeeded = allResults.filter((r) => !r.investigation.error && !r.architect.error).length
  failed = total - succeeded

  const totalSec = ((Date.now() - globalStart) / 1000).toFixed(1)
  console.log(`\nAll runs complete in ${totalSec}s — ✓ ${succeeded} succeeded  ✗ ${failed} failed`)

  const investigations = allResults.map((r) => r.investigation)
  const architects = allResults.map((r) => r.architect)

  printInvestigationTable(investigations)
  printArchitectTable(architects)

  console.log('\nView traces at https://smith.langchain.com\n')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
