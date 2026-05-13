# Hab-Idy Sprint Workflow — Complete Reference
> Keep this file open. Everything you need is here.

---

## What this system actually is

Before anything else: **`/sprint` is instructions written in Markdown that Claude reads and follows.** It is not compiled code. It is not a shell script. Claude interprets the `.claude/commands/sprint.md` file and tries to follow its steps. This matters because:

- Claude can drift from the instructions (skip a step, abbreviate a summary)
- If it does, **the hooks don't catch it** — hooks only fire on file writes, not on Claude's reasoning
- Your main defense is the structured format: if the summary is missing sections, push back
- The hooks (`require-plan.sh`, `post-edit.sh`, pre-commit) are the parts that are actually enforced at the filesystem/git level

The agents (planner, bug-fixer, eval-runner) work the same way — they're Markdown instruction files that Claude reads when it spawns a subagent. The subagent runs in an isolated context window and returns only its result summary to the main session.

**What this means practically:** trust the hook outputs (tsc, lint, npm test) as ground truth. Be more skeptical of Claude's narrative claims ("I verified this ✅"). Ask to see the actual output when uncertain.

---

## File map

```
.claude/
  agents/
    planner.md         ← Opus. Plans BUILD/INFRA/IMPROVE cards. Ultrathinks. No code.
    bug-fixer.md       ← Sonnet. Fixes ONE bug. 3-file limit. Root cause first.
    eval-runner.md     ← Sonnet. Runs EVAL cases. Reports pass/fail. Never fixes.
  commands/
    sprint.md          ← /sprint — the main workflow command
    validate.md        ← /validate — compliance report (runs inside /sprint automatically)
    end-session.md     ← /end-session — end of day commit + PROGRESS.md
    fix-bug.md         ← /fix-bug — legacy, dispatches bug-fixer directly
    new-feature.md     ← /new-feature — legacy, dispatches planner directly
  hooks/
    require-plan.sh    ← PreToolUse: blocks file writes without plan (BUILD/INFRA only)
    post-edit.sh       ← PostToolUse: tsc + lint + doc reminders after every file write
    validate-session.sh ← Stop: lightweight uncommitted-file warning after every response
    pre-commit.sh      ← source of truth for .git/hooks/pre-commit
    install-hooks.sh   ← run once: installs pre-commit.sh into .git/hooks/
  plans/
    plan-[card-slug].md  ← written by planner agent before any code touches files
  eval-results/
    [card-slug]-[date].md  ← written by eval-runner with pass/fail for each case
  current-card.json    ← written by /sprint before dispatching; tells require-plan.sh the card type
  settings.json        ← wires hooks into Claude Code (PreToolUse, PostToolUse, Stop)
SPRINT.md              ← the sprint. Source of truth for what to work on.
PROGRESS.md            ← written by /end-session. Read this at the start of any new session.
CLAUDE.md              ← every agent reads this first. Architecture, conventions, rules.
```

---

## Monday: setting up the sprint

1. Open the Notion board (habidy planning view)
2. Pull the highest-RICE uncompleted cards into SPRINT.md — ordered by RICE score, highest first
3. Each card needs: Type, Priority, Effort, RICE score, Done When condition, Steps
4. Cards that depend on other cards: add a note like `*Requires GC1 to pass first.*`
5. Blocked cards go below their dependencies in the file — `/sprint` works top to bottom

Format reference (from current SPRINT.md):
```markdown
## [ ] Card title (H1)
**Type:** BUG · **Priority:** P0 🔴 · **Effort:** 0.5h · **RICE:** 85.5
**Notion:** [link]

**Done when:** [exact, testable condition]

**Steps:**
- [specific step with file reference if known]
- [specific step]
```

---

## Starting a session

**Always read PROGRESS.md first if continuing from a previous session.**
PROGRESS.md is written by `/end-session` and captures exactly where you stopped, what was in progress, and any open concerns. Claude's context resets on `/clear` — PROGRESS.md is how you get it back.

```
cd habidy
# read PROGRESS.md if it exists (open in editor or ask Claude to summarize it)
/sprint
```

If it's the first session of a new sprint and there's no PROGRESS.md, just run `/sprint`.

---

## Daily workflow

