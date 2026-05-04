# /fix-bug

Steps to fix a bug in Hab-Idy:

1. Ask: "Paste the error message and the file it's in"
2. Run `git diff main` on the affected area to check recent changes
3. Read the file — do not guess the root cause
4. State the root cause before writing any code
5. Apply the fix (one focused change)
6. Run `npx tsc --noEmit` — fix any type errors before continuing
7. Run `npm run lint -- --quiet` — fix any lint errors
8. Summarize: root cause + file(s) changed + one-line explanation

**Stop and re-plan if:**
- The fix requires changing more than 3 files
- You've attempted the same fix twice and it still fails
- The bug turns out to be in a different file than expected
