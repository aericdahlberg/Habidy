# TASKS.md — Habidy Work Backlog

Section headers mirror zones in `docs/habidy-map.excalidraw`.
**BUGS.md is retired — all bugs, improvements, and features live here.**

---

## How to Read This File

**Tags (type):**
| Tag | Means |
|-----|-------|
| `[BUG]` | broken existing behavior |
| `[GUARDRAIL]` | safety, injection hardening, validation |
| `[IMPROVE]` | better version of something that exists |
| `[BUILD]` | net new screen or capability |
| `[EVAL]` | testing / eval work |
| `[INFRA]` | CI, migrations, devops, tooling |

**Priority:**
🔴 `P0` Blocker · 🟠 `P1` High · 🟡 `P2` Medium · ⚪ `P3` Low · 🟢 `P4` Backlog

**RICE Score** = `(Reach × Impact × Confidence%) / Effort_hours`
- **Reach** 1–10: fraction of users affected
- **Impact** 1–5: 1=minor fix, 3=meaningful, 5=core flow
- **Confidence** %: certainty in the approach
- **Effort** hours: estimate to ship

Higher score = do first.

---

## Auth

- [ ] ⚪[BUILD] P3 · `R6 I2 C80% E4h → Score:2.4` — Add forgot password flow
- [ ] ⚪[BUILD] P3 · `R6 I2 C80% E3h → Score:3.2` — Add email confirmation screen post-signup

---

## Onboarding — Screen 1: Welcome
*`/welcome` → `/onboarding`*

- [ ] 🟡[IMPROVE] P2 · `R9 I3 C90% E3h → Score:8.1` — Positivity framing: open with "Who do you see yourself as in 1 year?" — language should never make users feel bad about who they aren't yet; every action = 1% better · `app/onboarding/`

---

## Onboarding — Screen 2: Profile
*`/onboarding/profile` — name, DOB, gender, address, permissions, T&C*

---

## Onboarding — Screen 3: Philosophy
*`/onboarding/philosophy` — brand story, identity-first habits*

---

## Onboarding — Screen 4: Identity
*`/onboarding/identity` — "How do you describe yourself today and in 1 year?"*

---

## Onboarding — Screen 5: Questionnaire
*`/onboarding/questionnaire` — 3-page survey: focus, day structure, existing habits*

---

## Onboarding — Screen 6: Loading
*`/onboarding/loading` — saves to DB, redirects to `/mode-select`*

- [ ] 🟠[BUG] P1 · `R5 I4 C90% E1h → Score:18` — **M4. Re-trigger wipes user data** — `loading/page.tsx` uses `upsert` reading from sessionStorage which is cleared after first save; back + re-trigger overwrites identity/goal_category/friction_point with null · Fix: early return in `saveAndRedirect()` if `identityStatement` is empty
- [ ] 🟡[BUILD] P2 · `R4 I3 C80% E4h → Score:2.4` — Persist onboarding progress so users who quit halfway can resume without losing entered data

---

## Mode Selection
*`/mode-select` — quick (2 min) / guided (7 min) / deep (20 min)*

- [ ] ⚪[BUILD] P3 · `R8 I4 C80% E8h → Score:3.2` — Agent engagement mode preference: "Into it / Medium / Easy" — affects depth of Constellation session · `lib/agents/constellation.ts`, onboarding preference screen

---

## Quick Habit Flow
*`/quick-habit` → pre-generates habits → `/architect`*

---

## Agent: Identity Gatherer (Constellation)
*`lib/agents/constellation.ts` · `/api/agents/constellation` · `/constellation`*

