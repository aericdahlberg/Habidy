# GC5: Disconnect clears tokens
Date: 2026-05-30
Type: EVAL (static code trace — no live browser)

## Result: PASS

## Step 1 — Click Disconnect in Profile
`handleDisconnectCalendar()` in `app/profile/page.tsx:82-92` calls
`fetch('/api/calendar/disconnect', { method: 'DELETE' })`. On `res.ok`, sets
`setCalendarConnected(false)`. ✅

## Step 2 — google_calendar_tokens row is deleted
`app/api/calendar/disconnect/route.ts` calls `disconnectCalendar(user.id)` from `lib/google-auth.ts`.
`lib/google-auth.ts:89`: `supabase.from('google_calendar_tokens').delete().eq('user_id', userId)`
Uses `adminClient()` (service role key) — bypasses RLS. ✅

## Step 3 — users.google_calendar_connected = false
`lib/google-auth.ts:90`: `supabase.from('users').update({ google_calendar_connected: false }).eq('id', userId)`
Same `disconnectCalendar` call handles both the token delete and the flag update atomically. ✅

## Step 4 — Profile shows "Not connected"
`app/profile/page.tsx:87`: `setCalendarConnected(false)` fires immediately on successful DELETE response.
`app/profile/page.tsx:232`: renders `{calendarConnected ? 'Connected — habit reminders active' : 'Not connected'}`.
Disconnect button is also replaced by Connect button. ✅

## Step 5 — Architect no longer receives [CALENDAR CONTEXT]
`app/api/agents/architect/route.ts:162-172`: calls `getValidAccessToken(userId)`.
`lib/google-auth.ts:97-103`: queries `google_calendar_tokens` — returns `null` when no row exists.
`accessToken` is null → `if (accessToken)` block skipped → `ctx.calendarContext` stays `null`.
`lib/agents/architect.ts:60-62`: `calendarBlock = ctx.calendarContext ? ... : ''` → empty string.
`[CALENDAR CONTEXT]` block is NOT injected into the Architect prompt. ✅

## Unit test coverage
`lib/calendar-dismiss.test.ts:102-125`: tests `getValidAccessToken` returning `null` (exact
post-disconnect state) and confirms `suppressEventInstance` is never called. Tests pass in
the 73-test suite. ✅

No dedicated unit test for the `/api/calendar/disconnect` route itself — code path is simple
(single function call, no conditional logic).

## Caveats
- Static code trace only — no live Supabase verification or LangSmith trace checked.
- A live test with a connected account would confirm actual row deletion and trace output.