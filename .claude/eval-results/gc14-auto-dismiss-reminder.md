# Eval: GC14 — Auto-dismiss reminder when habit logged
Date: 2026-06-15
Status: PARTIAL — code review only (blocked on GC1 + GC4)

## Code review: dismissTodayReminder (lib/calendar-dismiss.ts) ✅
Bail-chain is complete and correctly ordered:
1. No google_calendar_event_id or reminder_enabled → bail ✅
2. google_calendar_connected = false → bail ✅
3. auto_dismiss_when_logged pref = false → bail ✅
4. getValidAccessToken returns null → bail ✅
5. All pass → calls suppressEventInstance ✅

Fire-and-forget: all failure paths log or return, never throw. Habit log API
response always succeeds regardless of Calendar outcome ✅
EVENT_DELETED (404/410): stale google_calendar_event_id is nulled in habits table ✅
6 unit tests in calendar-dismiss.test.ts cover all 5 bail conditions + happy path ✅

## Code review: suppressEventInstance (lib/google-calendar.ts:110-160) ✅
- Window scoped to user's logDate in their timezone — only today's instance targeted ✅
- instances API: maxResults=1, narrow 1-day window — tomorrow's instance untouched ✅
- PATCH: { reminders: { useDefault: false, overrides: [] } } — clears reminders on
  the specific instance only, not the parent recurring event ✅
- instance.id format targets the individual occurrence correctly ✅
- TZ offset sign inversion ('+' → -1, '-' → +1) is correct but has no comment —
  future readers will question it. Low priority.

## What requires live GC1 + GC4 to verify
- instances endpoint returns the correct recurring instance
- patching overrides: [] actually clears the popup in Google Calendar UI
- ~5 second timing claim (network latency dependent)

## Recommended re-run condition
Re-run this eval after GC1 (OAuth) and GC4 (recurring event) both pass.
Manual steps: log a habit → wait 5s → check Google Calendar popup is gone for today,
present for tomorrow.
