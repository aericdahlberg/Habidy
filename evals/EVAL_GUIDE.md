# EVAL_GUIDE.md — Habidy Agent Evaluation Guide

## Quick Start

Always start with the smallest test first:

```bash
# Smallest run: 4 model calls (1 mode × 1 persona × 4 models)
npx tsx evals/agentEval.ts --mode guided --persona moderate

# One mode, all personas: 12 model calls
npx tsx evals/agentEval.ts --mode guided --persona all
npx tsx evals/agentEval.ts --mode depth --persona all

# Full matrix: 48 LangSmith traces (~15-30 min depending on rate limits)
npx tsx evals/agentEval.ts --mode all --persona all

# Via npm script
npm run eval:agents -- --mode guided --persona moderate
```

---

## Required Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✓ | Used for all Anthropic models, judge, and user simulator |
| `OPENAI_API_KEY` | for GPT runs | Only needed if testing gpt-4o / gpt-4o-mini |
| `LANGCHAIN_API_KEY` | optional | LangSmith tracing. Runs still work without it |
| `LANGCHAIN_PROJECT` | optional | Group traces under a named project |
| `LANGCHAIN_TRACING_V2` | optional | Set `true` to enable LangSmith |

All vars are loaded from `.env` (with `.env.local` fallback).

---

## What This Eval Tests

### 3 agents compared across 4 models:
- `claude-haiku-4-5-20251001`
- `claude-sonnet-4-6`
- `gpt-4o-mini`
- `gpt-4o`

### 3 user personas (simulated by haiku):
| Persona | Behavior | What it tests |
|---|---|---|
| `expressive` | 2–4 sentences, specific details, volunteers context | Best-case user — does the agent stay concise and on-track? |
| `moderate` | 1–2 sentences, cooperative, doesn't volunteer | Typical user — does the agent probe effectively? |
| `uninterested` | Under 5 words, vague ("idk", "maybe") | Hard case — does the agent draw out useful info? |

### 2 investigator modes:
| Mode | Max turns | Focus |
|---|---|---|
| `guided` | 5 | Efficient coverage of 5 key habit elements |
| `depth` | 15 | Deep identity exploration + emotional stakes |

### Fixed roles (never vary):
- **Judge:** `claude-sonnet-4-6` — scores all LLM-judged criteria
- **User simulator:** `claude-haiku-4-5-20251001` — always cheap, always haiku

---

## Score Thresholds

| Range | Meaning | Action |
|---|---|---|
| ≥ 0.8 | Ship it | No changes needed |
| 0.6–0.8 | Improve | Targeted prompt edit |
| < 0.6 | Rewrite | The prompt has a structural problem |

---

## Guided Mode Criteria (5)

### 1. Question Specificity
**What it measures:** Are the agent's questions tailored to THIS user's identity and focus, or could they be copy-pasted to any user?

**High score (0.8+):** Every question references the user's specific goal (e.g. if they want to run, asks about their current running routine and existing morning behaviors).

**Low score (<0.6):** Questions like "What's your goal?" or "What's been getting in the way?" that work for any user.

**Which prompt to edit:** `buildGuidedSystemPrompt()` in `lib/agents/constellation.ts` — strengthen the instruction to reference `onboarding.identity` and `onboarding.goalCategory` explicitly in questions.

---

### 2. Atomic Habits Coverage
**What it measures:** How many of the 7 core habit elements were surfaced: cue, environment, time of day, energy level, two-minute version, reward, craving. Score = found / 7.

**High score (0.8+):** At least 5–6 of the 7 elements were meaningfully explored.

**Low score (<0.6):** Agent focused only on identity/motivation and missed concrete habit-building elements.

**Which prompt to edit:** Both `buildGuidedSystemPrompt()` and `buildDeepSystemPrompt()` — add an explicit checklist of the 7 elements the agent must uncover before wrapping up.

---

### 3. Question Sharpness
**What it measures:** Are agent messages concise (under 3 sentences) and warm without filler?

**High score (0.8+):** Short, precise questions with no "Great!", "That's wonderful!", or multi-paragraph preambles.

**Low score (<0.6):** Agent messages are consistently long, preachy, or use generic affirmations before getting to the question.

**Which prompt to edit:** Add to any system prompt: "RULE: Every message must be under 3 sentences. No affirmations or filler words before your question."

---

### 4. Vague User Handling
**What it measures:** When the user gives vague or short answers ("idk", "maybe"), does the agent probe to extract useful specifics?

**High score (0.8+):** Agent consistently rephrases or offers examples when the user is vague ("When you say you're busy, is that more of a time thing or an energy thing?").

**Low score (<0.6):** Agent accepts vague answers and moves to the next question, producing a summary with blanks.

**Which prompt to edit:** Add to any system prompt: "If the user gives a vague answer, rephrase with a concrete example or give them 2 options to choose from. Never accept 'I don't know' as a final answer."

---

### 5. Efficiency (Guided)
**What it measures:** Did the agent produce a complete summary within the turn limit?

**Scoring (deterministic — no LLM judge):**
- ≤5 turns → 1.0
- ≤7 turns → 0.75
- ≤9 turns → 0.5
- >9 turns → 0.0

**Low score:** Agent is spending too many turns on a single topic or going back to topics already covered.

**Which prompt to edit:** Strengthen the `MODE: Guided (5 questions maximum, be efficient)` instruction. Add: "You have exactly N questions. Do not revisit topics."

