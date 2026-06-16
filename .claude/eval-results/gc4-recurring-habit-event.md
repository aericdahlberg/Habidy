# Eval: GC4 — Recurring habit event appears in Google Calendar
Date: 2026-06-16
Status: PARTIAL — code review only (blocked on GC1 for live verification)

## Code review: toggle → save flow (architect/page.tsx:177-204) ✅
- addToCalendar state (default false); user toggles before saving ✅
- After habits saved to DB, POST /api/calendar/habits fired per habit via Promise.allSettled ✅
- Partial failures toast: "Could not add to Google Calendar. You can reconnect in Profile." ✅
- savedById map (habit_name → DB id) used to link google_calendar_event_id correctly ✅

## Code review: createRecurringHabitEvent (lib/google-calendar.ts:46-82) ✅
- Start date: tomorrowDateStr(userTimezone) — uses Intl.DateTimeFormat, no UTC bug ✅
- 15-minute event slot (HH:00 → HH:15) ✅
- recurrence: ['RRULE:FREQ=DAILY'] — correct daily recurring format ✅
- google_calendar_event_id persisted on habits row after creation ✅

## Reminders ⚠️ SPEC DISCREPANCY
Done When says "5-minute popup reminder" but:
- DEFAULT_NOTIFICATION_PREFS.default_minutes_before = [15, 0]
- /api/calendar/habits falls back to [15, 0] if no per-habit or user pref
- buildReminders correctly generates popup overrides from whatever is configured
- A user with prefs set to [5] would get a 5-min popup — but the DEFAULT is 15 min + at start

Eval card appears to have been written expecting a 5-minute default.
The reminder mechanism itself is correct; the default value just differs from the spec.
Recommend updating the Done When to "popup reminder(s) per user notification prefs (default: 15 min + at start)".

## What requires live GC1 to verify
- Event actually appears in Google Calendar UI starting tomorrow
- Event shows as daily recurring
- Popup reminders fire at the configured times
- google_calendar_event_id is correctly stored in Supabase after save

## Recommended re-run condition
After GC1 passes: In Architect, select a habit with "Add to Google Calendar" toggled on.
Check: event in Google Calendar starting tomorrow, FREQ=DAILY, popup reminders present.
