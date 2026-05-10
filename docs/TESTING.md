# TESTING.md — Habidy Test Playbook

Everything needed to verify the app works: unit tests, manual checklists, evals, and a pre-deploy gate.

---

## 1. Unit Tests (Vitest)

### Run

```bash
npm test                                        # all tests, one pass
npm test -- --watch                             # watch mode — reruns on save
npm test -- --reporter=verbose                  # show every test name
npm test -- lib/notification-prefs.test.ts      # single file
npm test -- --coverage                          # coverage report (if @vitest/coverage-v8 installed)
npx tsc --noEmit                                # type check only (no build output)
```

### What's covered (73 tests across 4 files)

| File | Tests | What it covers |
|---|---|---|
| `lib/sanitize.test.ts` | 47 | All 13 injection patterns, 8 false-positive innocents, fence escaping, sanitizeLatestUserMessage, sanitizeMessageHistory |
| `lib/notification-prefs.test.ts` | 9 | parseNotificationPrefs — valid, partial, null, non-object, wrong types, empty array |
| `lib/google-calendar-helpers.test.ts` | 12 | buildReminders (5-override cap, email flag, empty), buildDescription (identity line, sanitization), tomorrowDateStr (format, day math) |
| `lib/calendar-dismiss.test.ts` | 6 | dismissTodayReminder — all 5 bail conditions + happy path (Supabase + Google APIs fully mocked) |

### Rule: tests must pass before every commit

```bash
npm test && npm run build   # green = safe to commit
```

If a test fails after your change, fix it before moving on. Never use `--bail` to skip failures.

### Writing new tests

- Test file lives next to the module it tests: `lib/foo.ts` → `lib/foo.test.ts`
- Import from `vitest`: `import { describe, it, expect, vi, beforeEach } from 'vitest'`
- Path alias `@/` resolves to the project root (configured in `vitest.config.ts`)
- Mock external deps (Supabase, Google APIs, `fetch`) with `vi.mock()` — never hit real APIs in unit tests
- One describe block per exported function; one `it` per distinct behaviour
- Test the sad paths (null input, wrong types, empty arrays) as thoroughly as the happy path

---

## 2. AI Agent Evals (LangSmith)

### Prerequisites

```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=<your key>
LANGCHAIN_PROJECT=Habidy-Prompt-Eval   # or any name
```

### Run

```bash
npm run eval:agents    # conversation quality — saves to evals/results/agents-YYYYMMDD-HHMMSS.txt
npm run eval:prompts   # prompt A/B comparison across models
npm run eval:models    # claude-sonnet-4-6 vs claude-haiku-4-5-20251001 quality/cost tradeoff
```

Results also appear in the LangSmith dashboard as traces + scorer outputs.

### Scoring dimensions (agentEval.ts)

| Dimension | What it measures |
|---|---|
| `questionSpecificity` | Agent asks targeted, non-generic questions |
| `identityAlignment` | Responses tie back to the user's identity goal |
| `habiticRelevance` | Atomic Habits framework applied correctly |
| `avoidsPrescription` | Identity Gatherer doesn't suggest habits prematurely |
| `turnsUsed` | Stays within the turn cap for the mode |

---

## 3. Manual Test Checklists

Run these after any meaningful code change. Work top-to-bottom — earlier sections are dependencies for later ones.

### Prerequisite: Supabase migrations applied

```
supabase/migrations/20260506_google_calendar.sql   → google_calendar_tokens table, users.google_calendar_connected
supabase/migrations/20260507_reminder_prefs.sql    → users.timezone, users.notification_prefs, habits.* reminder columns
```

Apply via Supabase dashboard → SQL Editor, or `supabase db push`.

---

### A. Auth

| # | Step | Expected |
|---|---|---|
| A1 | Sign up with new email | Redirects to `/welcome` → `/onboarding` |
| A2 | Sign out then sign back in | Redirects to `/dashboard` (existing user) |
| A3 | Navigate to `/dashboard` while logged out | Redirected to `/login` |
| A4 | Sign up twice with same email | Error message; no duplicate user |

---

### B. Onboarding