```
/sprint              ← one command. Handles the next unchecked card end to end.
                       Asks permission before every significant step.
                       Runs /validate automatically at the end. Never auto-advances.

(when context hits 80%, or after a large BUILD card):
/end-session         ← writes PROGRESS.md, commits everything
/clear               ← resets context
/sprint              ← picks up from next unchecked card

(end of day):
/end-session
/clear
```

**You never have to remember to run `/validate`** — `/sprint` runs it at Step 6.
**You never have to remember to run tests before committing** — the pre-commit git hook does it.

---

## Complete card flows

### BUG card

```
1. /sprint reads SPRINT.md
   → shows sprint state, announces "Fix HABITS_READY regex (BUG · 0.5h · RICE 85.5)"
   → asks: "Start this card?"

2. you: "yes"

3. /sprint writes .claude/current-card.json:
   {"type":"BUG","title":"Fix HABITS_READY regex","slug":"fix-habits-ready-regex"}
   → require-plan.sh will read this and skip the plan-file check

4. /sprint announces: "Dispatching bug-fixer agent (Sonnet)"
   
5. bug-fixer runs in isolated context:
   ├─ reads CLAUDE.md
   ├─ git diff main (sees what changed recently)
   ├─ reads architect.ts
   ├─ states root cause: "\\s*$ anchor requires ] to be the last character in the response"
   ├─ changes the regex at architect.ts:131
   │    ↓ PreToolUse hook fires: require-plan.sh → reads current-card.json → BUG → BYPASSED
   │    ↓ Write happens
   │    ↓ PostToolUse hook fires: post-edit.sh
   │        → npx tsc --noEmit → ✅
   │        → npx eslint architect.ts → ✅
   │        → checks if agent file changed → no
   ├─ updates docs if post-edit.sh flagged any
   ├─ self-validates: git diff confirms change, root cause not symptom, confidence High
   └─ returns rich summary to /sprint orchestrator

6. orchestrator displays the summary:
   root cause + fix + concerns + out-of-scope items spotted + future ideas

7. /sprint runs /validate:
   → npm test -- --run (all 73 tests) → ✅
   → npx tsc --noEmit → ✅
   → file length check → ✅
   → CLAUDE.md rule greps → ✅
   → doc sync check → ✅

8. git commit
   → pre-commit git hook fires: npm test -- --run → ✅ → commit allowed

9. SPRINT.md: [ ] → [x] for this card

10. /sprint reports:
    "✅ Fix HABITS_READY regex — DONE"
    "Sprint progress: 1 of 17 cards done"
    "Next up: GC2 Onboarding skip still saves (EVAL · 0.5h · RICE 54)"
    "Ready to start? (yes / skip / stop)"
```

---

### BUILD card

```
1. /sprint shows state → asks to start

2. you: "yes"

3. /sprint writes current-card.json: {"type":"BUILD",...}

4. /sprint announces: "Dispatching planner agent (Opus) — will show plan before executing"

5. planner runs in isolated context:         ← CONTEXT IS ISOLATED HERE
   ├─ reads CLAUDE.md (architecture, conventions, 200-line rule, localDateStr(), etc.)
   ├─ ultrathinks the full problem space
   ├─ reads SPRINT.md card + any named files + docs/DATA.md (if DB) + docs/AGENTS.md (if agents)
   ├─ identifies: what changes, what risks, what docs need updating
   ├─ writes .claude/plans/plan-habit-phase-progression.md
   │    ↓ PreToolUse hook: require-plan.sh → .claude/ write → BYPASSED (always allowed)
   │    ↓ Write happens (plan file)
   │    ↓ PostToolUse hook: post-edit.sh → not a .ts file → skips tsc/lint
   ├─ self-validates the plan
   └─ returns plan text + rich summary to /sprint orchestrator
      ↑ ONLY the summary enters the orchestrator context, not the planning conversation

6. orchestrator shows you the plan inline and asks:
   "Approve this plan? (yes / edit / cancel)"

   ── CONTEXT DECISION POINT ────────────────────────────────────
   If the card effort is >2h or has many steps:
     → run /end-session, then /clear, then /sprint again
     → the new session reads the plan FILE (not this conversation)
     → this keeps execution context clean
   If the card is small (<1h, 2-3 steps):
     → just say "yes" and continue in this session
   ──────────────────────────────────────────────────────────────

7. you: "yes"

8. orchestrator reads plan-[slug].md and executes each step:
   For each file change:
     ↓ PreToolUse: require-plan.sh → plan file exists → ALLOWED
     ↓ Write/Edit happens
     ↓ PostToolUse: post-edit.sh
         → npx tsc --noEmit → must pass or execution stops
         → npx eslint [file] → must pass
         → doc reminder: if agent file changed → "⚠️ update docs/AGENTS.md"
         → orchestrator updates that doc BEFORE moving to next step

9. /sprint runs /validate:
   → npm test (all), tsc, file lengths, CLAUDE.md rules, doc sync
   → blocks commit until clean

10. git commit → pre-commit → npm test → commit

11. SPRINT.md [x], sprint progress reported, asks about next card
```

