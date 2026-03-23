#!/usr/bin/env bash
# Extracts YAML frontmatter fields from a plan file.
# Usage: bash parse-plan-frontmatter.sh <plan-file>
#
# Outputs key=value pairs suitable for eval/source:
#   PLAN_VERSION=1
#   PLAN_CREATED=2026-03-07
#   PLAN_TITLE="Feature Name"
#   PLAN_STATUS=draft
#   PLAN_TIER=medium
#   PLAN_DOMAIN_TAGS="convex dashboard trigger"
#   PLAN_TEAM_SIZE=3
#   PLAN_ESTIMATED_FILES=12
#   PLAN_FILES_CREATE="src/a.ts src/b.ts"
#   PLAN_FILES_MODIFY="src/c.ts src/d.ts"
#   PLAN_PREFLIGHT=null
#   PLAN_SCORE=null
#   HAS_FRONTMATTER=true|false
#
# Exit codes: 0 = success, 1 = no frontmatter or parse error

set -euo pipefail

PLAN_FILE="${1:?Usage: parse-plan-frontmatter.sh <plan-file>}"

if [ ! -f "$PLAN_FILE" ]; then
  echo "ERROR: File not found: $PLAN_FILE" >&2
  echo "HAS_FRONTMATTER=false"
  exit 1
fi

# Check if file starts with ---
FIRST_LINE=$(head -1 "$PLAN_FILE")
if [ "$FIRST_LINE" != "---" ]; then
  echo "HAS_FRONTMATTER=false"
  exit 0
fi

# Extract frontmatter (between first and second ---)
FRONTMATTER=$(sed -n '1,/^---$/p' "$PLAN_FILE" | tail -n +2 | sed '$d')

if [ -z "$FRONTMATTER" ]; then
  echo "HAS_FRONTMATTER=false"
  exit 0
fi

echo "HAS_FRONTMATTER=true"

# Extract simple key: value fields
extract_field() {
  local key="$1"
  local var_name="$2"
  local value
  value=$(echo "$FRONTMATTER" | grep "^${key}:" | head -1 | sed "s/^${key}:[[:space:]]*//" | sed 's/[[:space:]]*#.*//' | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/" || true)
  if [ -n "$value" ]; then
    echo "${var_name}=\"${value}\""
  else
    echo "${var_name}=\"\""
  fi
}

extract_field "plan_version" "PLAN_VERSION"
extract_field "created" "PLAN_CREATED"
extract_field "title" "PLAN_TITLE"
extract_field "status" "PLAN_STATUS"
extract_field "tier" "PLAN_TIER"

# Extract domain_tags (inline array: [tag1, tag2, tag3])
DOMAIN_TAGS=$(echo "$FRONTMATTER" | grep "^domain_tags:" | head -1 | \
  sed 's/^domain_tags:[[:space:]]*//' | \
  sed 's/\[//;s/\]//;s/,/ /g;s/[[:space:]]\+/ /g' | \
  sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | \
  sed 's/#.*//' || true)
echo "PLAN_DOMAIN_TAGS=\"${DOMAIN_TAGS}\""

# Extract team_hint fields (indented under team_hint:)
TEAM_SIZE=$(echo "$FRONTMATTER" | grep "^[[:space:]]*size:" | head -1 | \
  sed 's/.*size:[[:space:]]*//' | sed 's/[[:space:]]*#.*//' || true)
echo "PLAN_TEAM_SIZE=\"${TEAM_SIZE}\""

ESTIMATED_FILES=$(echo "$FRONTMATTER" | grep "^[[:space:]]*estimated_files:" | head -1 | \
  sed 's/.*estimated_files:[[:space:]]*//' | sed 's/[[:space:]]*#.*//' || true)
echo "PLAN_ESTIMATED_FILES=\"${ESTIMATED_FILES}\""

# Extract files.create and files.modify lists (indented paths under create:/modify:)
CREATE_FILES=""
MODIFY_FILES=""
IN_CREATE=false
IN_MODIFY=false
while IFS= read -r line; do
  if echo "$line" | grep -q "^[[:space:]]*create:"; then
    IN_CREATE=true
    IN_MODIFY=false
    continue
  fi
  if echo "$line" | grep -q "^[[:space:]]*modify:"; then
    IN_CREATE=false
    IN_MODIFY=true
    continue
  fi
  # End of files section if we hit a non-indented key
  if echo "$line" | grep -qE "^[a-z]" && ! echo "$line" | grep -q "^[[:space:]]"; then
    IN_CREATE=false
    IN_MODIFY=false
  fi
  if [ "$IN_CREATE" = true ]; then
    path=$(echo "$line" | sed 's/.*path:[[:space:]]*//' | sed 's/[[:space:]]*#.*//' | sed 's/^- //')
    if [ -n "$path" ] && [ "$path" != "$line" ]; then
      CREATE_FILES="${CREATE_FILES} ${path}"
    fi
  fi
  if [ "$IN_MODIFY" = true ]; then
    path=$(echo "$line" | sed 's/.*path:[[:space:]]*//' | sed 's/[[:space:]]*#.*//' | sed 's/^- //')
    if [ -n "$path" ] && [ "$path" != "$line" ]; then
      MODIFY_FILES="${MODIFY_FILES} ${path}"
    fi
  fi
done <<< "$FRONTMATTER"

echo "PLAN_FILES_CREATE=\"$(echo $CREATE_FILES | sed 's/^[[:space:]]*//')\""
echo "PLAN_FILES_MODIFY=\"$(echo ${MODIFY_FILES} | sed 's/^[[:space:]]*//')\""

# Extract verification fields
PREFLIGHT=$(echo "$FRONTMATTER" | grep "^[[:space:]]*preflight:" | head -1 | \
  sed 's/.*preflight:[[:space:]]*//' | sed 's/[[:space:]]*#.*//' || true)
echo "PLAN_PREFLIGHT=\"${PREFLIGHT:-null}\""

SCORE=$(echo "$FRONTMATTER" | grep "^[[:space:]]*score:" | head -1 | \
  sed 's/.*score:[[:space:]]*//' | sed 's/[[:space:]]*#.*//' || true)
echo "PLAN_SCORE=\"${SCORE:-null}\""