- [ ] 🟠[GUARDRAIL] P1 · `R8 I5 C80% E4h → Score:8` — **Prompt injection hardening** — validate and sanitize user input before injecting into system prompt
- [ ] 🟡[BUG] P2 · `R7 I4 C80% E3h → Score:7.5` — **Agent conversations too long** — responses not concise; too much back-and-forth; balance depth with efficiency · both agent system prompts
- [ ] 🟡[GUARDRAIL] P2 · `R8 I4 C75% E4h → Score:6` — No input character limits — users could paste massive text; verify Claude safety rails handle harmful habit requests
- [ ] 🟡[IMPROVE] P2 · `R8 I3 C80% E4h → Score:4.8` — Guided mode wrap-up message quality
- [ ] 🟡[IMPROVE] P2 · `R5 I3 C80% E4h → Score:3` — Deep mode wrap-up message quality
- [ ] ⚪[BUILD] P3 · `R7 I4 C70% E6h → Score:3.3` — Energy/schedule awareness: ask about energizing vs draining, best time of day, existing frequency · use to schedule habits optimally
- [ ] 🟡[EVAL] P2 · `R9 I5 C95% E1h → Score:42.8` — Vague identity goal: agent must ask clarifying questions, never accept "I want to be better"
- [ ] 🟡[EVAL] P2 · `R9 I4 C95% E1h → Score:34.2` — null_user_memory: agent starts fresh, does not error
- [ ] 🟡[EVAL] P2 · `R5 I4 C90% E1h → Score:18` — db_save_failure: agent informs user, does not lose input
- [ ] 🟡[EVAL] P2 · `R5 I3 C90% E1h → Score:13.5` — user_overwhelm_attempt: agent redirects to one habit
- [ ] 🟡[EVAL] P2 · `R4 I3 C85% E1h → Score:10.2` — empty_rag_retrieval: agent does not hallucinate
- [ ] ⚪[EVAL] P3 · `R8 I2 C90% E1h → Score:14.4` — Turn cap enforcement (guided=5, deep=15)

---

## Agent: Architect
*`lib/agents/architect.ts` · `/api/agents/architect` · `/architect`*

- [ ] 🟠[GUARDRAIL] P1 · `R7 I5 C80% E4h → Score:7` — **Prompt injection hardening** — validate `quickHabitData` fields before injecting into system prompt
- [ ] 🟠[IMPROVE] P1 · `R9 I4 C80% E4h → Score:7.2` — **Habit cards: better progression UI** — show identity journey: "You are a writer — here are your first habits, path toward xyz" · `app/architect/page.tsx`
- [ ] 🟡[BUILD] P2 · `R8 I4 C70% E6h → Score:3.7` — **Habit progression planning** — after initial habit, outline path: "Start X → progress to Y → then Z" — long-term identity roadmap · Architect agent
- [ ] 🟠[EVAL] P1 · `R9 I5 C95% E1h → Score:42.8` — Vague identity → ask follow-up, never proceed to HABITS_READY
- [ ] 🟠[EVAL] P1 · `R9 I5 C95% E1h → Score:42.8` — No cue → don't advance to HABITS_READY
- [ ] 🟡[EVAL] P2 · `R8 I4 C95% E1h → Score:30.4` — Identity Gatherer summary empty → continue without it, do not error
- [ ] 🟡[EVAL] P2 · `R6 I4 C95% E1h → Score:22.8` — getProfileContext null → continue without it, do not error
- [ ] 🟡[EVAL] P2 · `R5 I4 C95% E1h → Score:19` — quickHabitData provided → generate 5 variations of requested habit
- [ ] 🟡[EVAL] P2 · `R5 I3 C95% E1h → Score:14.25` — user wants 1 habit → still generate 5 options
- [ ] 🟡[EVAL] P2 · `R7 I4 C80% E2h → Score:11.2` — HABITS_READY JSON parsing: malformed JSON, trailing text after `]`
- [ ] 🟡[EVAL] P2 · `R9 I4 C90% E1h → Score:32.4` — All 5 habits saved to proposed_habits at generation time

---

## Agent: Explore (Reflection Summarizer)
*`/api/explore` · one-shot summarizer*

- [ ] 🟡[IMPROVE] P2 · `R8 I3 C80% E6h → Score:3.2` — Explore scope too narrow — should cover building AND removing habits; currently only adds reflections · `app/explore/page.tsx`
- [ ] 🟡[EVAL] P2 · `R5 I3 C90% E1h → Score:13.5` — Empty reflection text: should not summarize or save
- [ ] 🟡[EVAL] P2 · `R5 I3 C90% E1h → Score:13.5` — First reflection (no prior history): should not error
- [ ] ⚪[EVAL] P3 · `R5 I2 C70% E2h → Score:3.5` — Profile context summary quality over multiple reflections

