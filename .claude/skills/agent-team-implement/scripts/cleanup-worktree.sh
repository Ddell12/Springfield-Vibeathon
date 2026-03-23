#!/usr/bin/env bash
# Removes a git worktree and its branch after implementation.
# Usage: bash scripts/cleanup-worktree.sh <descriptor>
# Example: bash scripts/cleanup-worktree.sh webhook-auth

set -euo pipefail

DESCRIPTOR="${1:?Usage: cleanup-worktree.sh <descriptor>}"
BRANCH="implement-${DESCRIPTOR}"
WORKTREE_PATH=".claude/worktrees/${BRANCH}"

if [ -d "$WORKTREE_PATH" ]; then
  git worktree remove "$WORKTREE_PATH" 2>/dev/null && \
    echo "Removed worktree: ${WORKTREE_PATH}" || \
    echo "WARNING: Could not remove worktree at ${WORKTREE_PATH}"
else
  echo "Worktree not found at ${WORKTREE_PATH} (already removed?)"
fi

if git branch --list "$BRANCH" | grep -q .; then
  git branch -d "$BRANCH" 2>/dev/null && \
    echo "Deleted branch: ${BRANCH}" || \
    echo "WARNING: Could not delete branch ${BRANCH} (may not be fully merged)"
else
  echo "Branch ${BRANCH} not found (already deleted?)"
fi

echo "Cleanup complete."
