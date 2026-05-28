# PROGRESS.md — Session ending 2026-05-28

## Completed this session
- No code changes made this session (opened /end-session immediately)
- /validate run: 73/73 tests passing, 0 TypeScript errors, working tree clean

## Sprint 3 status (as of end of session)
Cards done [x]:
- Fix HABITS_READY regex (H1) — BUG P0
- GC2: Onboarding skip still saves — EVAL P0
- GC15: Auto-dismiss respects opt-out — EVAL P1
- Eval: Architect vague identity → follow-up, never HABITS_READY — EVAL P1
- Eval: Architect no cue → don't advance to HABITS_READY — EVAL P1

Cards remaining [ ] (ordered by RICE):
- GC5: Disconnect clears tokens
- Habit phase progression — API + HabitCard component
- Weekly difficulty check-in — component + trigger + API
- GC1: OAuth connect flow end-to-end
- Weekly difficulty check-in evals
- Dashboard evals — SwipeCheckIn, streak, progress
- Profile + add-habit gate evals
- GC14: Auto-dismiss reminder when habit logged
- GC3: Calendar context injected into Architect
- GC4: Recurring habit event appears in Google Calendar
- RLS policies audit
- Constellation → Architect handoff verify (H3)
- habidy_active_habit not user-scoped (H2)

## Known pre-existing violations (not blockers)
- `new Date().toISOString().split('T')[0]` in 3 files (should use `localDateStr()`):
  - `app/api/agents/coach/route.ts:26`
  - `app/api/social/friends/route.ts:9`
  - `lib/agents/coach/loader.ts:88`

## Next session starting point
Pick up at: `GC5: Disconnect clears tokens` (next card in SPRINT.md)
Run `/sprint` to continue.

## Blockers / Open questions
- None
