#!/usr/bin/env bash
# Validates file ownership assignments from the architect's design plan.
# Usage: bash check-file-ownership.sh <design-plan-text-file> <worktree-path>
#
# Checks:
# 1. No file is assigned to more than one agent
# 2. Every file in the plan exists in the worktree
# 3. No unplanned files were created (warning only)
#
# Exit codes: 0 = all checks pass, 1 = issues found

set -euo pipefail

PLAN_FILE="${1:?Usage: check-file-ownership.sh <design-plan-text-file> <worktree-path>}"
WORKTREE="${2:?Usage: check-file-ownership.sh <design-plan-text-file> <worktree-path>}"
ERRORS=0
WARNINGS=0

if [ ! -f "$PLAN_FILE" ]; then
  echo "ERROR: Plan file not found: $PLAN_FILE"
  exit 1
fi

if [ ! -d "$WORKTREE" ]; then
  echo "ERROR: Worktree not found: $WORKTREE"
  exit 1
fi

echo "Checking file ownership: $PLAN_FILE"
echo "Worktree: $WORKTREE"
echo "---"

# Extract file assignments from design plan
# Looks for table rows: | `path` | CREATE/MODIFY | owner | ...
# Also handles: | path | Create | owner | ...
TMPDIR=$(mktemp -d)
trap 'rm -r "$TMPDIR"' EXIT

# Extract all file-to-owner mappings
grep -iE '\|.*\|.*(create|modify).*\|' "$PLAN_FILE" | \
  sed 's/`//g' | \
  awk -F'|' '{
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2);
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", $4);
    if ($2 != "" && $2 != "File" && $2 != "---" && $4 != "" && $4 != "---") {
      print $2 "|" $4
    }
  }' > "$TMPDIR/assignments.txt"

if [ ! -s "$TMPDIR/assignments.txt" ]; then
  echo "WARNING: No file assignments found in plan. Skipping ownership check."
  exit 0
fi

echo "=== Duplicate Assignment Check ==="
# Check for duplicate file assignments (same file, different owners)
awk -F'|' '{print $1}' "$TMPDIR/assignments.txt" | sort | uniq -d > "$TMPDIR/duplicates.txt"
if [ -s "$TMPDIR/duplicates.txt" ]; then
  while read -r dup_file; do
    owners=$(grep "^${dup_file}|" "$TMPDIR/assignments.txt" | awk -F'|' '{print $2}' | sort -u | tr '\n' ', ' | sed 's/,$//')
    echo "ERROR: File assigned to multiple agents: $dup_file -> [$owners]"
    ERRORS=$((ERRORS + 1))
  done < "$TMPDIR/duplicates.txt"
else
  echo "OK: No duplicate assignments found."
fi

echo ""
echo "=== Planned Files Existence Check ==="
# Check that every planned file exists in the worktree
awk -F'|' '{print $1}' "$TMPDIR/assignments.txt" | sort -u | while read -r filepath; do
  if [ -z "$filepath" ]; then continue; fi
  full_path="$WORKTREE/$filepath"
  if [ -f "$full_path" ]; then
    echo "OK: $filepath exists"
  else
    echo "ERROR: Planned file missing: $filepath"
    echo "1" >> "$TMPDIR/errors"
  fi
done

echo ""
echo "=== Unplanned Files Check ==="
# Get list of files changed in the worktree branch vs main
cd "$WORKTREE"
if git diff --name-only HEAD~1 HEAD 2>/dev/null > "$TMPDIR/changed.txt"; then
  while read -r changed_file; do
    if ! grep -q "^${changed_file}|" "$TMPDIR/assignments.txt" 2>/dev/null; then
      echo "WARNING: Unplanned file changed: $changed_file"
      echo "1" >> "$TMPDIR/warnings"
    fi
  done < "$TMPDIR/changed.txt"
else
  echo "INFO: Could not determine changed files (no git history). Skipping unplanned check."
fi

# Collect subshell results
if [ -f "$TMPDIR/errors" ]; then
  ERRORS=$((ERRORS + $(wc -l < "$TMPDIR/errors")))
fi
if [ -f "$TMPDIR/warnings" ]; then
  WARNINGS=$((WARNINGS + $(wc -l < "$TMPDIR/warnings")))
fi

echo ""
echo "---"
echo "Results: $ERRORS errors, $WARNINGS warnings"

if [ "$ERRORS" -gt 0 ]; then
  echo "FAIL: Fix ownership issues before proceeding."
  exit 1
else
  if [ "$WARNINGS" -gt 0 ]; then
    echo "PASS with warnings."
  else
    echo "PASS: All ownership checks passed."
  fi
  exit 0
fi