**Note on npm test running twice:** `/validate` runs `npm test` at Step 9, then `git commit` runs it again via the pre-commit hook. This is intentional — between validate and commit, the orchestrator might make one more edit. The pre-commit is the final guarantee. At 73 tests this adds ~10 seconds. Acceptable.

---

### EVAL card

```
1. /sprint shows state → asks to start

2. you: "yes"

3. /sprint writes current-card.json: {"type":"EVAL",...}
   require-plan.sh will be bypassed

4. /sprint announces: "Dispatching eval-runner agent (Sonnet)"

5. eval-runner runs in isolated context:
   ├─ reads CLAUDE.md (Testing Quick Reference section)
   ├─ announces all cases to run + result file location
   ├─ for each case, independently:
   │   ├─ states what it's about to do
   │   ├─ executes (npm test, or manual-test instructions)
   │   └─ reports: Case name / Action / Expected / PASS or FAIL / Notes
   │      does NOT stop on failure — runs all cases
   ├─ writes .claude/eval-results/[slug]-[date].md
   ├─ self-validates: all cases run? results file written? failures have actionable detail?
   └─ returns rich summary with failure patterns + Notion BUG card suggestions

   ⚠️ IMPORTANT: many EVAL cases require manual UI interaction (clicking, checking Supabase,
   reading LangSmith traces). The eval-runner will run automated cases and flag manual ones
   as "requires manual verification." You need to do those yourself.

6. orchestrator displays summary:
   pass/fail table + patterns + suggested BUG cards

7. for each failure: suggest adding a BUG card to Notion Inbox

8. /sprint runs /validate (tests + tsc — no doc sync needed for EVAL-only work)

9. SPRINT.md [x] — EVAL cards are done even with failures (failures become BUG cards)
   Note any failures in the card comment: "3 cases failed — BUG cards added to Notion"
```

---

## What fires automatically vs. what you control

| Thing | Automatic? | You control? |
|---|---|---|
| tsc + lint after every file write | ✅ automatic (post-edit.sh) | — |
| Plan file required before BUILD code | ✅ automatic (require-plan.sh) | — |
| Uncommitted file warning | ✅ automatic (validate-session.sh Stop hook) | — |
| npm test before every git commit | ✅ automatic (pre-commit git hook) | git commit --no-verify to bypass |
| npm test as part of /validate | ✅ runs when you run /sprint Step 6 | you run /validate to see output |
| Agent dispatching | ✅ /sprint decides based on card type | you can override: "use bug-fixer" |
| Plan approval | ❌ always you | "yes / edit / cancel" |
| Moving to next card | ❌ always you | "yes / skip / stop" |
| /clear between cards | ❌ your judgement | context meter tells you when |
| Notion BUG card creation | ❌ manual | eval-runner suggests them |
| SPRINT.md population on Mondays | ❌ manual | pull from Notion board |

---

## Context window: when to /clear

The orchestrator (your main `/sprint` session) accumulates context from:
- Reading SPRINT.md
- Agent result summaries (not full conversations — just the returned text)
- Hook output (tsc, lint, test results)
- File reads during execution

**Rough guidance:**
- BUG card (0.5h): ~10-20k tokens. Do 3-4 before clearing.
- EVAL card (0.5-1h): ~15-25k tokens. Do 2-3 before clearing.
- BUILD card (2-4h): ~40-80k tokens. Consider clearing after plan approval for cards >2h.

**When /sprint warns you (>80%):**
```
/end-session    ← commit + PROGRESS.md
/clear
/sprint         ← reads SPRINT.md + plan file (if mid-BUILD) from disk, not from context
```

