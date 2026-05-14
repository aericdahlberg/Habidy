/**
 * Sprint eval: Architect vague identity → follow-up, never HABITS_READY
 * Tests that a vague identity_goal triggers a clarifying question, not HABITS_READY.
 * Run: npx ts-node --project tsconfig.json evals/vague-identity-eval.ts
 */
import * as fs from 'fs'
import * as path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { buildArchitectSystemPrompt, buildArchitectUserContext } from '../lib/agents/architect.ts'
import type { ArchitectContext } from '../lib/agents/architect.ts'

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.resolve(__dirname, '..', name)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const k = t.slice(0, eq).trim()
      const v = t.slice(eq + 1).trim()
      if (!process.env[k]) process.env[k] = v
    }
  }
}

const VAGUE_CASES: { identity: string; firstMessage: string }[] = [
  {
    identity: 'I want to be better',
    firstMessage: 'Hi, I want to start building some habits.',
  },
  {
    identity: 'I want to improve myself',
    firstMessage: "I'm ready to get started.",
  },
  {
    identity: 'I just want to be a good person and do well in life',
    firstMessage: "I don't really know where to begin.",
  },
]

async function runCase(
  client: Anthropic,
  vague: string,
  firstMessage: string,
  caseNum: number,
): Promise<{ pass: boolean; identity: string; reply: string; reason: string }> {
  const ctx: ArchitectContext = {
    userName: 'Alex',
    identityStatement: vague,
    goalCategory: '',
    frictionPoint: '',
    timeAvailable: '',
    crystalBallSummary: '',
    profileContext: null,
    calendarContext: null,
  }

  const systemPrompt = buildArchitectSystemPrompt({ hasCrystalBallNotes: false })
  const contextBlock = buildArchitectUserContext(ctx, null)

  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      { role: 'user', content: contextBlock },
      { role: 'user', content: firstMessage },
    ],
  })

  const reply = res.content[0].type === 'text' ? res.content[0].text : ''
  const hasHabitsReady = /HABITS_READY:/.test(reply)
  const hasQuestion = reply.includes('?')

  let pass = !hasHabitsReady && hasQuestion
  let reason = pass
    ? 'Asked clarifying question, no HABITS_READY'
    : hasHabitsReady
      ? 'FAIL — HABITS_READY appeared in first reply'
      : 'FAIL — No clarifying question found'

  console.log(`\nCase ${caseNum}: "${vague}"`)
  console.log(`  First message: "${firstMessage}"`)
  console.log(`  Reply excerpt: ${reply.slice(0, 120).replace(/\n/g, ' ')}...`)
  console.log(`  HABITS_READY present: ${hasHabitsReady}`)
  console.log(`  Has question: ${hasQuestion}`)
  console.log(`  Result: ${pass ? '✅ PASS' : '❌ FAIL'} — ${reason}`)

  return { pass, identity: vague, reply, reason }
}

async function main() {
  loadEnv()
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set')
    process.exit(1)
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  console.log('Eval: Architect vague identity → follow-up, never HABITS_READY')
  console.log('Model: claude-haiku-4-5-20251001 (fast, deterministic-enough for structure checks)')
  console.log('─'.repeat(60))

  const results = []
  for (let i = 0; i < VAGUE_CASES.length; i++) {
    const { identity, firstMessage } = VAGUE_CASES[i]
    const result = await runCase(client, identity, firstMessage, i + 1)
    results.push(result)
  }

  const passed = results.filter(r => r.pass).length
  console.log('\n' + '─'.repeat(60))
  console.log(`\nFinal: ${passed}/${results.length} cases passed`)

  const output = {
    date: new Date().toISOString().slice(0, 10),
    card: 'Eval: Architect vague identity → follow-up, never HABITS_READY',
    model: 'claude-haiku-4-5-20251001',
    passed,
    total: results.length,
    cases: results.map(r => ({ identity: r.identity, pass: r.pass, reason: r.reason })),
  }

  const outPath = path.resolve(__dirname, '../.claude/eval-results/eval-architect-vague-identity.json')
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))
  console.log(`\nResults written to .claude/eval-results/eval-architect-vague-identity.json`)

  process.exit(passed === results.length ? 0 : 1)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})