# GC15: Auto-dismiss respects opt-out
Date: 2026-05-13
Type: EVAL (static code trace + unit test verification)

## Result: PASS

## Step 1 — Toggle auto_dismiss_when_logged OFF in Profile → Notifications
Toggle in `app/profile/page.tsx:272` calls `handleNotifPrefChange({ auto_dismiss_when_logged: false })`.
That fires a PATCH to `/api/profile/notification-prefs/route.ts`, which merges the value
(line 54: `typeof body.auto_dismiss_when_logged === 'boolean'` guard) and writes the full
merged prefs object to `users.notification_prefs`. ✅

## Step 2 — Setting persisted in notification_prefs
PATCH route reads current prefs, merges the change, and upserts via `db.update({ notification_prefs: merged })`.
The merged object is returned in the response and confirmed via `parseNotificationPrefs`. ✅

## Step 3 — Log a habit from dashboard
Habit log route (`app/api/habits/[id]/log/route.ts:74,85`) calls `void dismissTodayReminder(...)` when `completed === true`.

## Step 4 — Google Calendar popup NOT removed when opt-out is active
`lib/calendar-dismiss.ts:39`: `if (!prefs.auto_dismiss_when_logged) return`

The early-return at line 39 fires before `getValidAccessToken` or `suppressEventInstance` are called.
`suppressEventInstance` is never invoked — the popup reminder survives. ✅

## Unit test coverage
`lib/calendar-dismiss.test.ts:86-100` covers this exact case:
- `auto_dismiss_when_logged: false` in prefs
- Asserts `suppressEventInstance` was NOT called ✅
- Test is part of the 73-test suite that passes on every commit

## Caveats
- Static code trace only — no live browser run or real Google Calendar verification.
- A live test with a connected account would confirm end-to-end.