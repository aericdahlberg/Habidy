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

**Status:**
`[ ]` todo · `[~]` in progress · `[!]` blocked (add reason inline) · `[x]` done

**RICE Score** = `(Reach × Impact × Confidence%) / Effort_hours`
- **Reach** 1–10: fraction of users affected
- **Impact** 1–5: 1=minor fix, 3=meaningful, 5=core flow
- **Confidence** %: certainty in the approach
- **Effort** hours: estimate to ship

Higher score = do first. Re-score after each launch or major feedback round.

---

## 🏃 Now — Current Sprint

**Sprint goal:** Stabilize the core agent flow end-to-end so the demo path works reliably.
**Capacity:** ~9.5h · **Items:** 5

Pull items here at the start of a session. Move back to their section when done.

- [x] 🔴[BUILD] P0 · `R6 I4 C60% E24h → Score:0.6` — Google Calendar integration
  **Done when:** architecture agent can read calendar events and propose non-conflicting habit time blocks · *Shipped May 6, 2026 — custom OAuth flow, google_calendar_tokens table, architect [CALENDAR CONTEXT] injection, recurring habit events with reminders, onboarding calendar screen, profile connect/disconnect*
- [x] 🟢[BUILD] P4 · `R6 I3 C60% E12h → Score:0.9` — Google Calendar habit time blocks
- [ ] 🟢[BUILD] P4 · `R8 I3 C70% E16h → Score:1.1` — Push notifications / widgets
  **Done when:** user receives a daily habit reminder at a user-set time without opening the app
  - **Email / push reminders** — "Don't break your streak" trigger. Waiting on Google Calendar integration first — calendar reminders will be more contextual than a generic daily email. Revisit when Google Calendar is scoped.
- [ ] 🟢[BUILD] P4 · `R8 I2 C80% E8h → Score:1.6` — Google OAuth
  **Done when:** user can sign up and log in with Google; Supabase session works identically to email/password flow


Sprint 2
- [x] 🟠[INFRA] P1 · `R9 I4 C95% E2h → Score:17.1` — **Set up test runner + sanitize.ts coverage** — Vitest configured; 47 unit tests covering all 13 injection patterns, 8 innocent-text false-positive checks, fence escape, sanitizeLatestUserMessage, sanitizeMessageHistory · `lib/sanitize.ts`, `lib/sanitize.test.ts` · *Fixed May 6, 2026*
- [ ] 🔴[BUG] P0 `Score:85.5` **H1. HABITS_READY regex breaks on trailing text** — `architect.ts:131` · 0.5h
- [ ] 🟠[BUG] P1 `Score:14` **H3. Constellation → Architect handoff unverified** — run full session, verify `conversation_memory` row in Supabase · 2h
- [x] 🟠[GUARDRAIL] P1 `Score:8` **Prompt injection hardening — Identity Gatherer** — validate + sanitize input before system prompt injection · 4h · *Fixed May 6, 2026*
- [ ] 🟠[EVAL] P1 `Score:42.8` **Architect: vague identity → ask follow-up, never HABITS_READY** · 1h
- [ ] 🟠[EVAL] P1 `Score:42.8` **Architect: no cue → don't advance to HABITS_READY** · 1h

---

## Auth

- [ ] ⚪[BUILD] P3 · `R6 I2 C80% E4h → Score:2.4` — Add forgot password flow
  **Done when:** user can request reset, receive email, and set new password without error
- [ ] ⚪[BUILD] P3 · `R6 I2 C80% E3h → Score:3.2` — Add email confirmation screen post-signup
  **Done when:** new signup shows "check your email" screen; unconfirmed users cannot access the app

---

## Onboarding — Screen 1: Welcome
*`/welcome` → `/onboarding`*

- [ ] 🟡[IMPROVE] P2 · `R9 I3 C90% E3h → Score:8.1` — Positivity framing: open with "Who do you see yourself as in 1 year?" — no language that makes users feel bad about who they aren't yet; every action = 1% better · `app/onboarding/`

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

- [x] 🟠[BUG] P1 · `R5 I4 C90% E1h → Score:18` — **M4. Re-trigger wipes user data** — `loading/page.tsx` uses `upsert` reading from sessionStorage which is cleared after first save; back + re-trigger overwrites identity/goal_category/friction_point with null · Fix: early return in `saveAndRedirect()` if `identityStatement` is empty · *Fixed May 6, 2026*
- [x] 🟡[BUILD] P2 · `R4 I3 C80% E4h → Score:2.4` — Persist onboarding progress so users who quit halfway can resume
  **Done when:** user who leaves mid-onboarding and returns sees their previously entered data pre-filled on the correct screen · *Fixed May 6, 2026 — onboarding_drafts table, use-onboarding-draft hook, welcome routing*

---

## Google Calendar Integration
*`/onboarding/calendar`, `/profile`, `/api/auth/google`, `/api/calendar/*`, `lib/google-auth.ts`, `lib/google-calendar.ts`*

