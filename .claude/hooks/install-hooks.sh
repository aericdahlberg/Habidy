#!/bin/bash
# Run once after cloning: bash .claude/hooks/install-hooks.sh
# Installs the pre-commit hook from .claude/hooks/ into .git/hooks/

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_SRC="$REPO_ROOT/.claude/hooks/pre-commit.sh"
HOOK_DEST="$REPO_ROOT/.git/hooks/pre-commit"

if [ ! -f "$HOOK_SRC" ]; then
  echo "❌ pre-commit.sh not found at $HOOK_SRC"
  exit 1
fi

cp "$HOOK_SRC" "$HOOK_DEST"
chmod +x "$HOOK_DEST"
echo "✅ pre-commit hook installed at $HOOK_DEST"
echo "   npm test will now run before every git commit."