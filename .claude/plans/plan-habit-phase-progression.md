# Plan: Habit phase progression — API + HabitCard component
Approved: 2026-05-30

## Files
1. lib/streak.ts — add getPhase() + HabitPhase type
2. app/api/habits/route.ts — GET: batch logs, return phase + daysToNextPhase per habit
3. app/api/habits/[id]/streak/route.ts — return phase + daysToNextPhase
4. components/PhaseBar.tsx — new: label + progress bar + countdown
5. components/HabitCard.tsx — add phase props, render PhaseBar
6. app/dashboard/page.tsx — thread phase data through to HabitCard
7. lib/streak.test.ts — unit tests for getPhase()

## Phase logic
Building:     streak 0–6   → daysToNextPhase = 7 - streak
Establishing: streak 7–20  → daysToNextPhase = 21 - streak
Maintaining:  streak 21+   → daysToNextPhase = null

## Out of scope
- No DB migration (phase always derived, never stored)
- No AGENTS.md / SCREENS.md changes