*Run migration before testing: paste `supabase/migrations/20260506_google_calendar.sql` into the Supabase dashboard SQL editor, or run `supabase db push`.*

- [ ] 🔴[EVAL] P0 · `R6 I5 C90% E1h → Score:27` — **GC1. OAuth connect flow end-to-end**
  **Done when:** clicking "Connect Google Calendar" in onboarding or profile → Google consent screen → callback → tokens stored in `google_calendar_tokens` → `users.google_calendar_connected = true` → redirect lands on correct page with no error

- [ ] 🔴[EVAL] P0 · `R6 I5 C90% E0.5h → Score:54` — **GC2. Onboarding skip still saves**
  **Done when:** clicking "Skip for now" on `/onboarding/calendar` routes to `/onboarding/loading` and loading page saves all onboarding data correctly (no regression)

- [ ] 🟠[EVAL] P1 · `R6 I4 C85% E1h → Score:20.4` — **GC3. Calendar context injected into Architect**
  **Done when:** for a connected user, a LangSmith trace for the Architect shows a `[CALENDAR CONTEXT]` block in the user message with real event titles and times

- [ ] 🟠[EVAL] P1 · `R6 I4 C85% E1h → Score:20.4` — **GC4. Recurring habit event appears in Google Calendar**
  **Done when:** selecting a habit with "Adding to Google Calendar" toggled on → event with correct habit name visible in Google Calendar starting tomorrow, marked as daily recurring, with a 5-minute popup reminder

- [ ] 🟠[EVAL] P1 · `R6 I3 C90% E0.5h → Score:32.4` — **GC5. Disconnect clears tokens**
  **Done when:** clicking Disconnect in profile → `google_calendar_tokens` row deleted → `users.google_calendar_connected = false` → profile shows "Not connected" → Architect no longer receives `[CALENDAR CONTEXT]`

- [ ] 🟡[EVAL] P2 · `R6 I3 C80% E1h → Score:14.4` — **GC6. Token auto-refresh on expiry**
  **Done when:** manually set `expires_at` to a past timestamp in `google_calendar_tokens` → trigger Architect → access token silently refreshed → new token stored → calendar events still load correctly

- [ ] 🟡[EVAL] P2 · `R3 I3 C80% E0.5h → Score:14.4` — **GC7. Revoked token graceful fallback**
  **Done when:** remove app access in Google Account settings → next Architect session receives no `[CALENDAR CONTEXT]` (not a crash or 500); profile still shows connected until user explicitly disconnects

- [ ] 🟡[EVAL] P2 · `R6 I2 C90% E0.5h → Score:21.6` — **GC8. `suggested_time` missing → safe default**
  **Done when:** if model response omits `suggested_time` field in HABITS_READY JSON, calendar event still creates (defaults to morning / 7am); habit save does not fail

- [ ] ⚪[EVAL] P3 · `R4 I2 C85% E1h → Score:6.8` — **GC9. Profile status reflects OAuth redirect correctly**
  **Done when:** after connect → `/profile?calendar=connected` shows green "Google Calendar connected!" banner; after error → red "Could not connect" banner; banners don't persist on page refresh

- [ ] 🟠[EVAL] P1 · `R6 I5 C85% E1h → Score:25.5` — **GC14. Auto-dismiss when logged**
  **Done when:** log a habit complete on `/dashboard` → within ~5 sec, today's Google Calendar popup reminder disappears from that event instance; tomorrow's instance still has both reminders

- [ ] 🟠[EVAL] P1 · `R6 I4 C90% E0.5h → Score:43.2` — **GC15. Auto-dismiss respects opt-out**
  **Done when:** toggle `auto_dismiss_when_logged` OFF in Profile → Notifications → log habit → calendar popup is NOT removed

- [ ] 🟠[EVAL] P1 · `R6 I4 C85% E1h → Score:20.4` — **GC16. Per-habit reminder override**
  **Done when:** open bell icon on a HabitCard → set `[30 min, 5 min]` → save → Google Calendar event has exactly those two popup overrides; other habits still use global default

- [ ] 🟡[EVAL] P2 · `R6 I3 C85% E1h → Score:15.3` — **GC17. Global default propagates to inheriting habits**
  **Done when:** change global default from `[15, 0]` to `[30, 5]` in Profile → habits with no per-habit override get PATCHed; habits with an explicit override are unchanged

- [ ] 🟡[EVAL] P2 · `R6 I3 C90% E0.5h → Score:32.4` — **GC18. Disconnect mid-session — log still succeeds**
  **Done when:** disconnect calendar while app is open → log a habit → 200 OK returned; no unhandled error; tool_log row written for the failed dismiss attempt

