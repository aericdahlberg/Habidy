# /end-session

Before running /clear, do this in order:

1. Write a summary to `PROGRESS.md` with:
   - What was completed this session (bullet list)
   - What is next (bullet list)
   - Any blockers or open questions
   - Exact stopping point (file + line if in the middle of a change)

2. Check for uncommitted work:
   - Run `git status`
   - If there are changes: either commit with a clear message or stash with `git stash -m "wip: [description]"`
   - Never leave uncommitted changes without a note in PROGRESS.md

3. List the /clear-safe stopping points:
   - Any task that is fully complete and tested
   - Any task where PROGRESS.md fully captures state

4. Confirm: "Ready to /clear — PROGRESS.md updated, work stashed/committed"

**Do not /clear until this checklist is done.**
