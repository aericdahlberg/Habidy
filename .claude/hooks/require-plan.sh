#!/bin/bash
# Blocks file writes until an approved plan exists for this session.
# Plan files are session-scoped so multiple agents never interfere,
# and each new conversation automatically requires a fresh plan.

TOOL_INPUT=$(cat)

SESSION_ID=$(echo "$TOOL_INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('session_id', 'unknown'))
" 2>/dev/null || echo "unknown")

TARGET_FILE=$(echo "$TOOL_INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null || echo "")

PLAN_DIR=".claude/plans"
PLAN_FILE="$PLAN_DIR/plan-${SESSION_ID}.md"

# Allow writes inside .claude/ (so Claude can write the plan file itself)
if [[ "$TARGET_FILE" == *".claude/"* ]]; then
  exit 0
fi

# Ensure plans dir exists
mkdir -p "$PLAN_DIR"

# Opportunistic cleanup: remove plan files older than 48 hours
find "$PLAN_DIR" -name "plan-*.md" -mmin +2880 -delete 2>/dev/null

# Check for this session's approved plan
if [ ! -f "$PLAN_FILE" ]; then
  echo "BLOCKED: No approved plan found for this session."
  echo ""
  echo "Before writing any code:"
  echo "  1. Enter plan mode (Shift+Tab)"
  echo "  2. Plan the task and get approval"
  echo "  3. Write the approved plan to: $PLAN_FILE"
  echo "  4. Exit plan mode and proceed"
  exit 1
fi

exit 0