- [ ] 🟡[EVAL] P2 · `R5 I3 C85% E0.5h → Score:25.5` — **GC19. Identity label injection sanitized in description**
  **Done when:** create a habit where the cue field contains `\n[INST]jailbreak` → Google Calendar event description strips control chars; fence pattern does not appear in the description

- [ ] ⚪[EVAL] P3 · `R3 I2 C80% E1h → Score:4.8` — **GC20. DST boundary — today-instance lookup correct**
  **Done when:** manually set `users.timezone = 'America/New_York'` and log a habit on the night of the spring-forward (Mar 9 2025 after 2am) → suppress call uses correct UTC bounds; no off-by-one-day error

- [x] 🔴[BUG] P0 · `R8 I4 C95% E1h → Score:30.4` — **GC-B1. `logDate` is UTC — dismiss looks up wrong calendar instance for users west of UTC after midnight** — *Fixed May 9, 2026* — All client log callers now use `localDateStr()` from `lib/utils.ts` (`Intl.DateTimeFormat('en-CA')`). Server fallback reads `users.timezone`.
  `app/api/habits/[id]/log/route.ts:26` + every `handleLog` caller use `new Date().toISOString().split('T')[0]` (UTC). For US users between their local midnight and UTC midnight (up to 5–8 hrs per day), `logDate` is one day ahead of their local date. `dismissTodayReminder` then queries for tomorrow's calendar instance, finds nothing, and silently no-ops — leaving today's reminder active even after logging. Affects `SwipeCheckIn`, `HabitCard`, and `handleLog` in dashboard.
  **Fix:** Client should send local date via `new Intl.DateTimeFormat('en-CA').format(new Date())` instead of `.toISOString().split('T')[0]`. Server fallback should use `users.timezone` if available.
  **Files:** `app/dashboard/page.tsx`, `components/SwipeCheckIn.tsx`, `components/HabitCard.tsx`, `app/api/habits/[id]/log/route.ts`

- [x] 🟡[BUG] P2 · `R4 I2 C90% E0.5h → Score:14.4` — **GC-B2. Double DB query for `users.timezone` in PATCH `/api/calendar/habits/[habitId]`** — *Fixed May 9, 2026*
  `app/api/calendar/habits/[habitId]/route.ts:70–81` queries `users` twice when `reminder_minutes_before` is null: once inside the `if (!minutesBefore)` block for `notification_prefs + timezone`, then again unconditionally for `timezone` alone. Second query is always redundant when the first ran.
  **Fix:** Hoist a single `select('notification_prefs, timezone')` query to the top of the handler and reuse it.
  **Files:** `app/api/calendar/habits/[habitId]/route.ts`

- [x] 🟡[BUG] P2 · `R3 I2 C80% E1h → Score:4.8` — **GC-B3. `savedHabits[i]` index alignment not guaranteed in architect page** — *Fixed May 9, 2026* — Uses `habit_name → id` Map instead of positional index.
  `app/architect/page.tsx:161` uses `savedHabits[i]?.id` to match inserted habit IDs back to `selectedHabits` by position. Supabase `.insert().select()` returns rows in insert order which holds in practice but is not guaranteed by PostgreSQL. A mis-ordered response would write the wrong `google_calendar_event_id` to the wrong habit row.
  **Fix:** API should return `{ habits: [...] }` with each row including its source `habit_name`; client should match by name rather than index.
  **Files:** `app/architect/page.tsx`, `app/api/habits/route.ts`

- [x] ⚪[IMPROVE] P3 · `R2 I1 C95% E0.5h → Score:3.8` — **GC-B4. Dead re-export in API route file** — *Fixed May 9, 2026*
  `app/api/profile/notification-prefs/route.ts:91` re-exports `DEFAULT_NOTIFICATION_PREFS`. API route files should only export HTTP handlers; the constant is already importable from `lib/notification-prefs.ts`. Remove the re-export.
  **Files:** `app/api/profile/notification-prefs/route.ts`

---

### CLAUDE.md Violations from Calendar reminder build

- [x] 🔴[INFRA] P0 · `R9 I4 C95% E3h → Score:11.4` — **DEBT-1. No tests written for new calendar lib functions** — *Fixed May 9, 2026* — 26 tests across 3 files: `lib/notification-prefs.test.ts` (9 tests), `lib/google-calendar-helpers.test.ts` (12 tests), `lib/calendar-dismiss.test.ts` (6 bail-condition + happy-path tests). Total suite: 73 tests.

- [x] 🟠[INFRA] P1 · `R5 I3 C95% E2h → Score:7.1` — **DEBT-2. `lib/google-calendar.ts` was 256 lines** — *Fixed May 9, 2026* — Split into `lib/google-calendar.ts` (API call functions, ~145 lines) and `lib/google-calendar-helpers.ts` (types, pure helpers, constants). All external imports unchanged via re-exports.

