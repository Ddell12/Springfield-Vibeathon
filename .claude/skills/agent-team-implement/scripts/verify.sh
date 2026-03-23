#!/usr/bin/env bash
# Runs typecheck + tests + lint in sequence, with optional plan-file cross-reference.
# Usage: bash scripts/verify.sh [project-root] [--plan-file <path>]
# Exit code: 0 if all pass, 1 if any fail.

set -euo pipefail

ROOT=""
PLAN_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --plan-file)
      PLAN_FILE="${2:?--plan-file requires a path argument}"
      shift 2
      ;;
    *)
      if [ -z "$ROOT" ]; then
        ROOT="$1"
      fi
      shift
      ;;
  esac
done

ROOT="${ROOT:-.}"
cd "$ROOT"

PASS=0
FAIL=0
RESULTS=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

run_check() {
  local name="$1"
  shift
  echo "=== $name ==="
  if "$@" 2>&1; then
    RESULTS="${RESULTS}\n  ${name}: PASS"
    PASS=$((PASS + 1))
  else
    RESULTS="${RESULTS}\n  ${name}: FAIL"
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

# Pre-flight: worktree health check
if [ -f "$SCRIPT_DIR/worktree-health.sh" ]; then
  run_check "Worktree Health" bash "$SCRIPT_DIR/worktree-health.sh" "$ROOT"
fi

run_check "TypeScript" npx tsc --noEmit
run_check "Tests" npx vitest run
run_check "Lint" npx eslint --no-warn-ignored .

# Optional: plan file cross-reference
if [ -n "$PLAN_FILE" ]; then
  echo "=== Plan File Cross-Reference ==="
  if [ ! -f "$PLAN_FILE" ]; then
    echo "WARNING: Plan file not found: $PLAN_FILE — skipping cross-reference"
    RESULTS="${RESULTS}\n  Plan Cross-Ref: SKIP (file not found)"
  else
    # Get changed files
    CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only --cached 2>/dev/null || echo "")

    # Extract planned create files from frontmatter
    PLAN_CREATES=$(awk '/^files:/{found=1} found && /create:/{in_create=1; next} in_create && /^[[:space:]]+-[[:space:]]*path:/{gsub(/.*path:[[:space:]]*/, ""); print} in_create && /^[[:space:]]*[a-z]/ && !/path:/{in_create=0}' "$PLAN_FILE" 2>/dev/null)
    PLAN_MODIFIES=$(awk '/^files:/{found=1} found && /modify:/{in_modify=1; next} in_modify && /^[[:space:]]+-[[:space:]]*path:/{gsub(/.*path:[[:space:]]*/, ""); print} in_modify && /^[[:space:]]*[a-z]/ && !/path:/{in_modify=0}' "$PLAN_FILE" 2>/dev/null)

    PLAN_ISSUES=0
    if [ -n "$PLAN_CREATES$PLAN_MODIFIES" ]; then
      # Check planned files exist in diff
      for planned in $PLAN_CREATES $PLAN_MODIFIES; do
        if [ -n "$CHANGED" ] && ! echo "$CHANGED" | grep -qF "$planned"; then
          echo "WARNING: Planned file not in diff: $planned"
          PLAN_ISSUES=$((PLAN_ISSUES + 1))
        fi
      done

      if [ "$PLAN_ISSUES" -eq 0 ]; then
        echo "OK: All planned files found in diff"
        RESULTS="${RESULTS}\n  Plan Cross-Ref: PASS"
      else
        echo "WARNING: $PLAN_ISSUES planned files missing from diff"
        RESULTS="${RESULTS}\n  Plan Cross-Ref: WARN ($PLAN_ISSUES missing)"
      fi
    else
      echo "INFO: No machine-parseable file lists in plan frontmatter"
      RESULTS="${RESULTS}\n  Plan Cross-Ref: SKIP (no frontmatter files)"
    fi
  fi
  echo ""
fi

# Optional: file ownership check
if [ -n "$PLAN_FILE" ] && [ -f "$PLAN_FILE" ] && [ -f "$SCRIPT_DIR/check-file-ownership.sh" ]; then
  run_check "File Ownership" bash "$SCRIPT_DIR/check-file-ownership.sh" "$PLAN_FILE" "$ROOT"
fi

echo "=== SUMMARY ==="
echo -e "$RESULTS"
echo ""
echo "  Passed: $PASS  Failed: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