---

## Deep Mode Criteria (6 = guided + 1)

All 5 guided criteria apply. Plus:

### 6. Skin In The Game
**What it measures:** Did the agent explore the emotional WHY? Did it ask about what happens if the user doesn't change, what life looks like if they succeed, what's personally at stake?

**High score (0.8+):** Agent explicitly explored statements like "What does your life look like in 2 years if you don't change this?" or "What would it mean to you personally if you finally got this right?"

**Low score (<0.6):** Agent only asked "Why do you want this?" (surface motivation) without exploring deeper stakes or what the user is trying to leave behind.

**Which prompt to edit:** `buildDeepSystemPrompt()` in `lib/agents/constellation.ts` — add an explicit "MOTIVATION AND STAKES" section that instructs the agent to ask about consequences and personal meaning, not just goals.

---

## Architect Criteria (5)

### 1. Identity Alignment
Do habits connect to who the user wants to become and their focus area?

**Prompt to edit:** `buildAutoGeneratePrompt()` in `lib/agents/architect.ts` — strengthen the identity label instruction: "The identity_label MUST directly describe the person they said they want to become in their exact words."

### 2. Habit Specificity
Does each habit follow "After I [existing behavior], I will [new behavior] at [location/time]"? Is the two-minute version genuinely under 2 minutes?

**Prompt to edit:** `buildAutoGeneratePrompt()` — add format examples showing exactly what a correct cue looks like vs a wrong one.

### 3. Information Utilization
Did Architect use the user's existing daily habits as cue anchors and reference their real environment?

**Prompt to edit:** In `buildAutoGeneratePrompt()`, ensure `anchorHabits` (existing habits) are passed prominently in the system prompt and explicitly instructed to be used as cue anchors.

### 4. Journey Display
Does the output show a compelling progression from a tiny daily habit to a larger identity?

**Prompt to edit:** Add a `journey_note` field requirement and instruction: "For each habit, add a one-sentence journey_note connecting this tiny habit to the user's stated identity."

### 5. Habit Variety
Are the 5 habits meaningfully distinct with different difficulty levels, times, and contexts?

**Prompt to edit:** Strengthen the variation instruction: "Generate exactly 5 habits at different difficulty levels: 1 very easy (feels almost too small), 2 moderate, 2 ambitious. Use different times of day and contexts for each."

---

## Viewing Results in LangSmith

### Required .env settings for tracing

```
LANGCHAIN_API_KEY=your_key_here
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=Habidy-Agent-Eval
```

The eval will warn you at startup if either `LANGCHAIN_API_KEY` or `LANGCHAIN_TRACING_V2` is missing.

### Trace structure

Each run produces a **parent trace with two child spans**:

```
agentEval__guided__sonnet__expressive       ← parent: full result + scores
  inputs:  { identityStatement, focusArea, blockers, existingDailyHabits, ... }
  outputs: { guidedScores, architectScores, turns, forcedSummary, ... }

  └── investigator_conversation             ← child 1: FULL CONVERSATION
        inputs:  { identityStatement, focusArea, blockers, ... }
        outputs: {
          conversationText: "USER: Hello\nASSISTANT: ...\nUSER: ...",
          conversation: [{ role, content }, ...],
          summary: "{ who_they_want_to_be: ... }",
          turns: 4,
          forcedSummary: false
        }

  └── architect_generation                  ← child 2: HABITS CREATED
        inputs:  { identityStatement, crystalBallSummary }
        outputs: {
          habitOutput: "HABITS_READY:[...]",
          parsedHabits: [
            { identity_label: "I am a daily runner", habit_name: "Morning Run", cue: "After I...", ... },
            ...
          ],
          habitCount: 5
        }
```

### How to find conversations and habits in LangSmith

1. Go to [smith.langchain.com](https://smith.langchain.com) → your project
2. Filter traces by tag `agent-eval-v1`
3. Click any parent trace → expand the tree on the left
4. Click **investigator_conversation** → view `conversationText` in Outputs (readable conversation)
5. Click **architect_generation** → view `parsedHabits` in Outputs (structured habit objects)

### Filtering

| Want to see... | Filter by tag |
|---|---|
| All eval runs | `agent-eval-v1` |
| Only guided mode | `guided` |
| Only deep mode | `depth` |
| Only haiku runs | `haiku` |
| Only GPT-4o runs | `gpt-4o` |
| Only uninterested persona | `uninterested` |

---

## Comparison with Other Eval Files

| File | What it tests | Models | Personas | Run command |
|---|---|---|---|---|
| `agentEval.ts` | Guided + Deep + Architect across 4 models | haiku, sonnet, gpt-4o-mini, gpt-4o | expressive, moderate, uninterested | `npm run eval:agents` |
| `runModelComparison.ts` | Default investigator vs Architect, 2 Anthropic models | haiku, sonnet | engaged, vague, distracted | `npm run eval:models` |
| `promptEvaluator.ts` | Prompt quality against LangSmith dataset examples | sonnet only | vague only | `npm run eval:prompts` |

Use `agentEval.ts` when: comparing guided vs deep mode, benchmarking OpenAI vs Anthropic, or measuring a specific persona's experience.

Use `runModelComparison.ts` for a quick haiku vs sonnet check.

Use `promptEvaluator.ts` when you have a LangSmith dataset and want to run against fixed examples.