**Mid-BUILD card /clear procedure:**
1. Wait until the planner has written `plan-[slug].md` and you've approved it
2. Run `/end-session` (commits the plan file)
3. Run `/clear`
4. Run `/sprint` again — it reads the plan file from disk and continues execution

---

## Handling blocked cards

Some cards depend on other cards passing first (e.g., "GC14 requires GC1 and GC4").

When `/sprint` shows a blocked card:
```
you: "skip"   ← /sprint moves to the next card
```

Or add a note inline in SPRINT.md:
```markdown
## [ ] GC14: Auto-dismiss reminder when habit logged
**Type:** EVAL · ...
*⛔ BLOCKED: requires GC1 (OAuth) and GC4 (recurring event) to pass first.*
```

When you skip a card, `/sprint` moves to the next highest-RICE unchecked card.
Come back to blocked cards after their dependencies are done.

---

## Troubleshooting

### Hook blocks a write unexpectedly
```bash
# See what require-plan.sh thinks the card type is:
cat .claude/current-card.json

# See if a plan file exists:
ls .claude/plans/

# If you're mid-ad-hoc work with no plan (and need to write):
# Option 1: enter plan mode (Shift+Tab), write plan to .claude/plans/plan-[session].md
# Option 2 (ad-hoc): create a stub plan file
echo "# Ad-hoc plan: [description]" > .claude/plans/plan-$(date +%s).md
```

### post-edit.sh fails on tsc
Don't keep writing files. Fix the type error in the flagged file first. The hook output shows exactly which file and line.

### pre-commit blocks commit (tests failing)
```bash
npm test -- --run    # see which tests are failing
# fix the failures
git add [fixed files]
git commit           # try again
```
Never use `git commit --no-verify` unless the test itself is broken (not the code).

### Context fills mid-BUILD card (before execution)
```
/end-session     ← saves PROGRESS.md + commits plan file
/clear
/sprint          ← fresh session reads plan file and continues
```

### Context fills mid-BUILD card (during execution, partway through steps)
```
/end-session     ← commits partial work, PROGRESS.md captures which steps remain
/clear
/sprint          ← reads SPRINT.md, sees card is still unchecked, reads plan + PROGRESS.md
               ← continues from where it left off
```

### Agent returned a thin summary (missing sections)
Push back: "Your summary is missing the Potential Concerns and Self-Validation sections. Please complete them before we proceed."

### /validate finds doc sync failure
post-edit.sh should have flagged this during execution. Fix it now:
```
"Update docs/AGENTS.md — the [section] changed because [reason]"
```
Then re-run /validate.

---

## Information flow: end to end