- [x] 🟡[INFRA] P2 · `R3 I2 C95% E1h → Score:5.7` — **DEBT-3. `POST /api/calendar/habits` used manual `createServerClient`** — *Fixed May 9, 2026* — Replaced with `getRouteUser()` to match all other new routes.

- [x] 🟡[GUARDRAIL] P2 · `R4 I3 C90% E1h → Score:10.8` — **DEBT-4. `default_minutes_before` not validated for range** — *Fixed May 9, 2026* — Added validation: values must be non-negative integers ≤ 40320. Returns 400 on invalid input.

- [x] 🟡[INFRA] P2 · `R5 I2 C95% E1h → Score:9.5` — **DEBT-5. Plan Mode not entered before build started** — *Fixed May 9, 2026* — PreToolUse hook (`require-plan.sh`) now blocks all file writes until `.claude/plans/plan-{session_id}.md` exists. Plan files are session-scoped so multiple simultaneous agents never conflict, and each new conversation automatically requires a fresh plan (no manual cleanup needed). Old plan files are auto-deleted after 48 hours.

- [ ] 🟡[GUARDRAIL] P2 · `R4 I2 C90% E0.5h → Score:14.4` — **GC10. Revoke Google token on disconnect** — `disconnectCalendar()` only deletes the DB row; the refresh token stays live in Google until it expires (up to 6 months). Call `https://oauth2.googleapis.com/revoke?token=<refresh_token>` before deleting the row. · `lib/google-auth.ts`
  **Done when:** disconnect hits the revoke endpoint; a 400 from Google (already revoked) is swallowed without breaking the disconnect flow

- [ ] 🟡[IMPROVE] P2 · `R5 I3 C80% E3h → Score:5` — **GC11. Store calendar event IDs** — recurring events are created but their IDs are never stored; if user removes a habit we can't delete the calendar event. Add `google_calendar_event_id text` to `habits` table; populate on `POST /api/calendar/habits`. · `lib/google-calendar.ts`, `app/api/calendar/habits/route.ts`, `supabase/migrations/`
  **Done when:** `habits.google_calendar_event_id` is set after each successful calendar write; a disconnect or habit-delete triggers `DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/<eventId>`

- [ ] 🟡[IMPROVE] P2 · `R6 I2 C85% E2h → Score:5.1` — **GC12. Cache calendar context fetch** — `getValidAccessToken` + Calendar API called fresh on every Architect page load. Add a short-lived server-side cache (Map keyed by userId, TTL 5 min) or pass a `Cache-Control` header so back-navigation doesn't re-fetch. · `app/api/calendar/events/route.ts`
  **Done when:** a second Architect load within 5 minutes does not call the Google Calendar API; cache invalidates on disconnect

- [ ] 🟡[IMPROVE] P2 · `R9 I2 C95% E3h → Score:5.7` — **GC13. Refactor `architect/page.tsx` (401 lines — 2× file cap)** — extract `<HabitCard>`, `<SaveBar>`, and calendar toggle into sub-components in `app/architect/components/`. · `app/architect/page.tsx`
  **Done when:** `architect/page.tsx` is under 200 lines; extracted components each stay under 200 lines; build passes

---

## Mode Selection
*`/mode-select` — quick (2 min) / guided (7 min) / deep (20 min)*

- [ ] ⚪[BUILD] P3 · `R8 I4 C80% E8h → Score:3.2` — Agent engagement mode preference: "Into it / Medium / Easy" — affects depth of Constellation session · `lib/agents/constellation.ts`, onboarding preference screen
  **Done when:** user selects a depth preference, selection is passed to constellation, and the correct prompt mode fires (guided/deep/easy)

---

## Quick Habit Flow
*`/quick-habit` → pre-generates habits → `/architect`*

---

## Agent: Identity Gatherer (Constellation)
*`lib/agents/constellation.ts` · `/api/agents/constellation` · `/constellation`*

- [x] 🟠[GUARDRAIL] P1 · `R8 I5 C80% E4h → Score:8` — **Prompt injection hardening** — validate and sanitize user input before injecting into system prompt · *Fixed May 6, 2026 — lib/sanitize.ts, constellation split, architect, routes, evals*
- [ ] 🟡[EVAL] P2 · `R7 I4 C80% E3h → Score:7.5` — **Agent conversations depth vs efficiency** — How can we evaluate both agent system prompts to achieve this blance 
- [ ] 🟡[GUARDRAIL] P2 · `R8 I4 C75% E4h → Score:6` — No input character limits — users could paste massive text; verify Claude safety rails handle harmful habit requests
- [ ] 🟡[IMPROVE] P2 · `R8 I3 C80% E4h → Score:4.8` — Guided mode wrap-up message quality
- [ ] 🟡[IMPROVE] P2 · `R5 I3 C80% E4h → Score:3` — Deep mode wrap-up message quality
- [ ] ⚪[BUILD] P3 · `R7 I4 C70% E6h → Score:3.3` — Energy/schedule awareness: ask about energizing vs draining, best time of day, existing frequency · use to schedule habits optimally
  **Done when:** agent asks at least one energy/schedule question and the answer is reflected in the generated cue field of the session summary
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
- [ ] 🟡[BUILD] P2 · `R8 I4 C70% E6h → Score:3.7` — **Habit progression planning** — after initial habit, outline path: "Start X → progress to Y → then Z" · Architect agent
  **Done when:** architect closing message or habit card includes a 3-step progression path tied to the user's identity goal
