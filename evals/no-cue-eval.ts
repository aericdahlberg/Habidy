/**
 * Sprint eval: Architect no cue → don't advance to HABITS_READY
 * Tests that Architect asks for a cue (existing routine anchor) before generating.
 * Run: npx tsx evals/no-cue-eval.ts
 */
import * as fs from 'fs'
import * as path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { buildArchitectSystemPrompt, buildArchitectUserContext } from '../lib/agents/architect'

type Msg = { role: 'user' | 'assistant'; content: string }

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

// Cases: clear identity but no cue provided.
// Each case is a conversation (list of user turns). We check every assistant reply.
const CASES: {
  label: string
  identity: string
  userTurns: string[]
}[] = [
  {
    label: 'Clear identity, no routine anchor — single turn',
    identity: 'I want to be a writer. In a year I see myself finishing my first novel.',
    userTurns: [
      "I know what I want — I just need to make writing a daily habit. I'm ready.",
    ],
  },
  {
    label: 'Clear identity, vague effort — single turn',
    identity: 'I want to become someone who meditates daily and stays calm under pressure.',
    userTurns: [
      "I've tried meditating before but I always forget. I want to make it stick this time.",
    ],
  },
  {
    label: 'Clear identity + 2 turns, still no cue given',
    identity: 'I want to be a runner. I want to run 5k three times a week.',
    userTurns: [
      'I want to run every day, I just struggle to get started.',
      // Second turn: gives motivation context but still no existing routine as anchor
      "I'm most motivated in the evenings, but honestly it depends on my mood.",
    ],
  },
]

async function runCase(
  client: Anthropic,
  systemPrompt: string,
  contextBlock: string,
  userTurns: string[],
  label: string,
  caseNum: number,
): Promise<{ pass: boolean; label: string; failedAtTurn: number | null; reason: string }> {
  const messages: Msg[] = []

  for (let t = 0; t < userTurns.length; t++) {
    messages.push({ role: 'user', content: userTurns[t] })

    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: [
        { role: 'user', content: contextBlock },
        ...messages,
      ],
    })

    const reply = res.content[0].type === 'text' ? res.content[0].text : ''
    messages.push({ role: 'assistant', content: reply })

    const hasHabitsReady = /HABITS_READY:/.test(reply)

    if (hasHabitsReady) {
      console.log(`\nCase ${caseNum}: ${label}`)
      console.log(`  ❌ FAIL — HABITS_READY appeared at turn ${t + 1} (no cue had been given)`)
      console.log(`  Reply excerpt: ${reply.slice(0, 120).replace(/\n/g, ' ')}...`)
      return { pass: false, label, failedAtTurn: t + 1, reason: `HABITS_READY at turn ${t + 1} without cue` }
    }

    console.log(`\nCase ${caseNum} turn ${t + 1}: "${userTurns[t].slice(0, 60)}..."`)
    console.log(`  Reply: ${reply.slice(0, 100).replace(/\n/g, ' ')}...`)
    console.log(`  HABITS_READY: absent ✅  | Has question: ${reply.includes('?') ? '✅' : '⚠️ no ?'}`)
  }

  console.log(`  Result: ✅ PASS — no HABITS_READY across ${userTurns.length} turn(s)`)
  return { pass: true, label, failedAtTurn: null, reason: `No HABITS_READY across ${userTurns.length} turns, cue not yet established` }
}

async function main() {
  loadEnv()
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set')
    process.exit(1)
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  console.log('Eval: Architect no cue → don\'t advance to HABITS_READY')
  console.log('Model: claude-haiku-4-5-20251001')
  console.log('─'.repeat(60))

  const results = []
  for (let i = 0; i < CASES.length; i++) {
    const { label, identity, userTurns } = CASES[i]

    const ctx = {
      userName: 'Alex',
      identityStatement: identity,
      goalCategory: '',
      frictionPoint: '',
      timeAvailable: '',
      crystalBallSummary: '',
      profileContext: null,
      calendarContext: null,
    }

    const systemPrompt = buildArchitectSystemPrompt({ hasCrystalBallNotes: false })
    const contextBlock = buildArchitectUserContext(ctx, null)

    const result = await runCase(client, systemPrompt, contextBlock, userTurns, label, i + 1)
    results.push(result)
  }

  const passed = results.filter(r => r.pass).length
  console.log('\n' + '─'.repeat(60))
  console.log(`\nFinal: ${passed}/${results.length} cases passed`)

  const output = {
    date: new Date().toISOString().slice(0, 10),
    card: 'Eval: Architect no cue → don\'t advance to HABITS_READY',
    model: 'claude-haiku-4-5-20251001',
    passed,
    total: results.length,
    cases: results.map(r => ({ label: r.label, pass: r.pass, reason: r.reason })),
  }

  const outPath = path.resolve(__dirname, '../.claude/eval-results/eval-architect-no-cue.json')
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))
  console.log(`\nResults written to .claude/eval-results/eval-architect-no-cue.json`)

  process.exit(passed === results.length ? 0 : 1)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