---

## Shared Agent Infrastructure
*`lib/agentGuard.ts` · `lib/claude.ts` · `lib/logger.ts` · `lib/langsmith.ts`*

- [ ] 🔴[BUG] P0 · `R9 I5 C95% E0.5h → Score:85.5` — **H1. HABITS_READY regex breaks on trailing text** — `architect.ts:131` uses `\s*$` anchor; if model adds text after `]` parse returns null → 500 · Fix: rm `\s*$` → `/HABITS_READY:(\[[\s\S]+?\])/`
- [ ] 🟠[BUG] P1 · `R8 I5 C70% E2h → Score:14` — **H3. Constellation → Architect handoff unverified** — `architect/route.ts:111-124` only works if constellation route saved a `conversation_memory` row; run full session and verify row in Supabase before demoing integrated flow
- [ ] 🟠[BUG] P1 · `R3 I3 C90% E1h → Score:8.1` — **H2. `habidy_active_habit` not user-scoped** — `dashboard/page.tsx:104` + `architect/page.tsx:144`; cross-user contamination if accounts switched · Fix: scope to `habidy_active_habit_${userId}`
- [ ] 🟡[INFRA] P2 · `R7 I3 C85% E2h → Score:8.9` — Verify tool_logs populated on every agent call
- [ ] 🟡[INFRA] P2 · `R7 I3 C85% E1h → Score:17.9` — Verify LangSmith traces appear for all three agent routes
- [ ] 🟡[GUARDRAIL] P2 · `R8 I4 C85% E3h → Score:9.1` — Add guard assert coverage to all DB reads in constellation + architect
- [ ] 🟡[INFRA] P2 · `R8 I3 C80% E4h → Score:4.8` — Cap conversation turns server-side (not only in system prompt)
- [ ] 🟢[BUILD] P4 · `R5 I3 C60% E16h → Score:0.6` — Multi-agent orchestration research: Claude Code Codex vs current setup

---

## Habit Building — Architect Output → Dashboard
*`/architect` carousel → `POST /api/habits` → `/dashboard`*

- [ ] 🟠[EVAL] P1 · `R9 I4 C95% E1h → Score:34.2` — Max selection enforcement: 3rd tap shows toast, does not save
- [ ] 🟠[EVAL] P1 · `R9 I5 C90% E1h → Score:40.5` — proposed_habits: unselected stay, selected move to habits
- [ ] 🟡[EVAL] P2 · `R9 I3 C95% E0.5h → Score:51.3` — Verify 1.2s redirect to /dashboard after saving
- [ ] 🟡[EVAL] P2 · `R4 I3 C90% E1h → Score:10.8` — Edge case: user selects 0 habits and taps save
- [ ] 🟡[IMPROVE] P2 · `R9 I3 C80% E4h → Score:5.4` — Show structured habit output to user in readable, exciting way after creation · `app/architect/page.tsx`

---

## Dashboard
*`/dashboard` — morning greeting, quote, progress bar, SwipeCheckIn, habit checklist + streak*

- [ ] 🟠[EVAL] P1 · `R9 I3 C95% E1h → Score:25.65` — SwipeCheckIn only appears on first visit of the day
- [ ] 🟠[EVAL] P1 · `R9 I4 C95% E1h → Score:34.2` — Habit log upsert: completing same habit twice should not double-count
- [ ] 🟠[EVAL] P1 · `R9 I4 C90% E2h → Score:16.2` — Streak calculation: test across midnight boundary
- [ ] 🟡[EVAL] P2 · `R9 I3 C90% E1h → Score:24.3` — Progress bar reflects correct completion percentage
- [ ] 🟡[BUILD] P2 · `R9 I3 C90% E3h → Score:8.1` — **7-day streak unlock screen** — users don't know they can unlock more habits; add screen/modal · `app/dashboard/page.tsx`, `app/add-habit/`
- [ ] ⚪[BUILD] P3 · `R7 I3 C70% E8h → Score:1.8` — Chat history view: past agent conversations or summaries · `conversation_memory` table, new UI

