# Plan: Weekly difficulty check-in — component + trigger + API
Approved: 2026-05-30

## Files
1. supabase/migrations/20260530_difficulty_checkin.sql — NEW
2. lib/difficulty-trigger.ts — NEW pure shouldShowDifficultyCheckIn()
3. app/api/habits/[id]/difficulty-feedback/route.ts — NEW POST route
4. components/WeeklyCheckIn.tsx — NEW modal component
5. lib/agents/architect.ts — MODIFY: level_up mode in QuickHabitData
6. app/architect/page.tsx — MODIFY: read habidy_level_up_habit sessionStorage
7. app/dashboard/page.tsx — MODIFY: detect check-in habit, show WeeklyCheckIn
8. docs/DATA.md — UPDATE: new table + route

## Trigger rule
streak > 0 && streak % 7 === 0 && (lastRatedAt null OR daysSince > 6)

## API contract
POST /api/habits/[id]/difficulty-feedback
  body: { rating: 'too_easy' | 'just_right' | 'too_hard' }
  returns: { action: 'level_up' | 'keep' | 'scale_down' }

## Level-up flow
WeeklyCheckIn "Too Easy" → onLevelUp(data) → sessionStorage habidy_level_up_habit →
router.push('/architect') → architect reads key → autoGenerate with mode:'level_up'