- [ ] 🟡[BUILD] P2 · `R9 I5 C80% E4h → Score:9` — **Difficulty feedback handling** — when weekly check-in returns "Too Easy", re-prompt Architect with current habit + level-up instruction; "Too Hard" → scale down · `lib/agents/architect.ts`
  **Done when:** Architect generates a harder or easier variation of an existing habit when triggered with difficulty feedback context; variation maintains the same identity label
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

- [ ] 🟡[IMPROVE] P2 · `R8 I3 C80% E6h → Score:3.2` — Explore scope too narrow — should cover building AND removing habits · `app/explore/page.tsx`
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
  **Done when:** spike doc exists in `docs/` comparing both approaches with a stated recommendation

---

## Habit Building — Architect Output → Dashboard
*`/architect` carousel → `POST /api/habits` → `/dashboard`*

- [ ] 🟠[EVAL] P1 · `R9 I4 C95% E1h → Score:34.2` — Max selection enforcement: 3rd tap shows toast, does not save
- [ ] 🟠[EVAL] P1 · `R9 I5 C90% E1h → Score:40.5` — proposed_habits: unselected stay, selected move to habits
- [ ] 🟡[EVAL] P2 · `R9 I3 C95% E0.5h → Score:51.3` — Verify 1.2s redirect to /dashboard after saving
- [ ] 🟡[EVAL] P2 · `R4 I3 C90% E1h → Score:10.8` — Edge case: user selects 0 habits and taps save
- [ ] 🟡[IMPROVE] P2 · `R9 I3 C80% E4h → Score:5.4` — Show structured habit output in a readable, exciting way after creation · `app/architect/page.tsx`

---

## Dashboard
*`/dashboard` — morning greeting, quote, progress bar, SwipeCheckIn, habit checklist + streak*

- [ ] 🟠[EVAL] P1 · `R9 I3 C95% E1h → Score:25.65` — SwipeCheckIn only appears on first visit of the day
- [ ] 🟠[EVAL] P1 · `R9 I4 C95% E1h → Score:34.2` — Habit log upsert: completing same habit twice should not double-count
- [ ] 🟠[EVAL] P1 · `R9 I4 C90% E2h → Score:16.2` — Streak calculation: test across midnight boundary
- [ ] 🟡[EVAL] P2 · `R9 I3 C90% E1h → Score:24.3` — Progress bar reflects correct completion percentage
- [ ] 🟡[BUILD] P2 · `R9 I3 C90% E3h → Score:8.1` — **7-day streak unlock screen** — users don't know they can unlock more habits; add screen/modal · `app/dashboard/page.tsx`, `app/add-habit/`
  **Done when:** at exactly 7-day streak, a celebratory screen or modal appears explaining the add-habit unlock; user can dismiss and navigate to /add-habit
- [ ] ⚪[BUILD] P3 · `R7 I3 C70% E8h → Score:1.8` — Chat history view: past agent conversations or summaries · `conversation_memory` table, new UI
  **Done when:** user can view their last 3 agent sessions (identity gatherer + architect) from anywhere in the app
- [ ] 🟠[BUILD] P1 · `R9 I4 C85% E4h → Score:7.65` — **Habit phase progress bar per habit** — Building (0–6d) → Establishing (7–20d) → Maintaining (21+d); shows on HabitCard and Dashboard
  **Done when:** each habit card shows current phase label + progress bar + "X days to [next phase]"; phases update automatically from streak
- [ ] 🟡[BUILD] P2 · `R9 I3 C85% E6h → Score:3.83` — **Weekly completion ring per habit** — ring visualization of this week's completions (e.g. 5/7 filled)
  **Done when:** dashboard shows a per-habit ring for the current week; ring fills as habits are logged each day

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
  **Done when:** user can tap to edit identity statement on /profile, save updates `users.identity_statement` in Supabase, and see the change reflected immediately without a reload
- [ ] 🟡[BUILD] P2 · `R7 I3 C90% E3h → Score:6.3` — **Personal insights: surface reflection summary** — display `user_profile_context.summary` in readable form on /profile
  **Done when:** /profile shows an AI-generated "Here's what we know about you" paragraph from `user_profile_context.summary`; updates after each new reflection
