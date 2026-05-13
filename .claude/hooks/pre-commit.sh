#!/bin/bash
# Git pre-commit hook — blocks commits if tests fail.
# Installed to .git/hooks/pre-commit by install-hooks.sh
# Keep this file in .claude/hooks/ so it's in version control.

echo "=== Pre-commit: running test suite ==="

cd "$(git rev-parse --show-toplevel)"

# Run the full test suite
npm test -- --run 2>&1
TEST_EXIT=$?

if [ $TEST_EXIT -ne 0 ]; then
  echo ""
  echo "❌ COMMIT BLOCKED: tests are failing."
  echo "   Fix the failures above, then commit."
  echo "   To skip (emergencies only): git commit --no-verify"
  exit 1
fi

echo "✅ All tests pass — commit allowed."
exit 0
