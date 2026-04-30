# Prompt Evaluation Guide

`evals/promptEvaluator.ts` tests whether our **agent prompts are good**, not which model is best.
It uses a fixed model (`claude-sonnet-4-6`) and scores 7 criteria across the two main prompts.

---

## How to run

```bash
npx tsx evals/promptEvaluator.ts
```

Requirements:
- `ANTHROPIC_API_KEY` set in `.env.local`
- `LANGCHAIN_API_KEY` set (to fetch dataset examples and log traces)
- `LANGCHAIN_PROJECT` set to `Habidy-Prompt-Eval` (recommended)
- LangSmith dataset `Habidy-Identity-Investigator-Agent` must exist with at least 1 example

---

## What it does

1. Fetches all examples from the `Habidy-Identity-Investigator-Agent` LangSmith dataset
2. For each example, extracts the identity goal and runs a **vague user simulation** — Haiku plays a user who gives short, unclear answers
3. Scores the **Identity Gatherer prompt** on 4 criteria
4. Passes the summary to **Architect** and scores its prompt on 3 criteria
5. Logs every run to LangSmith tagged `prompt-eval-v1`
6. Prints a formatted report with PASS/FAIL for each criterion

---

## Criteria and what they measure

### Identity Gatherer (4 criteria)

| Criterion | What it checks |
|---|---|
| `SPECIFICITY` | Are questions tailored to _this_ user's identity goal, or generic habit questions? |
| `ATOMIC_HABITS_COVERAGE` | Did the conversation surface cue, environment, time, two-minute version, motivation, and identity? (score = elements found / 6) |
| `VAGUE_USER_RECOVERY` | When the user says "I dunno", does the agent probe deeper or accept it and move on? |
| `EFFICIENCY` | Did the agent produce a summary within a reasonable number of turns? |

### Architect (3 criteria)

| Criterion | What it checks |
|---|---|
| `HABIT_SPECIFICITY` | Do habits follow "After I X, I will Y at Z" format? Is the two-minute version genuinely small? |
| `IDENTITY_ALIGNMENT` | Do the habits directly connect to the user's stated identity goal, or are they generic? |
| `CONTEXT_UTILIZATION` | Does Architect actually use the specific details from the Identity Gatherer session? |

---

## Interpreting scores

| Score | Meaning |
|---|---|
| `0.8 – 1.0` | Excellent — prompt is doing its job well |
| `0.7 – 0.8` | Passing — minor improvements possible |
| `0.6 – 0.7` | Borderline — review the prompt section that handles this |
| `< 0.6` | Needs rewrite — the prompt is not reliably producing this behavior |

Pass threshold: **0.7**

---

## How to act on failing criteria

**`SPECIFICITY` fails** → The Identity Gatherer opening message or question instructions are too generic. Add more explicit rules like: "Your questions must reference '${identity}' directly — never ask generic habit questions."

**`ATOMIC_HABITS_COVERAGE` fails** → The internal tracking section (7 fields at the bottom of the system prompt) is not being used or is too implicit. Make the fields more prominent or add a rule: "You must surface a specific cue before turn 5."

**`VAGUE_USER_RECOVERY` fails** → The prompt doesn't tell the agent what to do when users are unclear. Add a rule like: "If the user gives a vague answer, acknowledge it and rephrase the same question more concretely. Never move to a new topic without resolving the current one."

**`EFFICIENCY` fails** → The agent is running out of turns without producing a summary. Either reduce `MAX_TURNS`, tighten the conversation rules, or add an early-summary trigger (e.g. "After you have answers for 5 of the 7 fields, produce the summary").

**`HABIT_SPECIFICITY` fails** → The `HABITS_READY_RULES` in `lib/agents/architect.ts` need tighter constraints. Add explicit examples of correct vs incorrect cue formatting.

**`IDENTITY_ALIGNMENT` fails** → The Architect system prompt is not emphasizing identity-first strongly enough. Add: "Every habit must be answerable to: 'Does this prove ${userName} is becoming ${identityStatement}?'"

**`CONTEXT_UTILIZATION` fails** → Architect is ignoring the Crystal Ball summary. Add an explicit instruction: "You must reference at least one specific detail from the investigation notes in each habit's cue or two-minute version."

---

## Viewing traces in LangSmith

Each example run is logged as a chain trace tagged `prompt-eval-v1`. To view:

1. Go to [smith.langchain.com](https://smith.langchain.com)
2. Select project `Habidy-Prompt-Eval`
3. Filter by tag: `prompt-eval-v1`

Each trace contains the full conversation, all judge scores, and metadata including the identity goal and example ID.

---

## Difference from model comparison eval

| | `promptEvaluator.ts` | `runModelComparison.ts` |
|---|---|---|
| Question | "Is this prompt good?" | "Which model is better?" |
| Model | Fixed (`claude-sonnet-4-6`) | Multiple models compared |
| Input | LangSmith dataset examples | Hardcoded identity strings |
| Persona | Vague only | Engaged, vague, distracted |
| Purpose | Prompt iteration | Model selection |

Run `promptEvaluator.ts` when you change a system prompt.
Run `runModelComparison.ts` when you're evaluating whether to switch models.