---

## Explore
*`/explore` — floating bubbles, Talk to Agent CTA, reflection textarea*

- [ ] 🟡[EVAL] P2 · `R8 I3 C90% E1h → Score:21.6` — Reflection save + profile context regeneration end-to-end
- [ ] 🟡[EVAL] P2 · `R7 I3 C90% E1h → Score:18.9` — Talk to Agent CTA routes to `/constellation` with correct sessionStorage

---

## Social
*`/social` — friends' habit completion, friend requests, add by email*

- [ ] 🟡[EVAL] P2 · `R6 I3 C85% E2h → Score:7.65` — Friend request send + receive flow
- [ ] 🟡[EVAL] P2 · `R6 I2 C90% E1h → Score:10.8` — Add friend by email: not found case
- [ ] ⚪[EVAL] P3 · `R6 I1 C95% E0.5h → Score:11.4` — Communities section shows "coming soon" correctly

---

## Profile
*`/profile` — user profile, identity, sign out*

- [ ] 🟠[EVAL] P1 · `R9 I4 C95% E1h → Score:34.2` — Sign out clears session and redirects to /login
- [ ] ⚪[BUILD] P3 · `R6 I3 C80% E4h → Score:3.6` — Identity statement editable from profile

---

## Add Habit (Streak-Unlocked)
*`/add-habit` — proposed habits from Architect, unlocked at 7-day streak*

- [ ] 🟡[EVAL] P2 · `R7 I4 C90% E1h → Score:25.2` — Gate: only accessible at 7-day streak; test redirect before streak
- [ ] 🟡[EVAL] P2 · `R7 I3 C90% E1h → Score:18.9` — Shows remaining proposed habits (unselected from Architect session)
- [ ] ⚪[EVAL] P3 · `R5 I2 C80% E1h → Score:8` — Generate new habit CTA works

---

## Data Layer (Supabase)
*Schema in `docs/ARCHITECTURE.md` · migrations in `supabase/migrations/`*

- [ ] 🟠[GUARDRAIL] P1 · `R9 I5 C90% E4h → Score:10.1` — RLS policies: verify users can only read/write their own rows on all tables
- [ ] 🟠[GUARDRAIL] P1 · `R8 I4 C90% E2h → Score:14.4` — adminClient() never used in client components
- [ ] 🟡[INFRA] P2 · `R7 I3 C85% E3h → Score:5.95` — Migration test: fresh DB from migrations only (no manual SQL)

---

## Evals
*`evals/` directory · run on every deploy*

- [ ] 🟠[INFRA] P1 · `R8 I4 C80% E6h → Score:4.3` — Wire eval suite to CI (run on every deploy)
- [ ] 🟡[EVAL] P2 · `R2 I2 C90% E1h → Score:3.6` — **M1. forced-summary fallback missing retry wrap** — `evals/agentEval.ts:~324` calls Sonnet without `withRetry`; 429s under heavy load propagate as hard failures · wrap in `withRetry`
- [ ] 🟡[EVAL] P2 · `R2 I2 C95% E0.5h → Score:7.6` — **M2. MAX_TURNS.guided=5 too low** — guided asks 5Q + recap but budget is 5; Q5 uses last turn, recap never fires · fix: raise to 6 or reduce to 4Q
- [ ] ⚪[EVAL] P3 · `R2 I1 C90% E0.5h → Score:3.6` — **M3. Opening "Hello" seed message in judge transcripts** — slightly depresses `questionSpecificity` scores · filter seed turn before scoring
- [ ] 🟡[EVAL] P2 · `R3 I3 C80% E4h → Score:1.8` — runModelComparison.ts: add claude-haiku-4-5-20251001 vs claude-sonnet-4-6
- [ ] 🟡[EVAL] P2 · `R8 I4 C80% E6h → Score:4.3` — LangSmith dataset for Identity Gatherer golden outputs
- [ ] 🟡[EVAL] P2 · `R8 I4 C80% E6h → Score:4.3` — LangSmith dataset for Architect golden outputs
- [ ] ⚪[EVAL] P3 · `R5 I3 C70% E4h → Score:2.6` — LangSmith dataset for Explore summarizer outputs

