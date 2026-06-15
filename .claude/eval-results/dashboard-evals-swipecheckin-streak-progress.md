# Eval: Dashboard — SwipeCheckIn, streak, progress
Date: 2026-06-15

## swipe_daily ✅ PASS
Code inspection of `app/dashboard/page.tsx`:
- `needsCheckIn(userId)` reads `habidy_last_checkin_${userId}` from localStorage
- Returns true only if elapsed time ≥ 24h (MS_24H = 86_400_000)
- `handleSwipeComplete` sets the key to `Date.now()` when SwipeCheckIn completes
- On reload within 24h: `needsCheckIn` returns false → SwipeCheckIn not shown ✅
- Note: key is user-scoped (`_${userId}`) so switching accounts does not bleed ✅

## double_log ✅ PASS
Code inspection of `app/api/habits/[id]/log/route.ts`:
- Queries for existing log with same `habit_id + user_id + date`
- If found: `update({ completed })` — upsert, single row ✅
- If not found: `insert(...)` ✅
- Client-side: `dashboard/page.tsx:handleLog` filters today out of logs then pushes new entry (deduplicates) ✅
- `calculateStreak` Map deduplicates by date — second entry for same date overwrites, streak unchanged ✅
Unit tests: `lib/calculate-streak.test.ts` double_log cases (2 tests) ✅

## streak_midnight ✅ PASS (logic) / ⚠️ PRE-EXISTING TZ BUG (UTC+ users)
Logic verified with 6 unit tests in `lib/calculate-streak.test.ts`:
- Streak anchors to today OR yesterday — doesn't reset at midnight ✅
- Gaps break streaks correctly ✅
- completed=false does not count ✅

PRE-EXISTING BUG (not introduced this session):
`streak.ts:toDateStr()` uses `new Date().toISOString().split('T')[0]` (UTC) instead of `localDateStr()`.
For UTC+ users in early morning (e.g. 1am UTC+10 = 3pm UTC day before):
  - `toDateStr(new Date())` returns yesterday's date (UTC)
  - `localDateStr()` returns today (local) — used when logging the habit
  - Result: the log date doesn't match `today` or `yesterday` in calculateStreak → streak = 0 ❌
Workaround: none at runtime. Fix: replace `toDateStr` in `streak.ts` with `localDateStr()`.
Add to Notion Inbox: "streak.ts uses UTC toISOString — breaks for UTC+ users near midnight"

## progress_bar ✅ PASS
Code inspection of `app/dashboard/page.tsx`:
- `dailyCompleted = habits.filter(h => state.todayLogged && state.todayCompleted).length` ✅
- `dailyPct = (dailyCompleted / dailyHabits.length) * 100` — guarded with `length > 0` check ✅
- Bar animates `width: ${dailyPct}%` via framer-motion ✅
- "All habits done today!" celebration shown when `dailyCompleted === dailyHabits.length` ✅
- `todayLogged && todayCompleted` correctly excludes skipped (logged but completed=false) habits ✅

## Overall result
3/4 eval steps: ✅ PASS
1/4: ⚠️ streak_midnight logic passes, but pre-existing UTC bug will affect UTC+ users.
New tests added: `lib/calculate-streak.test.ts` (10 cases, all green). Total: 105 tests.