| # | Step | Expected |
|---|---|---|
| B1 | Complete all 6 screens, reach `/mode-select` | `users.new_user = false`, `identity_statement` saved |
| B2 | Quit after Screen 4, return later | Previously entered name + identity pre-filled |
| B3 | `/onboarding/calendar` → "Connect Google Calendar" | Google consent → callback → `/onboarding/loading` with no error |
| B4 | `/onboarding/calendar` → "Skip for now" | Routes to `/onboarding/loading`; onboarding saves successfully |
| B5 | Choose "Quick start" on mode-select | Routes to `/quick-habit` |
| B6 | Choose "Give me direction" or "Coach me" | Routes to `/constellation` |

---

### C. Identity Gatherer (Constellation)

| # | Step | Expected |
|---|---|---|
| C1 | Complete guided session (5 questions) | "Ready to build your first habit?" wrap-up; IDENTITY_GATHERER_SUMMARY written to `conversation_memory` |
| C2 | Give a vague identity ("I want to be better") | Agent asks a follow-up; does NOT jump to summary |
| C3 | Hit the turn cap without summarising | Forced summary fires; `conversation_memory` row written; hand-off button appears |
| C4 | Click "Build my habit →" | Routes to `/architect` |

---

### D. Architect

| # | Step | Expected |
|---|---|---|
| D1 | Auto-generate habits (from constellation handoff) | 5 habit cards displayed; identity label on each |
| D2 | Select 2 habits | "Start these 2 habits →" button appears |
| D3 | Try to select a 3rd | Toast: "You can only pick 2 habits to start" |
| D4 | Save with "Add to Google Calendar" toggled on | Events created in Google Calendar; `habits.google_calendar_event_id` set |
| D5 | Save with calendar toggle off | Habits saved; no calendar API call |
| D6 | "Regenerate all" | New 5 habits generated; selections reset |
| D7 | Quick-habit flow → architect | 5 variations of entered habit; `suggested_time` field present |

---

### E. Dashboard & Habit Logging

| # | Step | Expected |
|---|---|---|
| E1 | First visit of day | SwipeCheckIn appears |
| E2 | Swipe right on a habit | Logged as complete; progress bar updates; toast shown |
| E3 | Swipe left on a habit | Logged as skip; no streak broken message |
| E4 | Swipe up on habit card | Survey sheet opens |
| E5 | Submit survey | `habit_survey_responses` row written; profile context updated |
| E6 | Log same habit twice | Second log updates existing row; count stays 1 |
| E7 | Log habit at 11pm local time | `habit_logs.date` = local date (not UTC next-day) — verify in Supabase |
| E8 | 7-day streak on any habit | "+ Add another habit" button appears on dashboard |

---

### F. Google Calendar Integration

Run these in order; each depends on the previous.

| # | Step | Expected |
|---|---|---|
| **GC1** | Profile → Connect Google Calendar | OAuth consent → tokens in `google_calendar_tokens` → `users.google_calendar_connected = true` → green banner |
| **GC2** | Onboarding skip → loading saves | `users` row complete; no regression on other fields |
| **GC3** | Run Architect (connected user) | LangSmith trace shows `[CALENDAR CONTEXT]` block with real event titles |
| **GC4** | Save habit with calendar on | Recurring event in Google Calendar starting tomorrow; 15-min + at-start popup; identity line in description |
| **GC5** | Profile → Disconnect | `google_calendar_tokens` deleted; `users.google_calendar_connected = false`; "Not connected" shown; Architect gets no calendar context |
| **GC6** | Force token expiry (set `expires_at` to past) → trigger Architect | Token silently refreshed; new token stored; calendar events still load |
| **GC7** | Revoke app in Google Account settings → next Architect | No `[CALENDAR CONTEXT]`; no 500 error |
| **GC8** | Architect response omits `suggested_time` | Calendar event still created; defaults to morning (7am) |
| **GC9** | Connect from profile → `/profile?calendar=connected` | Green banner shown; refresh clears it |
| **GC14** | Log habit complete (calendar connected) | Today's Google Calendar popup disappears within ~5s; tomorrow's instance still has reminders |
| **GC15** | Toggle "Auto-dismiss" OFF in Profile → Notifications → log habit | Reminder NOT removed |
| **GC16** | HabitCard bell icon → set [30 min, 5 min] → Save | Google Calendar event has exactly those two popups |
| **GC17** | Change global default [15, 0] → [30, 5] | Habits inheriting default PATCHed; per-habit overrides unchanged |
| **GC18** | Disconnect while app open → log habit | Log returns 200; no crash; dismiss bails silently |