- [ ] 🟡[BUILD] P2 · `R7 I3 C75% E8h → Score:1.97` — **Behavioral patterns display** — at least one insight derived from `habit_logs` (e.g. "You complete habits most consistently in the morning")
  **Done when:** /profile shows a pattern card with ≥1 data-driven behavioral insight; derived from habit log timestamps or completion rates

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

## Habit Phase Progression System
*Communicates long-term value — "this habit is becoming part of who you are."*

Phases: **Building** (0–6 days) → **Establishing** (7–20 days) → **Maintaining** (21+ days)

- [ ] 🟠[BUILD] P1 · `R9 I4 C90% E2h → Score:16.2` — Add phase + daysToNextPhase to habit data — derive from streak in `GET /api/habits`
  **Done when:** every habit object includes `phase` ("building" | "establishing" | "maintaining") and `daysToNextPhase` count; streak reset returns to "building"
- [ ] 🟠[BUILD] P1 · `R9 I4 C85% E4h → Score:7.65` — Phase progress bar component on HabitCard — label + bar + "X days to [next phase]"
  **Done when:** HabitCard shows e.g. "Building · 4 days to Establishing" with a progress bar that fills as streak grows
- [ ] 🟡[BUILD] P2 · `R9 I3 C85% E3h → Score:7.65` — Phase milestone celebration — moment of delight at day 7 (Establishing) and day 21 (Maintaining)
  **Done when:** a celebratory animation or banner fires exactly at day 7 and day 21; visually distinct from daily streak celebration
- [ ] 🔵[EVAL] P2 · `R9 I4 C90% E1h → Score:32.4` — Phase calculation: 0–6=Building, 7–20=Establishing, 21+=Maintaining; streak reset returns to Building
- [ ] 🔵[EVAL] P2 · `R7 I3 C85% E1h → Score:17.85` — daysToNextPhase is accurate and counts down correctly each day

---

## Weekly Difficulty Check-in
*Every 7 days per habit: Too Easy / Just Right / Too Hard → drives difficulty progression so habits stay challenging.*

- [ ] 🟠[BUILD] P1 · `R9 I5 C85% E4h → Score:9.56` — **WeeklyCheckIn component** — modal or card after 7-day interval; three options: Too Easy / Just Right / Too Hard
  **Done when:** after a habit hits a 7-day multiple, user sees a prompt for that habit; dismissable; re-prompts next session if skipped; won't fire twice for the same interval
- [ ] 🟠[INFRA] P1 · `R9 I4 C85% E2h → Score:15.3` — `POST /api/habits/[id]/difficulty-feedback` — saves to `habit_difficulty_logs`, returns recommended action
  **Done when:** route saves rating + timestamp; returns `{ action: "level_up" | "keep" | "scale_down" }`
- [ ] 🟠[BUILD] P1 · `R9 I4 C80% E2h → Score:14.4` — Weekly trigger logic — detect when habit hits 7-day interval and hasn't been rated
  **Done when:** trigger fires on day 7, 14, 21, etc. without double-triggering; tracked via `last_rated_at` on habit or difficulty_logs
- [ ] 🟠[BUILD] P1 · `R8 I5 C80% E4h → Score:8` — Level-up path: "Too Easy" → Architect pre-seeded with current habit + level-up instruction
  **Done when:** tapping "Too Easy" launches Architect with the existing habit in context and a prompt to generate a harder variation
- [ ] 🟡[BUILD] P2 · `R5 I4 C75% E3h → Score:5` — Scale-down path: "Too Hard" → Architect pre-seeded for easier variation
  **Done when:** tapping "Too Hard" launches Architect to generate an easier version of the same habit
- [ ] 🔵[EVAL] P2 · `R9 I4 C90% E1h → Score:32.4` — Check-in fires at correct interval; does not fire twice for same period
- [ ] 🔵[EVAL] P2 · `R8 I4 C85% E1h → Score:27.2` — "Just Right" saves to difficulty_logs with no redirect; habit unchanged
- [ ] 🔵[EVAL] P2 · `R7 I4 C80% E1h → Score:22.4` — Architect correctly generates harder/easier variation when triggered with difficulty context

---

## Phase 2 — Discovery & Recovery Agents

### Agent: Safari (Habit Discovery)
*`lib/agents/safari.ts` · `/api/agents/safari` · `/safari`*

Activity-driven exploration — not identity-driven. User talks about what they already enjoy day-to-day; Safari finds habit opportunities inside those activities. Lighter and more browsable than Constellation.

- [ ] 🟢[BUILD] P3 · `R8 I4 C75% E8h → Score:3` — System prompt: ask what user enjoys doing day-to-day; surface ≥3 habit opportunities from existing activities
  **Done when:** agent completes a conversation identifying habit opportunities tied to activities the user already does; never suggests generic habits
- [ ] 🟢[BUILD] P3 · `R8 I4 C80% E6h → Score:4.27` — /safari page + ChatInterface + gradient styling
  **Done when:** /safari renders correctly; Coach tab in BottomNav offers Safari as an option alongside Constellation
