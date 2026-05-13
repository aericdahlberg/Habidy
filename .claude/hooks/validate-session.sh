#!/bin/bash
# Stop hook — fires when Claude finishes a response.
# Lightweight: only warns when something needs attention.
# Does NOT run npm test here (too slow for every response — pre-commit handles that).

cd "$(git rev-parse --show-toplevel)" 2>/dev/null || exit 0

WARNINGS=()

# 1. Uncommitted changes?
UNCOMMITTED=$(git status --porcelain 2>/dev/null | grep -v "^??" | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -gt 0 ]; then
  WARNINGS+=("⚠️  $UNCOMMITTED file(s) modified but not committed (run git commit or /end-session)")
fi

# 2. Untracked source files that look like new code?
UNTRACKED=$(git status --porcelain 2>/dev/null | grep "^??" | grep -E "\.(ts|tsx|js|jsx)$" | wc -l | tr -d ' ')
if [ "$UNTRACKED" -gt 0 ]; then
  WARNINGS+=("⚠️  $UNTRACKED new source file(s) not staged (git add + commit before ending session)")
fi

# 3. SPRINT.md has unchecked cards that were mentioned in recent git log?
# (light check: just flag if SPRINT.md was modified but not committed)
SPRINT_UNSTAGED=$(git status --porcelain 2>/dev/null | grep "SPRINT.md" | wc -l | tr -d ' ')
if [ "$SPRINT_UNSTAGED" -gt 0 ]; then
  WARNINGS+=("⚠️  SPRINT.md has unsaved changes — commit after marking cards done")
fi

# Only print if there are warnings (silent when all clear)
if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo ""
  echo "── Session check ─────────────────────────────"
  for w in "${WARNINGS[@]}"; do
    echo "  $w"
  done
  echo "──────────────────────────────────────────────"
fi

exit 0
