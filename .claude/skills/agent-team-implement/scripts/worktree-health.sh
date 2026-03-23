#!/usr/bin/env bash
# Pre-flight health check for shared worktree before spawning agents.
# Usage: bash worktree-health.sh <worktree-path> [expected-branch]
#
# Checks:
# 1. Directory exists and is a git worktree
# 2. Git status is clean (no uncommitted changes)
# 3. Branch matches expected pattern (implement-*)
# 4. node_modules exists (npm install was run)
# 5. No lock file conflicts (package-lock.json not modified)
#
# Exit codes: 0 = healthy, 1 = issues found

set -euo pipefail

WORKTREE="${1:?Usage: worktree-health.sh <worktree-path> [expected-branch]}"
EXPECTED_BRANCH="${2:-}"
ERRORS=0
WARNINGS=0

echo "Worktree health check: $WORKTREE"
echo "---"

# Check 1: Directory exists
if [ ! -d "$WORKTREE" ]; then
  echo "ERROR: Worktree directory does not exist: $WORKTREE"
  exit 1
fi

# Check 2: Is a git worktree
if [ ! -f "$WORKTREE/.git" ] && [ ! -d "$WORKTREE/.git" ]; then
  echo "ERROR: Not a git worktree or repository: $WORKTREE"
  exit 1
fi
echo "OK: Directory exists and is a git worktree"

# Check 3: Git status clean
cd "$WORKTREE"
DIRTY=$(git status --porcelain 2>/dev/null | head -20)
if [ -n "$DIRTY" ]; then
  echo "WARNING: Worktree has uncommitted changes:"
  echo "$DIRTY" | head -10
  if [ "$(echo "$DIRTY" | wc -l)" -gt 10 ]; then
    echo "  ... and more"
  fi
  WARNINGS=$((WARNINGS + 1))
else
  echo "OK: Git status is clean"
fi

# Check 4: Branch matches expected pattern
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
if [ -n "$EXPECTED_BRANCH" ]; then
  if [ "$CURRENT_BRANCH" = "$EXPECTED_BRANCH" ]; then
    echo "OK: Branch matches expected: $CURRENT_BRANCH"
  else
    echo "ERROR: Branch mismatch. Expected: $EXPECTED_BRANCH, Got: $CURRENT_BRANCH"
    ERRORS=$((ERRORS + 1))
  fi
else
  # Just check it follows the implement-* convention
  if [[ "$CURRENT_BRANCH" == implement-* ]]; then
    echo "OK: Branch follows implement-* convention: $CURRENT_BRANCH"
  else
    echo "WARNING: Branch does not follow implement-* convention: $CURRENT_BRANCH"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check 5: node_modules exists
if [ -d "$WORKTREE/node_modules" ]; then
  echo "OK: node_modules exists"
else
  echo "ERROR: node_modules missing. Run: cd $WORKTREE && npm install"
  ERRORS=$((ERRORS + 1))
fi

# Check 6: No lock file conflicts
if git diff --name-only 2>/dev/null | grep -q "package-lock.json"; then
  echo "WARNING: package-lock.json has uncommitted changes — potential lock conflict"
  WARNINGS=$((WARNINGS + 1))
else
  echo "OK: No lock file conflicts"
fi

echo "---"
echo "Results: $ERRORS errors, $WARNINGS warnings"

if [ "$ERRORS" -gt 0 ]; then
  echo "FAIL: Fix issues before spawning agents."
  exit 1
else
  if [ "$WARNINGS" -gt 0 ]; then
    echo "PASS with warnings. Review above."
  else
    echo "PASS: Worktree is healthy."
  fi
  exit 0
fi
