# Eval: Architect vague identity → follow-up, never HABITS_READY
Date: 2026-05-13
Type: EVAL (live API calls — claude-haiku-4-5-20251001)

## Result: PASS — 3/3 cases

## Cases tested

### Case 1: "I want to be better"
First message: "Hi, I want to start building some habits."
Reply excerpt: "Great, Alex! I'd love to help you design habits that stick. Since your goal is to 'be better,' I want to understand wha..."
- HABITS_READY: ❌ absent ✅
- Clarifying question: ✅ present
- Result: ✅ PASS

### Case 2: "I want to improve myself"
First message: "I'm ready to get started."
Reply excerpt: "Great to meet you, Alex! I'd love to design habits that actually stick for you. Let me start with a foundational questi..."
- HABITS_READY: ❌ absent ✅
- Clarifying question: ✅ present
- Result: ✅ PASS

### Case 3: "I just want to be a good person and do well in life"
First message: "I don't really know where to begin."
Reply excerpt: "I hear you — that's actually a great starting point. 'Being a good person and doing well' means different things to diff..."
- HABITS_READY: ❌ absent ✅
- Clarifying question: ✅ present
- Result: ✅ PASS

## Why it works
`buildArchitectSystemPrompt({ hasCrystalBallNotes: false })` produces:
> "No Crystal Ball notes present. Use 3–4 focused questions to understand identity, behaviors, and a specific cue before generating."

The WRAP_UP_AT=3 forced-generation override only fires when turnsRemaining ≤ 3 (i.e., 17+ turns in),
so it cannot trigger on the first reply.

## Eval script
`evals/vague-identity-eval.ts` — reusable, run with `npx tsx evals/vague-identity-eval.ts`
Raw JSON results in `.claude/eval-results/eval-architect-vague-identity.json`
