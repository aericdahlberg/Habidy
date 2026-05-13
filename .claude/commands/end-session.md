# /end-session

Before running /clear, do this in order:

1. **Run /validate first.**
   Do not skip this step. /validate runs the full test suite, checks TypeScript,
   and reports any rule violations. Fix failures before continuing.
   If everything is clean, /validate will say so — then proceed.

2. Write a summary to `PROGRESS.md` with:
   - What was completed this session (bullet list)
   - What is next (bullet list)
   - Any blockers or open questions
   - Exact stopping point (file + line if in the middle of a change)

3. Check for uncommitted work:
   - Run `git status`
   - If there are changes: commit with a clear message
     (the pre-commit hook will run npm test automatically — if it fails, fix first)
   - Never leave uncommitted changes without a note in PROGRESS.md

4. List the /clear-safe stopping points:
   - Any task that is fully complete and tested
   - Any task where PROGRESS.md fully captures state

5. Confirm: "Ready to /clear — /validate passed, PROGRESS.md updated, work committed"

**Do not /clear until this checklist is done.**
