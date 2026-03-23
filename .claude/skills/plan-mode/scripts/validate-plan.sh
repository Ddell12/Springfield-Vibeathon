#!/usr/bin/env bash
# Validate a plan file against the codebase.
# Usage: bash validate-plan.sh <plan-file> [project-root]
#
# Checks:
# 1. All file paths marked "Modify" actually exist
# 2. All "Create" paths don't already exist (would overwrite)
# 3. All integration point files exist
# 4. Plan length matches tier (simple/medium/complex)
# 5. YAML frontmatter structure, domain tags, and tier
#
# Exit codes: 0 = all checks pass, 1 = issues found

set -euo pipefail

PLAN_FILE="${1:?Usage: validate-plan.sh <plan-file> [project-root]}"
PROJECT_ROOT="${2:-.}"
ERRORS=0
WARNINGS=0

if [ ! -f "$PLAN_FILE" ]; then
  echo "ERROR: Plan file not found: $PLAN_FILE"
  exit 1
fi

echo "Validating plan: $PLAN_FILE"
echo "Project root: $PROJECT_ROOT"
echo "---"

# Known domain tags
KNOWN_TAGS="convex dashboard trigger sdk api testing channels memory scheduling agents vault daemon skills security health integrations scripts"

# --- YAML Frontmatter Validation ---
echo "Checking YAML frontmatter..."

# Check if file starts with ---
FIRST_LINE=$(head -n 1 "$PLAN_FILE")
if [ "$FIRST_LINE" = "---" ]; then
  # Extract frontmatter (between first and second ---)
  FRONTMATTER=$(sed -n '2,/^---$/p' "$PLAN_FILE" | sed '$d')

  if [ -z "$FRONTMATTER" ]; then
    echo "ERROR: YAML frontmatter block is empty"
    ERRORS=$((ERRORS + 1))
  else
    echo "OK: YAML frontmatter block found"

    # Check plan_version
    if echo "$FRONTMATTER" | grep -q "^plan_version:"; then
      echo "OK: plan_version present"
    else
      echo "ERROR: Missing required field 'plan_version' in frontmatter"
      ERRORS=$((ERRORS + 1))
    fi

    # Check domain_tags
    if echo "$FRONTMATTER" | grep -q "^domain_tags:"; then
      echo "OK: domain_tags present"
      # Extract tags and validate against known set
      TAGS=$(echo "$FRONTMATTER" | grep "^domain_tags:" | sed 's/domain_tags: *\[//;s/\].*//;s/,/ /g' | xargs)
      for tag in $TAGS; do
        # Strip whitespace and quotes
        clean_tag=$(echo "$tag" | tr -d ' "'"'"'')
        if [ -z "$clean_tag" ]; then
          continue
        fi
        if echo "$KNOWN_TAGS" | grep -qw "$clean_tag"; then
          echo "OK: Domain tag '$clean_tag' is valid"
        else
          echo "WARNING: Unknown domain tag '$clean_tag' (known: $KNOWN_TAGS)"
          WARNINGS=$((WARNINGS + 1))
        fi
      done
    else
      echo "ERROR: Missing required field 'domain_tags' in frontmatter"
      ERRORS=$((ERRORS + 1))
    fi

    # Check tier
    if echo "$FRONTMATTER" | grep -q "^tier:"; then
      TIER_VAL=$(echo "$FRONTMATTER" | grep "^tier:" | head -1 | sed 's/tier:[[:space:]]*//' | sed 's/[[:space:]]*#.*//' || true)
      case "$TIER_VAL" in
        simple|medium|complex) echo "OK: tier '$TIER_VAL' is valid" ;;
        *) echo "WARNING: Unknown tier '$TIER_VAL' (expected: simple, medium, complex)"; WARNINGS=$((WARNINGS + 1)) ;;
      esac
    else
      echo "WARNING: Missing 'tier' in frontmatter (defaulting to medium)"
      TIER_VAL="medium"
      WARNINGS=$((WARNINGS + 1))
    fi

    # Check files.create and files.modify sections exist
    if echo "$FRONTMATTER" | grep -q "^files:"; then
      echo "OK: files section present"

      # Validate files.create paths don't already exist
      IN_CREATE=false
      IN_MODIFY=false
      while IFS= read -r line; do
        if echo "$line" | grep -q "^  create:"; then
          IN_CREATE=true
          IN_MODIFY=false
          continue
        elif echo "$line" | grep -q "^  modify:"; then
          IN_CREATE=false
          IN_MODIFY=true
          continue
        elif echo "$line" | grep -qE "^  [a-z]"; then
          IN_CREATE=false
          IN_MODIFY=false
          continue
        fi

        # Extract path from "    - path: some/path.ts"
        path_val=$(echo "$line" | sed -n 's/^[[:space:]]*- path:[[:space:]]*//p')
        if [ -n "$path_val" ]; then
          full_path="$PROJECT_ROOT/$path_val"
          if [ "$IN_CREATE" = true ]; then
            if [ -f "$full_path" ]; then
              echo "WARNING: Frontmatter files.create path already exists: $path_val"
              echo "1" >> /tmp/plan-validate-warnings-$$
            fi
          elif [ "$IN_MODIFY" = true ]; then
            if [ ! -f "$full_path" ]; then
              echo "ERROR: Frontmatter files.modify path not found: $path_val"
              echo "1" >> /tmp/plan-validate-errors-$$
            fi
          fi
        fi
      done <<< "$FRONTMATTER"
    else
      echo "WARNING: Missing 'files' section in frontmatter"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
