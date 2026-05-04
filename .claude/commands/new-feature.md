# /new-feature

Steps to add a feature to Hab-Idy:

1. Enter plan mode (use Opus if available)
2. Use `ultrathink` in the prompt for anything estimated > 1 hour
3. Read the relevant spec in `docs/` before planning
4. Dispatch the planner agent — output a plan and wait for approval
5. After approval: execute in chunks of max 200 lines per file
6. Write tests or type assertions alongside each chunk
7. After each file change: confirm `npx tsc --noEmit` passes
8. After all files: run `npm run lint -- --quiet`
9. Update `docs/AGENTS.md` if an agent changed, `docs/DATA.md` if DB schema changed
10. Update `CHANGELOG.md` with a one-line entry

**Rules:**
- No code until the plan is approved
- One sub-task at a time — do not jump ahead
- If a file would exceed 200 lines, split the component before continuing
- If uncertain at any point, ask before writing
