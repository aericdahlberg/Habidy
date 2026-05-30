Sprint 3 — Habidy
Week of May 13, 2026
Goal: stabilize the core agent flow end-to-end so the demo path works reliably
Capacity: ~20h
Notion board: https://www.notion.so/7d6c9a05082540fab36511c5c79ce719

How to use this file

Work top to bottom — cards are ordered by RICE score (highest first)
Check off [ ] → [x] when a card is done
New idea mid-sprint? Add to Notion Inbox. Do NOT add here.
Blocked? Note it inline and pull the next card.
End of sprint: flip all done cards to Done in Notion, then regenerate this file.


[x] Fix HABITS_READY regex (H1)
Type: BUG · Priority: P0 🔴 · Effort: 0.5h · RICE: 85.5
Notion: https://www.notion.so/35fbab41-93a5-81...
Done when: Architect never returns 500 on habit generation; regex handles trailing text after ]
Steps:

architect.ts:131 — remove \s*$ anchor
Change to: /HABITS_READY:(\[[\s\S]+?\])/
Confirm: no 500 when model adds text after the closing ]


[x] GC2: Onboarding skip still saves
Type: EVAL · Priority: P0 🔴 · Effort: 0.5h · RICE: 54
Done when: clicking "Skip for now" on /onboarding/calendar routes to /onboarding/loading and loading page saves all onboarding data correctly — no regression
Steps:

Click "Skip for now" on the calendar onboarding screen
Confirm redirect hits /onboarding/loading
Confirm all onboarding data (identity, goal_category, friction_point) is saved in Supabase
Confirm no null overwrites


[x] GC15: Auto-dismiss respects opt-out
Type: EVAL · Priority: P1 🟠 · Effort: 0.5h · RICE: 43.2
Done when: toggle auto_dismiss_when_logged OFF in Profile → Notifications → log a habit → Google Calendar popup is NOT removed
Steps:

Go to Profile → Notifications, toggle auto_dismiss_when_logged OFF
Confirm setting is persisted in notification_prefs
Log a habit from the dashboard
Confirm the Google Calendar popup reminder is still present (not dismissed)


[x] Eval: Architect vague identity → follow-up, never HABITS_READY
Type: EVAL · Priority: P1 🟠 · Effort: 1h · RICE: 42.8
Done when: vague identity input (e.g. "I want to be better") triggers a clarifying question — Architect never advances to HABITS_READY
Steps:

Send vague identity string to Architect (e.g. "I want to be better", "I want to improve myself")
Confirm agent responds with a clarifying question
Confirm HABITS_READY does not appear in the response
Test at least 3 vague inputs


[x] Eval: Architect no cue → don't advance to HABITS_READY
Type: EVAL · Priority: P1 🟠 · Effort: 1h · RICE: 42.8
Done when: Architect does not emit HABITS_READY when no cue is provided
Steps:

Send an identity with no cue (e.g. "I want to be a writer" with no time/trigger specified)
Confirm agent asks for a cue before proceeding
Confirm HABITS_READY does not fire without a cue present
Test at least 2 no-cue inputs


[x] GC5: Disconnect clears tokens
Type: EVAL · Priority: P1 🟠 · Effort: 0.5h · RICE: 32.4
Done when: disconnect → google_calendar_tokens row deleted → users.google_calendar_connected = false → profile shows "Not connected" → Architect no longer receives [CALENDAR CONTEXT]
Steps:

Click Disconnect in Profile
Check Supabase: google_calendar_tokens row is deleted
Check Supabase: users.google_calendar_connected = false
Confirm profile UI shows "Not connected"
Run an Architect session and confirm no [CALENDAR CONTEXT] in LangSmith trace


[x] Habit phase progression — API + HabitCard component
Type: BUILD · Priority: P1 🟠 · Effort: 4h · RICE: 32.4 (evals) / 16.2 (build)
Done when: every habit shows current phase label + progress bar + "X days to [next phase]" on HabitCard; phases update from streak; streak reset returns to Building
Steps:

Add phase and daysToNextPhase to GET /api/habits — derive from streak

Building: streak 0–6 days
Establishing: streak 7–20 days
Maintaining: streak 21+ days


Build PhaseBar component on HabitCard — label + progress bar + countdown
Streak reset → phase returns to "Building"
Run phase calculation evals: calc correct, countdown accurate, streak reset works


[ ] Weekly difficulty check-in — component + trigger + API
Type: BUILD · Priority: P1 🟠 · Effort: 8h · RICE: 9.56
Status: In Progress
Done when: at 7-day multiple, user sees "Too Easy / Just Right / Too Hard" prompt for that habit; "Too Easy" seeds Architect with current habit + level-up prompt; response saved to habit_difficulty_logs
Steps:

Build WeeklyCheckIn modal/card component — dismissable, won't re-fire same interval
POST /api/habits/[id]/difficulty-feedback → saves rating + timestamp, returns { action: "level_up" | "keep" | "scale_down" }
Trigger logic: fire at day 7, 14, 21 via last_rated_at on habit — no double-trigger
"Too Easy" → launch Architect pre-seeded with current habit + level-up instruction
Run evals: interval correct, just_right saves without redirect, Architect generates correct variation


[ ] GC1: OAuth connect flow end-to-end
Type: EVAL · Priority: P0 🔴 · Effort: 1h · RICE: 27
Done when: clicking "Connect Google Calendar" → Google consent screen → callback → tokens stored in google_calendar_tokens → users.google_calendar_connected = true → redirect lands correctly with no error
Steps:

