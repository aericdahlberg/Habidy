#!/bin/bash
# Blocks file writes until an approved plan exists.
# For BUG and EVAL cards: plan is not required — /sprint writes .claude/current-card.json
# with the card type before dispatching any agent.
# For BUILD / INFRA / IMPROVE cards: plan-[slug].md or plan-[session_id].md must exist.

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

# Allow all writes inside .claude/ — plan files, eval results, current-card.json all live here
if [[ "$TARGET_FILE" == *".claude/"* ]]; then
  exit 0
fi

# Read current card type written by /sprint before dispatching
CARD_TYPE=$(python3 -c "
import sys, json
try:
  d = json.load(open('.claude/current-card.json'))
  print(d.get('type', ''))
except:
  print('')
" 2>/dev/null || echo "")

# BUG and EVAL cards don't require a plan — bypass the check
if [[ "$CARD_TYPE" == "BUG" || "$CARD_TYPE" == "EVAL" || "$CARD_TYPE" == "GUARDRAIL" ]]; then
  exit 0
fi

# Ensure plans dir exists
mkdir -p "$PLAN_DIR"

# Opportunistic cleanup: remove plan files older than 48 hours
find "$PLAN_DIR" -name "plan-*.md" -mmin +2880 -delete 2>/dev/null

# For BUILD / INFRA / IMPROVE: check for session-scoped plan OR any card-slug plan from today
SESSION_PLAN_EXISTS=0
SLUG_PLAN_EXISTS=0

[ -f "$PLAN_FILE" ] && SESSION_PLAN_EXISTS=1

# Accept any card-slug plan modified today
SLUG_PLAN=$(find "$PLAN_DIR" -name "plan-*.md" -mtime -1 2>/dev/null | grep -v "plan-unknown" | head -1)
[ -n "$SLUG_PLAN" ] && SLUG_PLAN_EXISTS=1

if [ $SESSION_PLAN_EXISTS -eq 0 ] && [ $SLUG_PLAN_EXISTS -eq 0 ]; then
  CARD_SLUG=$(python3 -c "
import sys, json
try:
  d = json.load(open('.claude/current-card.json'))
  print(d.get('slug', '[card-slug]'))
except:
  print('[card-slug]')
" 2>/dev/null || echo "[card-slug]")

  echo "BLOCKED: No approved plan found for this session."
  echo ""
  echo "Card type: ${CARD_TYPE:-unknown} — plan required before writing code."
  echo ""
  echo "Before writing any code:"
  echo "  1. Dispatch the planner agent via /sprint"
  echo "  2. Review and approve the plan"
  echo "  3. Plan will be written to: .claude/plans/plan-${CARD_SLUG}.md"
  echo ""
  echo "  Or for ad-hoc work: enter plan mode (Shift+Tab) and write:"
  echo "  .claude/plans/plan-${SESSION_ID}.md"
  exit 1
fi

exit 0