```
Monday: Notion board
  │
  │  you: copy RICE-ordered cards into SPRINT.md
  ▼
SPRINT.md ←─────────────────────────────────────────────────────────┐
  │                                                                   │
  │ /sprint reads this every invocation                               │ [ ] → [x] when done
  ▼                                                                   │
Orchestrator (main Claude session, /sprint command)                   │
  │                                                                   │
  ├── 1. reads SPRINT.md, reports state                               │
  │                                                                   │
  ├── 2. writes .claude/current-card.json ──────────────────────────▶ require-plan.sh reads this
  │       {"type":"BUG|BUILD|EVAL...", "slug":"..."}                  │
  │                                                                   │
  ├── 3. [BUILD/INFRA/IMPROVE] spawns planner agent (Opus)            │
  │         isolated context window                                    │
  │         reads: CLAUDE.md + named files + DATA.md + AGENTS.md      │
  │         writes: .claude/plans/plan-[slug].md  ───────────────────▶ PreToolUse: .claude/ → allowed
  │         returns: plan text + summary (only this enters orchestrator)│
  │         [planner's full context is discarded]                      │
  │                                                                   │
  ├── 4. [you approve plan]                                            │
  │                                                                   │
  ├── 5. [BUILD execution or BUG/EVAL agent dispatch]                 │
  │                                                                   │
  │    For every file write (by any agent or orchestrator):            │
  │    │                                                               │
  │    ▼                                                               │
  │    PreToolUse: require-plan.sh                                     │
  │      reads current-card.json                                       │
  │      BUG/EVAL/GUARDRAIL → BYPASS                                   │
  │      BUILD/INFRA/IMPROVE → check plan file exists                  │
  │        plan exists → ALLOW                                         │
  │        no plan → BLOCK (exit 1)                                    │
  │    │                                                               │
  │    ▼                                                               │
  │    File is written                                                 │
  │    │                                                               │
  │    ▼                                                               │
  │    PostToolUse: post-edit.sh                                       │
  │      if .ts/.tsx:                                                  │
  │        npx tsc --noEmit ── FAIL → blocks, Claude must fix          │
  │        npx eslint [file] ─ FAIL → blocks, Claude must fix          │
  │        prints doc reminders based on which file changed:           │
  │          lib/agents/* → "⚠️ update docs/AGENTS.md"                 │
  │          app/api/* → "⚠️ update docs/DATA.md"                     │
  │          app/(screen)/* → "⚠️ update docs/SCREENS.md"             │
  │          supabase/migrations/* → "⚠️ update docs/DATA.md"         │
  │                                                                   │
  ├── 6. /validate runs (Step 6 of /sprint)                            │
  │       npm test -- --run (all tests, full output)                   │
  │       npx tsc --noEmit (full project)                              │
  │       file length check (>200 lines → flag)                        │
  │       CLAUDE.md rule greps:                                        │
  │         new Date().toISOString() usage → flag                      │
  │         adminClient() in client files → flag                       │
  │       doc sync check:                                              │
  │         agent files changed but AGENTS.md not → flag              │
  │         API routes changed but DATA.md not → flag                 │
  │         screen files changed but SCREENS.md not → flag            │
  │       CLEAN → proceed   │   ISSUES → stay on card, fix first       │
  │                                                                   │
  ├── 7. git commit                                                    │
  │       ↓                                                            │
  │    pre-commit git hook (.git/hooks/pre-commit)                     │
  │       npm test -- --run                                            │
  │       PASS → commit allowed   │   FAIL → commit blocked            │
  │       ↓                                                            │
  │    commit lands in git history                                     │
  │                                                                   │
  └── 8. SPRINT.md [ ] → [x] ──────────────────────────────────────── ┘

After every Claude response (any response, not just /sprint):
  Stop hook: validate-session.sh
    git status → uncommitted source files? → warn
    SPRINT.md unsaved? → warn
    silent if clean

/end-session (end of day):
  /validate runs first
  writes PROGRESS.md (what was done, what's next, stopping point)
  git commit (pre-commit runs npm test)
  safe to /clear

PROGRESS.md
  read this at start of next session before running /sprint
```

---

## Agent reference

### planner (Opus)
**Dispatched for:** BUILD, INFRA, IMPROVE  
**Plan required:** writes the plan  
**What it does:** reads CLAUDE.md, ultrathinks, reads relevant files + DATA.md/AGENTS.md, writes `plan-[slug].md`, self-validates the plan  
**Does NOT:** write source code  
**Returns:** plan text + concerns + out-of-scope items + future ideas + self-validation

### bug-fixer (Sonnet)
**Dispatched for:** BUG, GUARDRAIL  
**Plan required:** no (bypassed via current-card.json)  
**3-file limit** — stops and asks if fix needs >3 files  
**What it does:** reads CLAUDE.md, git diff, affected files. States root cause BEFORE touching anything. Fixes. tsc + lint. Updates docs flagged by post-edit.sh. Self-validates.  
**Returns:** root cause + fix + file:line changes + concerns + test coverage gap + out-of-scope bugs + future ideas + confidence

### eval-runner (Sonnet)
**Dispatched for:** EVAL  
**Plan required:** no (bypassed via current-card.json)  
**What it does:** reads CLAUDE.md, runs each case independently, never stops on failure, writes `.claude/eval-results/[slug]-[date].md`. Self-validates.  
**Does NOT:** fix failures — only reports them  
**Returns:** pass/fail table + failure detail (actionable) + patterns + suggested Notion BUG cards + future eval ideas + confidence  
**Limitation:** EVAL cases requiring browser interaction (clicking UI, checking Supabase manually) must be done by you — the agent will flag which ones

---

## Adding a new agent

When you need an agent that doesn't fit the existing three (e.g., a "db-migrator" for running and verifying schema migrations, or a "refactor-agent" for safe renames across many files):

### Step 1: decide the model
- **Opus** for agents that need deep reasoning: architecture decisions, multi-file planning, complex tradeoffs
- **Sonnet** for agents that execute a defined procedure: running commands, making targeted changes, reporting results

### Step 2: create the file at `.claude/agents/[name].md`

