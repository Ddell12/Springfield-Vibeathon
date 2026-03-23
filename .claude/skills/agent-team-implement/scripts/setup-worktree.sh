#!/usr/bin/env bash
# Creates a git worktree for agent team implementation.
# Usage: bash scripts/setup-worktree.sh <descriptor>
# Example: bash scripts/setup-worktree.sh webhook-auth
# Output: prints the worktree path and branch name.

set -euo pipefail

DESCRIPTOR="${1:?Usage: setup-worktree.sh <descriptor>}"
BRANCH="implement-${DESCRIPTOR}"
WORKTREE_PATH=".claude/worktrees/${BRANCH}"

if [ -d "$WORKTREE_PATH" ]; then
  echo "ERROR: Worktree already exists at ${WORKTREE_PATH}"
  echo "Remove it first: git worktree remove ${WORKTREE_PATH}"
  exit 1
fi

git worktree add "$WORKTREE_PATH" -b "$BRANCH"

echo "Worktree created:"
echo "  Path:   ${WORKTREE_PATH}"
echo "  Branch: ${BRANCH}"
echo ""
echo "Next: run 'cd ${WORKTREE_PATH} && npm install' in writing agents."