- [ ] 🟢[BUILD] P3 · `R8 I4 C80% E4h → Score:6.4` — `/api/agents/safari` route — agentGuard, logging, LangSmith tracing
- [ ] 🟢[BUILD] P3 · `R7 I4 C75% E3h → Score:7` — Handoff to Architect: "Build a habit from this" pre-seeds Architect with discovered activity context
  **Done when:** at Safari session close, user can tap "Build a habit from this" and Architect opens pre-seeded with the activity
- [ ] 🔵[EVAL] P3 · `R8 I3 C85% E2h → Score:10.2` — Agent doesn't suggest habits before understanding current activities
- [ ] 🔵[EVAL] P3 · `R8 I4 C80% E2h → Score:12.8` — Agent surfaces genuine activity-based opportunities (not generic suggestions like "drink more water")
- [ ] 🟢[BUILD] P4 · `R8 I3 C60% E20h → Score:0.72` — Browsable content feed: habit discovery by category with popularity ranking
  **Done when:** /safari has a browse tab; habits clicked more often surface higher in the feed

### Agent: Habit Breaker
*`lib/agents/habit-breaker.ts` · `/api/agents/habit-breaker` · `/habit-breaker`*

Psychological deep-dive. Asks pointed questions about blockers, misalignments, emotional patterns, and environmental factors — not solutions first. Gets to root cause, then finds replacements. User-initiated.

- [ ] 🟢[BUILD] P3 · `R7 I5 C70% E10h → Score:2.45` — System prompt: psychological investigation — blockers, misalignments, cue/pattern/purpose analysis; root cause before replacement
  **Done when:** agent completes a session identifying a root cause and ≥1 replacement direction without jumping to solutions before exploring blockers from ≥2 angles (emotional, environmental, schedule)
- [ ] 🟢[BUILD] P3 · `R7 I4 C80% E6h → Score:3.73` — /habit-breaker page + ChatInterface
  **Done when:** page renders; accessible from Coach tab as an option alongside Safari and Constellation
- [ ] 🟢[BUILD] P3 · `R7 I4 C80% E4h → Score:5.6` — `/api/agents/habit-breaker` route — standard agent pattern
- [ ] 🟢[BUILD] P3 · `R6 I4 C75% E3h → Score:6` — Handoff to Architect for replacement habit after root cause identified
  **Done when:** "Let's build a replacement" routes to Architect pre-seeded with root cause context
- [ ] 🔵[EVAL] P3 · `R7 I5 C80% E2h → Score:14` — Agent doesn't jump to solutions before identifying root cause
- [ ] 🔵[EVAL] P3 · `R7 I4 C80% E2h → Score:11.2` — Agent explores emotional, environmental, and schedule dimensions before concluding
- [ ] 🔵[EVAL] P3 · `R6 I3 C80% E1h → Score:14.4` — Proactive entry: neglected-habit notification (3+ days no logs) → opens Habit Breaker for that habit
  *(Dependency: Google Calendar / reminders infra)*

 ## Agent: Navigator (Project Manager Mode)

- [ ] 🟢[BUILD] P4 · `R4 I3 C60% E16h → Score:0.45` — Notion API integration
- [ ] 🟢[BUILD] P4 · `R6 I4 C60% E16h → Score:0.9` — Energy-aware scheduling logic
  **Done when:** navigator recommends habit timing based on logged energy patterns

  ## New Agent?: Project Planner
- [ ] 🟠[BUILD] P1 · `R9 I5 C80% E6h → Score:6` — **Navigator system prompt: project intake**
  **Done when:** agent accepts a project name + deadline + rough scope; asks ≤3 clarifying questions; outputs a structured task list with time estimates

- [ ] 🟠[BUILD] P1 · `R9 I5 C80% E6h → Score:6` — **Notion integration: create project page + task list**
  **Done when:** Navigator outputs are written to a Notion page via Notion API; tasks appear as a database with status, due date, and time estimate fields

- [ ] 🟠[BUILD] P1 · `R9 I5 C80% E8h → Score:4.5` — **Google Calendar: schedule task blocks from Notion**
  **Done when:** each task in the Notion DB gets a corresponding Google Calendar time block assigned within the project deadline window; conflicts with existing events are avoided using calendar read access

- [ ] 🟠[BUILD] P1 · `R9 I4 C75% E4h → Score:6.75` — **Daily digest: "here's what's on your plate today"**
  **Done when:** dashboard or Navigator page shows today's assigned tasks pulled from Google Calendar + Notion; user can mark complete from this view

- [ ] 🟡[EVAL] P2 · `R8 I4 C85% E1h → Score:27.2` — Navigator: vague project → ask clarifying questions, never schedule without scope
- [ ] 🟡[EVAL] P2 · `R8 I4 C85% E1h → Score:27.2` — Navigator: deadline conflict → surface it, don't silently overbook
- [ ] 🟡[GUARDRAIL] P2 · `R7 I3 C90% E1h → Score:18.9` — Sanitize project/task names before Notion API injection