Use this exact structure — every section is required:

```markdown
---
model: claude-sonnet-4-6    ← or claude-opus-4-7
---

# Agent: [name]

## Role
[One paragraph. What it does. What it does NOT do. Why it exists as a separate agent
rather than being handled by the orchestrator or an existing agent.]

## First step: always read CLAUDE.md
Before doing anything, read `CLAUDE.md`. Pay close attention to:
- [specific section most relevant to this agent — e.g. "Auth Model" for auth work]
- [specific constraint that applies — e.g. "localDateStr() not toISOString()"]

## Trigger
Dispatched by /sprint when [exact condition — card type, title pattern, explicit dispatch].

## Process
[Numbered steps. Name the exact files, commands, checks. Nothing vague.]
1. ...
2. ...
N. Self-validate (see section below) before returning your summary

## Rules
[Hard constraints. What this agent must NEVER do. Be explicit.]
- Do not [X]
- Always [Y] before [Z]
- If [condition], stop and ask rather than guessing

---

## Before returning: self-validate

Do NOT return your summary until you have done every item here in your own context.

1. Did I read CLAUDE.md first? If not, read it now.
2. Run git diff — confirm each file you claim to have changed actually shows a diff.
   If a claimed change isn't there, the step didn't complete. Do it now.
3. [Agent-specific check: e.g. "Did tsc pass? Run it now if not already done."]
4. [Agent-specific check: e.g. "Did I stay within [N] files? Count them."]
5. Did post-edit.sh flag any doc updates? If yes, did I update them?
6. Does my work satisfy the Done When condition? Quote it and answer honestly.
7. What am I least confident about? Name it explicitly in the concerns section.

---

## Required return summary

Return this full summary. Do not abbreviate or skip sections. This is the only record
the orchestrator has of your reasoning — a thin summary loses information permanently.

\`\`\`
## [Agent name] summary: [card/task title]

### What was done
- [file:line] — [what changed and why — be specific, not "updated the function"]

### Potential concerns
[Name specific risks, not general ones. "This assumes X" not "this might fail."]
- [fragile assumption: what you assumed that could be wrong]
- [edge case: what input/state would break this]
- [dependency: what must be true for this to work correctly]

### Out-of-scope items spotted
[Things noticed while working that are NOT in this card. Don't fix them. Report them.]
- [description] → suggest as [BUG / IMPROVE / BUILD] card in Notion Inbox

### Documentation updated
- [doc file] — [what section and why]
- N/A — no docs required updating for this change

### Future ideas
[Improvements or patterns seen while working. These are valuable — capture them.]
- [specific idea with enough detail to act on later]

### Self-validation
- Read CLAUDE.md: ✅ / ❌
- git diff confirms all claimed changes: ✅ / ❌ [what's missing]
- [agent-specific check]: ✅ / ⚠️ [caveat]
- Docs updated where required: ✅ / N/A / ❌ [what was skipped and why]
- Done When condition met: ✅ / ❌ [reason if not]
- Confidence: High / Medium / Low — [reason if not High]
\`\`\`
```

### Step 3: wire it into /sprint

Edit `.claude/commands/sprint.md` — add the new card type and agent to the dispatch table in Step 2:
```markdown
| [NEW_TYPE] | Use the [name] agent |
```

### Step 4: update current-card.json bypass if needed

If the new agent should bypass the plan requirement (like bug-fixer and eval-runner),
edit `.claude/hooks/require-plan.sh` line 40:
```bash
if [[ "$CARD_TYPE" == "BUG" || "$CARD_TYPE" == "EVAL" || "$CARD_TYPE" == "GUARDRAIL" || "$CARD_TYPE" == "[NEW_TYPE]" ]]; then
```

---

## Hook reference

### require-plan.sh (PreToolUse: before every Write/Edit/MultiEdit)
Reads `.claude/current-card.json`. If card type is BUG/EVAL/GUARDRAIL → allow. If BUILD/INFRA/IMPROVE → check that a plan file exists in `.claude/plans/`. Block (exit 1) if not.  
Always allows writes inside `.claude/` itself (so agents can write plan files and eval results).

### post-edit.sh (PostToolUse: after every Write/Edit/MultiEdit)
For `.ts`/`.tsx` files: runs `npx tsc --noEmit` (project-wide) and `npx eslint [file]`. Blocks (exit 1) if either fails — Claude must fix before continuing. Also prints doc update reminders based on which file changed.