Click "Connect Google Calendar" in onboarding or profile
Complete Google consent flow
Check Supabase: google_calendar_tokens row exists with access + refresh tokens
Check Supabase: users.google_calendar_connected = true
Confirm redirect lands on correct page with no error


[ ] Weekly difficulty check-in evals
Type: EVAL · Priority: P1 🟠 · Effort: 2h · RICE: 27.2
Run after the WeeklyCheckIn BUILD card above is done.
Done when: check-in fires at correct interval; doesn't fire twice; Just Right saves to difficulty_logs with no redirect; Architect generates correct variation with difficulty context
Steps:

interval_trigger: fires at day 7, 14, 21 — not before, not twice for same period
just_right: saves to habit_difficulty_logs, no redirect, habit unchanged
level_up: "Too Easy" → Architect generates harder variation with same identity label
scale_down: "Too Hard" → Architect generates easier variation


[ ] Dashboard evals — SwipeCheckIn, streak, progress
Type: EVAL · Priority: P1 🟠 · Effort: 2h · RICE: 25.65
Done when: SwipeCheckIn only appears on first visit of the day; completing same habit twice doesn't double-count; streak correct across midnight boundary; progress bar accurate
Steps:

swipe_daily: complete SwipeCheckIn, reload — should not appear again same day
double_log: log the same habit twice — upsert, streak count unchanged
streak_midnight: test streak calculation across midnight boundary (use a test account)
progress_bar: complete N of M habits — verify bar shows correct percentage


[ ] Profile + add-habit gate evals
Type: EVAL · Priority: P1 🟠 · Effort: 2h · RICE: 25.2
Done when: sign out clears session and redirects to /login; /add-habit only accessible at 7-day streak; shows remaining proposed habits from Architect
Steps:

sign_out: tap Sign Out → session cleared → redirected to /login → cannot access app without re-auth
add_habit_gate: visit /add-habit before 7-day streak → confirm redirect/block
proposed_habits_shown: unselected habits from last Architect session appear in /add-habit


[ ] GC14: Auto-dismiss reminder when habit logged
Type: EVAL · Priority: P1 🟠 · Effort: 1h · RICE: 25.5
Requires GC1 and GC4 to pass first.
Done when: log a habit → within ~5 sec, today's Google Calendar popup reminder disappears from that event instance; tomorrow's instance still has both reminders
Steps:

Ensure the habit has a Google Calendar event with a popup reminder due today
Log the habit from the dashboard
Within ~5 seconds, check Google Calendar — today's popup reminder should be gone
Confirm tomorrow's event instance still has reminders intact


[ ] GC3: Calendar context injected into Architect
Type: EVAL · Priority: P1 🟠 · Effort: 1h · RICE: 20.4
Done when: LangSmith trace for a connected user's Architect session shows a [CALENDAR CONTEXT] block in the user message with real event titles and times
Steps:

Use an account with Google Calendar connected
Start an Architect session
Open LangSmith — find the trace for this session
Confirm [CALENDAR CONTEXT] block appears in the user message with actual event data


[ ] GC4: Recurring habit event appears in Google Calendar
Type: EVAL · Priority: P1 🟠 · Effort: 1h · RICE: 20.4
Done when: selecting a habit with "Adding to Google Calendar" toggled on → event visible in Google Calendar starting tomorrow, marked daily recurring, with 5-minute popup reminder
Steps:

In Architect, select a habit and toggle "Add to Google Calendar" on
Save the habit
Open Google Calendar — confirm event appears starting tomorrow
Confirm event is set to daily recurring
Confirm 5-minute popup reminder is set


[ ] RLS policies audit
Type: GUARDRAIL · Priority: P1 🟠 · Effort: 4h · RICE: 10.1
Done when: users can only read/write their own rows on all tables; verified with two separate accounts; adminClient() never imported in client components
Steps:

Review RLS policies on every user-scoped table in Supabase
Test with two separate test accounts — confirm account A cannot read/write account B's rows
Search codebase for adminClient() imports — confirm none appear in client components (app/ or components/)
Fix any policy gaps found


[ ] Constellation → Architect handoff verify (H3)
Type: BUG · Priority: P1 🟠 · Effort: 2h · RICE: 14
Done when: run a full Constellation → Architect session and confirm a conversation_memory row exists in Supabase; Architect picks it up correctly
Steps:

Run a complete Constellation session through to the end
Check Supabase conversation_memory table — confirm row exists for this session
Start an Architect session immediately after
Confirm architect/route.ts:111-124 reads the conversation_memory row
If row is missing, trace where constellation/route.ts fails to write it


[ ] habidy_active_habit not user-scoped (H2)
Type: BUG · Priority: P1 🟠 · Effort: 1h · RICE: 8.1
Done when: no cross-user contamination when accounts are switched
Steps:

dashboard/page.tsx:104 — change habidy_active_habit key to habidy_active_habit_${userId}
architect/page.tsx:144 — same fix
Test: log in as user A, switch to user B — confirm no habit data leaks between accounts


✅ Done this sprint

 Google Calendar integration — shipped May 6, 2026
Custom OAuth flow, google_calendar_tokens table, Architect [CALENDAR CONTEXT] injection, recurring habit events with reminders, onboarding calendar screen, profile connect/disconnect
 Prompt injection hardening + Vitest test suite — shipped May 6, 2026
lib/sanitize.ts, 47 unit tests covering 13 injection patterns, constellation + architect routes hardened
 GC bug fixes (B1–B4) + 26 new calendar tests — shipped May 9, 2026
logDate UTC bug (localDateStr), double DB query, savedHabits index alignment, dead re-export. 73 tests total.


End of Sprint 3
Next sprint planning: Monday May 20
Regenerate this file from Notion 📋 Planning view