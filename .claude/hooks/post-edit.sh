#!/bin/bash
# Runs after every Edit/Write tool use.

TOOL_INPUT=$(cat)
CHANGED_FILE=$(echo "$TOOL_INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null || echo "")

# ── TASKS.md: detect completed items and remind about doc updates ──────────────
if [[ "$CHANGED_FILE" == *"TASKS.md"* ]]; then
  NEW_CONTENT=$(echo "$TOOL_INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ti = d.get('tool_input', {})
print(ti.get('new_string', '') or ti.get('content', ''))
" 2>/dev/null || echo "")

  if echo "$NEW_CONTENT" | grep -qE '^\- \[x\]'; then
    COMPLETED=$(echo "$NEW_CONTENT" | grep -E '^\- \[x\]' | sed 's/^- \[x\] //' | head -5)
    echo "✅ Task(s) marked complete:"
    while IFS= read -r line; do echo "   $line"; done <<< "$COMPLETED"
    echo ""
    echo "⚠️  Update the relevant doc for each completed task:"
    echo "   🔴[BUG] or 🟢[BUILD] touching DB schema    → docs/ARCHITECTURE.md"
    echo "   🔴[BUG] or 🟢[BUILD] touching agents       → docs/AGENTS.md"
    echo "   🟢[BUILD] new screen or route              → docs/SCREENS.md"
    echo "   ⚫[INFRA] API route changes                → docs/DATA.md"
    echo "   ⚫[INFRA] build/deploy changes             → docs/BUILD.md"
    echo "   (skip if the change is eval-only or has no user-facing surface)"
  fi
  exit 0
fi

# Only type-check/lint TypeScript/JavaScript source files
if [[ "$CHANGED_FILE" != *.ts && "$CHANGED_FILE" != *.tsx && "$CHANGED_FILE" != *.js && "$CHANGED_FILE" != *.jsx ]]; then
  exit 0
fi

echo "=== Post-edit checks: $CHANGED_FILE ==="

# 1. Type check (faster than full next build)
echo "→ Type check..."
npx tsc --noEmit 2>&1
if [ $? -ne 0 ]; then
  echo "❌ TYPE CHECK FAILED — fix before continuing"
  exit 1
fi

# 2. Lint (only the changed file, not the whole codebase)
echo "→ Lint: $CHANGED_FILE"
npx eslint "$CHANGED_FILE" --quiet 2>&1
if [ $? -ne 0 ]; then
  echo "❌ LINT FAILED — fix before continuing"
  exit 1
fi

# 3. Remind to update docs if agent/API files changed
if echo "$CHANGED_FILE" | grep -qE "lib/agents|lib/claude|src/api|app/api"; then
  echo "⚠️  Agent/API file changed — remember to update docs/AGENTS.md or docs/DATA.md"
fi

echo "✅ Checks passed"