### validate-session.sh (Stop: after every Claude response)
Lightweight. Runs `git status`. Warns if: uncommitted source files, new untracked `.ts`/`.tsx` files, SPRINT.md has unsaved changes. Silent if clean. Does not block.

### pre-commit (git hook at .git/hooks/pre-commit)
Runs `npm test -- --run`. Blocks commit if any test fails. Installed by running `bash .claude/hooks/install-hooks.sh` once after cloning. Source of truth is `.claude/hooks/pre-commit.sh` (committed to git).

---

## Critical analysis: gaps and stress tests

### What genuinely works
- SPRINT.md as persistent sprint state that survives `/clear`
- Hooks enforcing tsc + lint + tests at the filesystem/git level (not aspirational)
- Agent isolation: subagent's full conversation doesn't enter orchestrator context
- RICE ordering: you always work highest-value first without re-prioritizing each session
- Rich summaries: every card gives you a second perspective on the codebase
- Plan-first for BUILD: code doesn't get written until you've seen and approved the approach

### Real gaps

**Gap 1: /sprint is instructions, not code — Claude can skip steps**  
The biggest gap. If Claude drifts from the sprint.md instructions (skips self-validation, abbreviates a summary, forgets to run /validate), the hooks don't catch it. Defense: check that the summary has all required sections before saying "yes" to the next card. If sections are missing, ask Claude to complete them.

**Gap 2: BUG card execution has no context isolation**  
Bug-fixer runs in isolated context. But the orchestrator that displays the summary and runs /validate is the SAME session that has been running all day. After 4-5 BUG cards, the orchestrator context fills with hook outputs, summaries, and validation reports. The agent contexts are isolated; the orchestrator isn't. Solution: /end-session + /clear after 3-4 cards.

**Gap 3: EVAL cards are half automated, half manual**  
UI interaction evals (clicking buttons, checking Supabase, reading LangSmith) can't be automated. The eval-runner will flag these as "requires manual verification." You have to do them yourself and then tell Claude the result. The eval-runner can still write the results file — but you're filling in the manual cases. This is expected behavior, not a bug, but it means EVAL cards always need your active involvement.

**Gap 4: Planner reads docs that might be stale**  
The planner reads DATA.md and AGENTS.md before planning. If those docs weren't updated (the doc sync check in /validate helps, but only catches post-hoc), the planner's plan is based on incorrect information. The best defense: when a BUILD card modifies agents or DB schema, run /validate before leaving that session and fix any doc sync failures immediately.

**Gap 5: Large BUILD card can fill context during execution**  
A 4-hour BUILD card with 10+ file writes accumulates tsc output, lint output, and hook messages for every step. The orchestrator context can hit 80% before execution completes.  
Fix: clear after plan approval for any card with effort >2h. The plan file is on disk; execution starts fresh.

**Gap 6: No mechanism for mid-sprint priority change**  
If a P0 bug arrives Tuesday that's not in SPRINT.md, you can't just add it — SPRINT.md is supposed to be populated Monday and not modified mid-sprint. In practice: add it to SPRINT.md above the current card, with its RICE score. /sprint will pick it up next. Don't add cards that don't have proper Type/Priority/Effort/Done When.

**Gap 7: Self-validation is aspirational**  
The self-validation section tells agents to run git diff and check their work. An LLM can claim "git diff confirms ✅" without running it. The hooks (tsc, lint, pre-commit) provide machine-enforced ground truth. Treat the self-validation narrative as "did Claude think about this carefully?" not as "did Claude actually verify this mechanically."

### Improvement ideas (backlog)

| Idea | Value | Effort |
|------|-------|--------|
| `/checkpoint` command — mid-card progress save without full /end-session | High | Low |
| `/blocked` command — marks card blocked with reason, skips to next | Medium | Low |
| Auto-create Notion BUG cards from eval-runner failures via Notion MCP | High | Medium |
| Sprint retrospective command — reads all .claude/eval-results/, surfaces patterns | Medium | Medium |
| LangSmith auto-logging for EVAL cards that touch agent behavior | Medium | Medium |
| Split pre-commit into fast (unit) and CI (integration) as test suite grows | Medium | Low |
| `/resume` command — reads PROGRESS.md automatically before /sprint | Low | Low |