---

## Phase 2 — Future Features

- [ ] 🟢[BUILD] P4 · `R8 I5 C70% E32h → Score:0.9` — RAG / pgvector knowledge base (Atomic Habits PDF already in `HabitRagData/`)
  **Done when:** agents can retrieve relevant Atomic Habits passages to support their recommendations
- [ ] 🟢[BUILD] P4 · `R7 I4 C70% E24h → Score:0.8` — Goals + Key Results (OKR) data model + UI
  **Done when:** user can create a goal, attach habits to it, and see progress toward key results
- [ ] 🟢[BUILD] P4 · `R7 I3 C70% E12h → Score:1.2` — Energy logging + patterns
  **Done when:** user can log energy level after habits; dashboard shows weekly energy trend
- [ ] 🟢[BUILD] P4 · `R8 I4 C70% E16h → Score:1.4` — AI daily + weekly summaries
  **Done when:** user receives a generated summary of their week: what worked, what to adjust

  
- [ ] 🟢[BUILD] P4 · `R7 I4 C60% E32h → Score:0.5` — Communities / group challenges
- [ ] 🟢[BUILD] P4 · `R6 I4 C60% E24h → Score:0.6` — Analytics / identity goals page (see phone screenshot Apr 27–30 for design reference: bright colors, exciting info layout)
  **Done when:** user can see identity progress visualized with at least 3 metrics tied to their stated identity goal

---

## Phase 2 — Insights Screen
*`/insights` — per-habit charts, projected progress, identity alignment over time. V1 charts live on Dashboard; this is the full screen.*

- [ ] 🟢[BUILD] P4 · `R8 I4 C70% E16h → Score:1.4` — /insights page — navigable by habit or time period (weekly / monthly toggle)
  **Done when:** /insights renders with ≥1 habit selected; shows weekly completion chart; linked from Dashboard
- [ ] 🟢[BUILD] P4 · `R8 I4 C70% E12h → Score:1.87` — Per-habit completion rate chart (weekly + monthly)
  **Done when:** chart shows 7-day and 30-day completion rates per habit sourced from `habit_logs`
- [ ] 🟢[BUILD] P4 · `R8 I3 C60% E12h → Score:1.2` — Projected progress toward phase milestones — "at current rate, you'll reach Maintaining in X days"
  **Done when:** each habit shows a projection based on recent completion rate
- [ ] 🟢[BUILD] P4 · `R7 I4 C55% E16h → Score:0.96` — Identity alignment score over time — how well habit completion aligns with stated identity goal
  **Done when:** a simple alignment metric is shown (e.g. "78% aligned this month") with a trend indicator

---

## ✅ Resolved (archive — do not re-introduce)

- [x] 🟠[INFRA] **Set up test runner + sanitize.ts coverage** — Vitest configured (`vitest.config.ts`, `npm test`); 47 tests in `lib/sanitize.test.ts` covering all 13 injection patterns, 8 innocent-text false-positive checks, fence markers, sanitizeLatestUserMessage, sanitizeMessageHistory · *Fixed May 6, 2026*
- [x] 🔴[BUG] **B1. `profile_name` column doesn't exist** — `social.sql` only adds `display_name`; broke `profile/page.tsx:44`, `agents/architect/route.ts:86`, `agents/constellation/route.ts:75` silently; replaced with `display_name` · *Fixed May 4, 2026*
- [x] 🔴[BUG] **B2. DEFAULT_MODEL stale `claude-sonnet-4-5`** — `lib/claude.ts:34` updated to `claude-sonnet-4-6` · *Fixed May 1, 2026*
- [x] ⚫[INFRA] **Ghost auth users** — expected, not a bug; `auth.users` created at `signUp()`, `public.users` created at loading screen; users who close mid-onboarding have auth record but no profile · *Investigated May 1, 2026*

---

## 🅿️ Parking Lot / Open Questions

*Not tasks yet — needs more definition, a decision, or is out of scope for current phase.*


- **Monetization** — Goal-completion payment model (pay in, refund on success)? How do we monetize this product? Needs business/legal research before becoming a scoped task.
- **Voice control (ElevenLabs API)** — Voice input/output for agent conversations. Compelling for accessibility + engagement. Needs product decision before scoping.
- **Multi-agent orchestration** — Claude Code Codex approach vs current single-agent-per-route. Spike needed before any architecture change.
- **Ghost auth users** — Should we detect users who have `auth.users` but no `public.users` row and re-prompt them on next login?
- **Habit cap long-term** — Currently max 2 active habits from Architect. When does this increase? What's the unlock model beyond the 7-day streak?
- **Demographic data use** — Profile collects DOB, gender, address. How and when does this influence agent behavior? No spec yet.