else
  echo "WARNING: No YAML frontmatter found (plan starts without '---'). Plans work without frontmatter but in degraded mode."
  WARNINGS=$((WARNINGS + 1))
fi

echo "---"

# --- Plan Body Validation ---

# Calculate body line count (excluding frontmatter)
if [ "$FIRST_LINE" = "---" ]; then
  # Find line number of closing ---
  FRONTMATTER_END=$(awk '/^---$/{n++; if(n==2){print NR; exit}}' "$PLAN_FILE")
  if [ -n "$FRONTMATTER_END" ]; then
    BODY_LINES=$(tail -n +"$((FRONTMATTER_END + 1))" "$PLAN_FILE" | wc -l | tr -d ' ')
  else
    BODY_LINES=$(wc -l < "$PLAN_FILE" | tr -d ' ')
  fi
else
  BODY_LINES=$(wc -l < "$PLAN_FILE" | tr -d ' ')
fi

# Determine tier-based line limits
TIER="${TIER_VAL:-medium}"
case "$TIER" in
  simple)  MIN_LINES=20; MAX_LINES=100 ;;
  medium)  MIN_LINES=40; MAX_LINES=250 ;;
  complex) MIN_LINES=60; MAX_LINES=500 ;;
  *)       MIN_LINES=40; MAX_LINES=250 ;;
esac

# Check plan length (body only) against tier
if [ "$BODY_LINES" -lt "$MIN_LINES" ]; then
  echo "WARNING: Plan body is only $BODY_LINES lines (tier '$TIER' target: $MIN_LINES-$MAX_LINES). May be missing grounding context."
  WARNINGS=$((WARNINGS + 1))
elif [ "$BODY_LINES" -gt "$MAX_LINES" ]; then
  echo "WARNING: Plan body is $BODY_LINES lines (tier '$TIER' target: $MIN_LINES-$MAX_LINES). May include implementation details that belong in TDD."
  WARNINGS=$((WARNINGS + 1))
else
  echo "OK: Plan body length ($BODY_LINES lines) is within tier '$TIER' target range ($MIN_LINES-$MAX_LINES)."
fi

# Check required sections
for section in "## Goal" "## Architecture" "## Files" "## Key Types" "## Integration Points"; do
  if grep -q "$section" "$PLAN_FILE"; then
    echo "OK: Found section '$section'"
  else
    echo "ERROR: Missing required section '$section'"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check file paths in the Files table
# Look for lines matching | `path` | Modify | or | `path` | Create |
echo "---"
echo "Checking file paths..."

# Extract paths marked as Modify — these must exist
sed -n 's/.*| `\([^`]*\)` | Modify.*/\1/p' "$PLAN_FILE" | while read -r filepath; do
  full_path="$PROJECT_ROOT/$filepath"
  if [ -f "$full_path" ]; then
    echo "OK: Modify target exists: $filepath"
  else
    echo "ERROR: Modify target NOT FOUND: $filepath"
    # Can't increment ERRORS in subshell, use temp file
    echo "1" >> /tmp/plan-validate-errors-$$
  fi
done

# Extract paths marked as Create — these should NOT exist
sed -n 's/.*| `\([^`]*\)` | Create.*/\1/p' "$PLAN_FILE" | while read -r filepath; do
  full_path="$PROJECT_ROOT/$filepath"
  if [ -f "$full_path" ]; then
    echo "WARNING: Create target already exists (will overwrite): $filepath"
    echo "1" >> /tmp/plan-validate-warnings-$$
  else
    echo "OK: Create target is new: $filepath"
  fi
done

# Check integration point paths
echo "---"
echo "Checking integration points..."
sed -n 's/.*`\(src\/[^`]*\)`.*/\1/p' "$PLAN_FILE" | sort -u | while read -r filepath; do
  # Strip :functionName() suffix if present
  clean_path=$(echo "$filepath" | sed 's/:[^/]*$//')
  full_path="$PROJECT_ROOT/$clean_path"
  if [ -f "$full_path" ]; then
    echo "OK: Integration point exists: $clean_path"
  else
    # Could be a new file listed in Files table, check
    if grep -q "$clean_path.*Create" "$PLAN_FILE"; then
      echo "OK: Integration point is a new file (listed as Create): $clean_path"
    else
      echo "WARNING: Integration point not found and not listed as Create: $clean_path"
      echo "1" >> /tmp/plan-validate-warnings-$$
    fi
  fi
done

# Collect subshell results
if [ -f /tmp/plan-validate-errors-$$ ]; then
  ERRORS=$((ERRORS + $(wc -l < /tmp/plan-validate-errors-$$)))
  rm -f /tmp/plan-validate-errors-$$
fi
if [ -f /tmp/plan-validate-warnings-$$ ]; then
  WARNINGS=$((WARNINGS + $(wc -l < /tmp/plan-validate-warnings-$$)))
  rm -f /tmp/plan-validate-warnings-$$
fi

# Summary
echo "---"
echo "Results: $ERRORS errors, $WARNINGS warnings"

if [ "$ERRORS" -gt 0 ]; then
  echo "FAIL: Fix errors before presenting plan."
  exit 1
else
  if [ "$WARNINGS" -gt 0 ]; then
    echo "PASS with warnings. Review warnings above."
  else
    echo "PASS: All checks passed."
  fi
  exit 0
fi
