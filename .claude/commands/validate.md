# /validate — End-of-session compliance report

Run this before /end-session to verify that rules were followed during this session.
Reports on both process compliance (did the workflow run correctly?) and code quality.

---

## What to check and report

### 1. Git state
```bash
git status
git diff --stat HEAD
```
Report:
- How many files were changed this session
- Whether changes are committed or pending
- Whether SPRINT.md was updated ([ ] → [x] for worked cards)

### 2. Plan file compliance (BUILD/INFRA/IMPROVE cards only)
Check `.claude/plans/` for plan files modified in the last 24 hours.
```bash
find .claude/plans -name "plan-*.md" -mtime -1
```
Report:
- ✅ Plan file exists for each BUILD/INFRA/IMPROVE card worked
- ❌ No plan file found — code may have been written without approval

### 3. Test suite
Run the full test suite and report results:
```bash
npm test -- --run
```
Report each failure explicitly:
- File name
- Test name
- What failed and why (from the Vitest output)

Do NOT summarize failures — show the exact output. The engineer needs to see every broken test.

### 4. TypeScript check
```bash
npx tsc --noEmit
```
Report:
- ✅ No type errors
- ❌ [exact tsc errors] — show file:line for each

### 5. File length compliance (CLAUDE.md rule: max 200 lines)
Check every file changed this session:
```bash
git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only
```
For each changed .ts/.tsx file, check line count. Flag any over 200 lines.

### 6. CLAUDE.md rule spot-checks
For each changed file, check:
- No direct `new Date().toISOString()` for dates (should use `localDateStr()`)
- No Claude API calls outside `lib/claude.ts`
- No `adminClient()` imports in `app/` or `components/` client files
```bash
grep -rn "new Date().toISOString().split" app/ components/ lib/ --include="*.ts" --include="*.tsx"
grep -rn "adminClient" app/ components/ --include="*.ts" --include="*.tsx"
```

### 7. Documentation sync check
Get the list of changed source files:
```bash
git diff --name-only HEAD 2>/dev/null
git diff --name-only HEAD~1 HEAD 2>/dev/null
```

For each changed source file, check whether the corresponding doc was also updated:
| If this changed... | This doc must also be updated |
|---|---|
| `lib/agents/architect.ts` or `lib/agents/constellation.ts` | `docs/AGENTS.md` |
| `app/api/**` | `docs/DATA.md` |
| `lib/google-auth.ts` or `lib/google-calendar.ts` | `docs/DATA.md` + `docs/AGENTS.md` |
| Any `app/(screen)/` file | `docs/SCREENS.md` |
| `supabase/migrations/**` | `docs/DATA.md` |
| Major data flow change | `docs/ARCHITECTURE.md` |

Report:
- ✅ All changed source files have corresponding doc updates
- ❌ [source file] changed but [doc file] was NOT updated

### 8. Agent compliance summary
Report which agents ran this session (based on what cards were worked):
- Did the planner agent write a plan before any code was written?
- Did the bug-fixer stay within 3 files?
- Did the eval-runner write results to .claude/eval-results/?
- Did each agent return a rich summary with concerns + out-of-scope items?

---

## Output format

```
══════════════════════════════════════════
/validate — Session compliance report
[date]
══════════════════════════════════════════

Git state
  ✅ All changes committed  /  ⚠️ X files uncommitted

Plan files
  ✅ plan-[slug].md exists  /  ❌ No plan found for [card]

Tests (npm test)
  ✅ 73/73 passing  /  ❌ [X] failing:
    [file] > [test name]: [reason]

TypeScript
  ✅ No errors  /  ❌ [errors]

File lengths
  ✅ All files under 200 lines  /  ❌ [file]: [N] lines

CLAUDE.md rules
  ✅ No violations  /  ❌ [violation details]

Documentation sync
  ✅ All docs updated  /  ❌ [source file] changed but [doc] not updated

──────────────────────────────────────────
Overall: ✅ CLEAN  /  ⚠️ NEEDS ATTENTION
──────────────────────────────────────────
```

If there are failures, list them and ask:
"Fix these before ending the session? (yes / skip and commit anyway)"

Do NOT end the session or commit until the engineer has seen this report.
