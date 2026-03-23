#!/usr/bin/env bash
set -euo pipefail

# Bitwarden Field Updater
# Updates or adds hidden fields on an existing Bitwarden item.
#
# Usage:
#   bw-update-field.sh <item-name-or-id> <FIELD=VALUE> [FIELD2=VALUE2] ...
#
# Examples:
#   bw-update-field.sh "Anthropic" "ANTHROPIC_API_KEY=sk-newkey"
#   bw-update-field.sh "ElevenLabs" "ELEVENLABS_MODEL_ID=eleven_turbo" "ELEVENLABS_VOICE_ID=newvoice"
#
# Requires: BW_SESSION exported (run bw-unlock.sh first)
# Output: Diagnostics to stderr. Item ID to stdout on success.

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <item-name-or-id> <FIELD=VALUE> [FIELD2=VALUE2] ..." >&2
  exit 1
fi

ITEM_NAME="$1"
shift

# Verify session exists
if [[ -z "${BW_SESSION:-}" ]]; then
  echo "BW_SESSION not set. Run: source bw-unlock.sh" >&2
  exit 1
fi

# --- Fetch item (collision-safe) -------------------------------------------

ITEM_JSON=$(bw get item "$ITEM_NAME" 2>/dev/null || echo "")

if [[ -z "$ITEM_JSON" ]]; then
  # Name collision — fall back to search + filter, preferring Secure Notes
  ITEM_JSON=$(bw list items --search "$ITEM_NAME" 2>/dev/null \
    | jq -r "[.[] | select(.name == \"$ITEM_NAME\")] | (([.[] | select(.type == 2)] | first) // first)" 2>/dev/null || echo "")
fi

if [[ -z "$ITEM_JSON" || "$ITEM_JSON" == "null" ]]; then
  echo "Item not found: $ITEM_NAME" >&2
  exit 1
fi

ITEM_ID=$(echo "$ITEM_JSON" | jq -r '.id')
echo "Found item: $ITEM_NAME (id: $ITEM_ID)" >&2

# --- Build updated fields array --------------------------------------------

FIELDS_JSON=$(echo "$ITEM_JSON" | jq '.fields // []')

for PAIR in "$@"; do
  if [[ "$PAIR" != *=* ]]; then
    echo "Invalid field format: '$PAIR' (expected FIELD=VALUE)" >&2
    exit 1
  fi

  FNAME="${PAIR%%=*}"
  FVALUE="${PAIR#*=}"

  # Check if field already exists
  EXISTS=$(echo "$FIELDS_JSON" | jq --arg name "$FNAME" '[.[] | select(.name == $name)] | length')

  if [[ "$EXISTS" -gt 0 ]]; then
    # Update existing field value
    FIELDS_JSON=$(echo "$FIELDS_JSON" | jq --arg name "$FNAME" --arg val "$FVALUE" \
      '[.[] | if .name == $name then .value = $val else . end]')
    echo "  UPDATED: $FNAME" >&2
  else
    # Append new hidden field (type 1)
    FIELDS_JSON=$(echo "$FIELDS_JSON" | jq --arg name "$FNAME" --arg val "$FVALUE" \
      '. + [{"name": $name, "value": $val, "type": 1}]')
    echo "  ADDED: $FNAME" >&2
  fi
done

# --- Apply changes with single edit ----------------------------------------

UPDATED_JSON=$(echo "$ITEM_JSON" | jq --argjson fields "$FIELDS_JSON" '.fields = $fields')
ENCODED=$(echo "$UPDATED_JSON" | bw encode)

bw edit item "$ITEM_ID" "$ENCODED" >/dev/null 2>&1

echo "$ITEM_ID"

# Sync vault
bw sync --quiet 2>/dev/null || true
echo "Vault synced." >&2