---

## Phase 2 — Future Agents

### Agent: Habit Breaker (Analyst)
- [ ] 🟢[BUILD] P4 · `R7 I4 C70% E16h → Score:1.2` — Design system prompt for 5-step break flow (name it → cue → craving → trajectory → replace)
- [ ] 🟢[BUILD] P4 · `R5 I3 C70% E4h → Score:2.6` — Handoff from Habit Breaker to Architect for replacement habit

### Agent: Navigator (Daily Planner)
- [ ] 🟢[BUILD] P4 · `R6 I4 C60% E24h → Score:0.6` — Google Calendar integration
- [ ] 🟢[BUILD] P4 · `R4 I3 C60% E16h → Score:0.45` — Notion API integration
- [ ] 🟢[BUILD] P4 · `R6 I4 C60% E16h → Score:0.9` — Energy-aware scheduling logic

---

## Phase 2 — Future Features

- [ ] 🟢[BUILD] P4 · `R8 I5 C70% E32h → Score:0.9` — RAG / pgvector knowledge base (Atomic Habits PDF already in `HabitRagData/`)
- [ ] 🟢[BUILD] P4 · `R7 I4 C70% E24h → Score:0.8` — Goals + Key Results (OKR) data model + UI
- [ ] 🟢[BUILD] P4 · `R7 I3 C70% E12h → Score:1.2` — Energy logging + patterns
- [ ] 🟢[BUILD] P4 · `R8 I4 C70% E16h → Score:1.4` — AI daily + weekly summaries
- [ ] 🟢[BUILD] P4 · `R6 I3 C60% E12h → Score:0.9` — Google Calendar habit time blocks
- [ ] 🟢[BUILD] P4 · `R8 I3 C70% E16h → Score:1.1` — Push notifications / widgets
- [ ] 🟢[BUILD] P4 · `R8 I2 C80% E8h → Score:1.6` — Google OAuth
- [ ] 🟢[BUILD] P4 · `R7 I4 C60% E32h → Score:0.5` — Communities / group challenges
- [ ] 🟢[BUILD] P4 · `R6 I4 C60% E24h → Score:0.6` — Analytics / identity goals page (see phone screenshot Apr 27–30 for design reference: bright colors, exciting info layout)

---

## ✅ Resolved (archive — do not re-introduce)

- [x] 🔴[BUG] **B1. `profile_name` column doesn't exist** — `social.sql` only adds `display_name`; broke `profile/page.tsx:44`, `agents/architect/route.ts:86`, `agents/constellation/route.ts:75` silently; replaced with `display_name` · *Fixed May 4, 2026*
- [x] 🔴[BUG] **B2. DEFAULT_MODEL stale `claude-sonnet-4-5`** — `lib/claude.ts:34` updated to `claude-sonnet-4-6` · *Fixed May 1, 2026*
- [x] ⚫[INFRA] **Ghost auth users** — expected, not a bug; `auth.users` created at `signUp()`, `public.users` created at loading screen; users who close mid-onboarding have auth record but no profile · *Investigated May 1, 2026*

---

## 🅿️ Parking Lot / Open Questions

*Not tasks yet — needs more definition, a decision, or is out of scope for current phase.*

- **Monetization** — Goal-completion payment model (pay in, refund on success)? How do we monetize this product? Needs business/legal research before becoming a scoped task.
- **Voice control (ElevenLabs API)** — Voice input/output for agent conversations. Compelling for accessibility + engagement. Needs product decision before scoping.
- **Multi-agent orchestration** — Claude Code Codex approach vs current single-agent-per-route. Spike needed before any architecture change.
- **Ghost auth users** — Supabase creates `auth.users` at signup, `public.users` only at loading screen. Users who abandon mid-onboarding have an auth record but no profile. Not a bug — but should we detect this and re-prompt on next login?
- **Habit cap long-term** — Currently max 2 active habits from Architect. When does this increase? What's the unlock model beyond the 7-day streak?
- **Demographic data use** — Profile collects DOB, gender, address. How and when does this influence agent behavior? No spec yet.