---

### G. Profile & Notifications

| # | Step | Expected |
|---|---|---|
| G1 | Profile shows identity, habit count, goal category | Data matches Supabase `users` row |
| G2 | "Notifications" card visible (calendar connected) | Shows auto-dismiss toggle (on), email toggle (off), chip row |
| G3 | "Notifications" card hidden (calendar not connected) | Section not rendered |
| G4 | Toggle "Email reminder" on | Calendar events receive an email override at 60 min before |
| G5 | Change default reminder chips | Google Calendar events updated; PATCH returns `propagated > 0` |
| G6 | Sign out | Session cleared; redirects to `/login` |

---

### H. Explore & Social

| # | Step | Expected |
|---|---|---|
| H1 | Submit a reflection | `user_reflections` row created; `user_profile_context.summary` updated |
| H2 | "Talk to your coach" CTA | Routes to `/constellation` with correct sessionStorage mode |
| H3 | Add friend by email | Pending request created; appears in friend's requests list |
| H4 | Accept friend request | `friendships.status = 'accepted'`; friend appears in activity list |
| H5 | Add friend with unknown email | Inline error: "No Habidy user found with that email" |

---

## 4. Pre-Deploy Checklist

Run all of this before merging to main or deploying to Vercel:

```bash
# 1. Unit tests
npm test

# 2. Type check
npx tsc --noEmit

# 3. Production build
npm run build

# 4. Spot-check on mobile (BrowserStack or physical device)
#    - iPhone Safari: onboarding → dashboard → habit log
#    - Android Chrome: same path

# 5. Run at least one agent eval
npm run eval:agents

# 6. Check Supabase migrations
#    → All files in supabase/migrations/ applied to production DB

# 7. Check Vercel env vars
#    → GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_APP_URL all set
#    → GOOGLE_REDIRECT_URI in Google Cloud Console matches NEXT_PUBLIC_APP_URL + /api/auth/google/callback
```

If any step fails → do not deploy.

---

## 5. Debugging Tips

### Calendar event not created / wrong time

1. Check `habits.google_calendar_event_id` in Supabase — if null, event creation failed silently
2. Check Vercel function logs for `[POST /api/calendar/habits]` errors
3. Verify `NEXT_PUBLIC_APP_URL` matches the Vercel deployment URL (no trailing slash)
4. Event appears at wrong time → check `users.timezone` is set; `useTimezoneSync` runs on dashboard mount

### Reminder not dismissed after logging

1. Check `users.notification_prefs.auto_dismiss_when_logged` in Supabase → must be `true`
2. Check `habits.reminder_enabled` → must be `true`
3. Check `users.google_calendar_connected` → must be `true`
4. Look in `tool_logs` for `{ agent: 'calendar', tool_name: 'dismiss_today', success: false }` rows
5. Log date mismatch: verify `habit_logs.date` matches the user's local date (not UTC)

### Token expired / invalid_grant

- Check `google_calendar_tokens.expires_at` — if past, the next request should auto-refresh
- If `invalid_grant`: user revoked app access in Google → `google_calendar_tokens` row will be deleted; profile should update to "Not connected" after next Architect load

### Unit test mock not working

- All `vi.mock()` calls must appear before the imports they mock (Vitest hoists them)
- Supabase chain mocks need to match the exact method chain used in the function under test (see `makeChain` pattern in `calendar-dismiss.test.ts`)

### Build passes but TypeScript shows errors in editor

```bash
npx tsc --noEmit     # authoritative — if this passes, the editor is stale; restart TS server
```

---

## 6. Test Coverage Gaps (known)

These are intentionally untested for now — too tightly coupled to live APIs to mock cleanly:

| Area | Why not tested | Mitigation |
|---|---|---|
| `suppressEventInstance` internals | Hits Google Calendar API; instance ID is dynamic | Covered by GC14 manual test + bail conditions tested in unit tests |
| `exchangeCodeForTokens` | Requires real Google OAuth code | Covered by GC1 manual test |
| Full agent conversation quality | Non-deterministic LLM output | Covered by `npm run eval:agents` |
| Streak calculation across midnight | UTC vs local interaction | GC20 manual test; fix applied (localDateStr) |
