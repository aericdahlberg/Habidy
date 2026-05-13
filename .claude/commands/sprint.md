# /sprint — Work through SPRINT.md card by card

## What this command does
Reads SPRINT.md, finds the next unchecked card, dispatches the right subagent,
runs hooks, reports results, then STOPS and waits for your approval before
moving to the next card. Never auto-advances. Never chains cards silently.

---

## Step 1 — Read and report sprint state

Read SPRINT.md. Output this exact status block before doing anything else:

```
Sprint 3 — May 13
────────────────────────────────────
✅ Done:     [count] cards
🔄 Active:   [current card title if any]
⬜ Remaining: [count] cards
────────────────────────────────────
Next up: [title] ([type] · [effort] · RICE [score])
```

Then ask: "Start this card? (yes / skip / stop)"

---

## Step 2 — Write current-card.json and dispatch the right subagent

BEFORE dispatching any agent, write `.claude/current-card.json` with the card's type and slug.
This file is read by require-plan.sh to decide whether a plan is required.

```json
{"type": "[BUG|BUILD|EVAL|GUARDRAIL|INFRA|IMPROVE]", "title": "[card title]", "slug": "[kebab-case-title]"}
```

Example for "Fix HABITS_READY regex":
```json
{"type": "BUG", "title": "Fix HABITS_READY regex", "slug": "fix-habits-ready-regex"}
```

Then dispatch the right subagent:

| Card Type | Subagent to use |
|-----------|----------------|
| BUG       | Use the bug-fixer agent |
| BUILD     | Use the planner agent first → approve plan → execute |
| EVAL      | Use the eval-runner agent |
| GUARDRAIL | Use the bug-fixer agent (treat as a hardening task) |
| INFRA     | Use the planner agent first → approve plan → execute |
| IMPROVE   | Use the planner agent first → approve plan → execute |

Always announce which agent you're dispatching and why:
"Dispatching bug-fixer agent for this BUG card."
"Dispatching planner agent for this BUILD card — will show plan before executing."

---

## Step 3 — Before starting any card

Check whether these hooks are configured in `.claude/settings.json` and announce their status:
```
Hooks active for this card:
  ✅ post-edit.sh     — fires after every file write (lint + type-check + doc reminders)
  ✅ require-plan.sh  — blocks writes until plan exists (BUILD/INFRA/IMPROVE only)
  ✅ validate-session — fires after each response (checks uncommitted changes)
  ✅ pre-commit       — git hook, blocks commits if npm test fails
```

Check by reading `.claude/settings.json`. If post-edit.sh is missing from PostToolUse hooks, flag it:
"⚠️ post-edit.sh hook not found — type-check won't run automatically. Proceed anyway?"

For BUG and EVAL cards: require-plan.sh is bypassed via current-card.json. Announce this.

---

## Step 4 — Execute the card

Work only on the steps listed in the card. Do not:
- Fix other things you notice along the way (add them to Notion Inbox instead)
- Start the next card automatically
- Expand scope beyond the Done When condition

When each step completes, say so:
"✅ Step 1 done: regex updated in architect.ts:131"
"✅ Step 2 done: confirmed no 500 on trailing text"

**Documentation rule:** After any file change, check what post-edit.sh reports.
If it flags a doc that needs updating (AGENTS.md, DATA.md, SCREENS.md, etc.), update it
before moving to the next step. Do not defer doc updates to the end.

---

## Step 5 — Verify the Done When condition

When all steps are complete, explicitly check the Done When condition:
"Done When check: [quote the condition from the card]"
"Result: ✅ PASS / ❌ FAIL — [reason]"

If FAIL: stay on the card. Explain what's missing.
If PASS: proceed to Step 6.

---

## Step 6 — Run post-card checklist

Run /validate now. Do not skip. It checks: npm test, tsc, file lengths, CLAUDE.md rules, doc sync.

Then confirm each item:
```
Post-card checklist:
  ✅ Agent self-validation passed (summary included concerns + out-of-scope items)
  ✅ /validate passed (tests ✅, tsc ✅, rules ✅, docs in sync ✅)
  ✅ Done When condition met
  ✅ Changes committed to git (pre-commit hook ran npm test automatically)
  ✅ SPRINT.md updated ([ ] → [x])
```

If /validate finds failures: stay on the card, fix them, then re-run /validate.
Do not commit or mark the card done until /validate is clean.

---

## Step 7 — Context window check

After each card, report estimated context usage:
"Context used: ~[X]k tokens."

If context is above 80%:
"⚠️ Context is getting full. Recommend /end-session + /clear before the next card."

---

## Step 8 — Stop and report

After the card is done and checklist passes:
```
────────────────────────────────────
✅ [card title] — DONE
────────────────────────────────────
Sprint progress: [X] of [Y] cards done

Next up: [title] ([type] · [effort] · RICE [score])
Ready to start? (yes / skip / stop)
```

Never start the next card without a "yes".

---

## Context window strategy

To avoid filling context mid-card:
1. BUILD/INFRA/IMPROVE cards: planner (Opus) writes a plan file and exits.
   You approve the plan. The executor reads the plan file — not the planning conversation.
   For very large BUILD cards: consider /clear after plan approval, then /sprint to execute.
2. EVAL cards: eval-runner writes results to `.claude/eval-results/`. Each case is isolated.
3. After every 2–3 cards: /end-session + /clear. Each /sprint call is designed for ONE card.
