# Eval: GC3 — Calendar context injected into Architect
Date: 2026-06-15
Status: PARTIAL — code review only (blocked on GC1 for live LangSmith verification)

## Code review: context load path (architect/route.ts:160-172) ✅
- getValidAccessToken(userId) — skips calendar fetch if no token ✅
- getCalendarEvents(now, twoWeeksOut): 2-week window, singleEvents=true,
  maxResults=100, cancelled events filtered out ✅
- formatEventsForContext(events) → ctx.calendarContext ✅
- Non-fatal try/catch — Architect works without calendar context ✅

## Code review: prompt injection (lib/agents/architect.ts:62-64) ✅
- calendarContext wrapped in [CALENDAR CONTEXT]...[/CALENDAR CONTEXT] tags ✅
- Content escaped via escapeFenceMarkers (injection guard) ✅
- System prompt line 25: model instructed to use context for suggested_time ✅

## Code review: formatEventsForContext (lib/google-calendar-helpers.ts:82-100) ✅
- Up to 40 events ✅
- Titles sanitized via sanitizeUserInput (flagPatterns: false — titles are
  not user-controlled, but sanitized as defence-in-depth) ✅
- Timed events: "Weekday, Mon D, H:MM AM/PM: title" ✅
- All-day events: "Weekday, Mon D: title (all day)" ✅
- Empty calendar: "Calendar connected — no events in the next 2 weeks." ✅

## Minor gap: missing hasCalendarContext in context log
architect/route.ts:174 logs hasIdentity, hasCrystalBallSummary, hasProfileContext
but NOT hasCalendarContext. If calendar fetch fails silently, no server-side log
distinguishes "not connected" from "fetch error" — makes GC3 failures hard to debug.
Fix: add `hasCalendarContext: !!ctx.calendarContext` to the console.log object.

## What requires live GC1 to verify
- [CALENDAR CONTEXT] block appears in LangSmith trace user message
- Real event titles and times are present (not empty/placeholder)
- suggested_time in HABITS_READY avoids the user's busy windows

## Recommended re-run condition
After GC1 passes: start an Architect session, open LangSmith, find the trace,
confirm [CALENDAR CONTEXT] in the first user message with actual event data.
