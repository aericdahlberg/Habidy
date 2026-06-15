# Eval: Weekly difficulty check-in
Date: 2026-06-15

## interval_trigger ✅ PASS
Unit tests added: `lib/difficulty-trigger.test.ts` (13 cases, all green)
- streak 7, never rated → shows check-in ✅
- streak 14/21/28, never rated → shows check-in ✅
- streak 6 or 8 → does not show (only exact multiples of 7) ✅
- rated 3 days ago at streak 7 → does not show (double-fire prevented) ✅
- rated 7 days ago at streak 14 → shows (next period) ✅
Boundary: `daysSince > 6` (strictly greater than 6, not ≥ 7).

## just_right ✅ PASS
Code inspection of `app/api/habits/[id]/difficulty-feedback/route.ts`:
- Inserts row into `habit_difficulty_logs` with rating + difficulty_level_before ✅
- Updates `habits.last_rated_at` and `difficulty_level` (same value for just_right) ✅
- Returns `{ action: 'keep' }` ✅
- `WeeklyCheckIn` component: non-level_up actions call `onDismiss()` — no redirect ✅
- habit `difficulty_level` unchanged (currentLevel === newLevel when rating='just_right') ✅

## level_up ✅ PASS
Code inspection:
- API returns `{ action: 'level_up' }` for too_easy ✅
- `WeeklyCheckIn.handleRate`: calls `onLevelUp({ habitId, habitName, habitCue, identityLabel })` ✅
- `dashboard/page.tsx:handleLevelUp`: stores `habidy_level_up_habit` in sessionStorage, routes to `/architect` ✅
- `architect/page.tsx:88-104`: reads sessionStorage, seeds Architect with `mode: 'level_up'` ✅
- `lib/agents/architect.ts:138-152`: generates "5 progressively harder variations" with same identity_label ✅

## scale_down ⚠️ GAP — not routed to Architect
Eval spec says "Too Hard → Architect generates easier variation."
BUILD card "Done when" only specifies "Too Easy seeds Architect" — scale_down is NOT in scope.
Current behavior for too_hard:
- API: decrements `difficulty_level` by 1 (min 1) and saves log ✅
- Component: calls `onDismiss()` — does NOT launch Architect ⚠️

This is a spec gap between the EVAL card and what the BUILD card specified.
Decision needed: implement scale_down → Architect flow, or accept current behavior (DB-level downgrade only).

## Overall result
3/4 eval steps PASS. scale_down → Architect not implemented (out of BUILD scope).
Full test suite: 95 tests, all green (+13 new difficulty-trigger tests).
