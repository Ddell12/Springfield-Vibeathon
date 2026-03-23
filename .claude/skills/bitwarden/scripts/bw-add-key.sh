#!/usr/bin/env bash
set -euo pipefail

# Bitwarden Item Creator
# Creates a new Secure Note with hidden custom fields for API keys/secrets.
#
# Usage:
#   bw-add-key.sh <item-name> <folder-path> [--force] <FIELD=VALUE> [FIELD2=VALUE2] ...
#
# Examples:
#   bw-add-key.sh "Acme" "API Keys/AI-ML" "ACME_API_KEY=sk-abc123"
#   bw-add-key.sh "Twilio" "API Keys/Communication" "TWILIO_SID=AC..." "TWILIO_AUTH_TOKEN=abc..."
#   bw-add-key.sh "ElevenLabs" "API Keys/AI-ML" --force "NEW_FIELD=value"
#
# Options:
#   --force   If item already exists, delegate to bw-update-field.sh instead of erroring
#
# Requires: BW_SESSION exported (run bw-unlock.sh first)
# Output: Item ID to stdout. Diagnostics to stderr.

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <item-name> <folder-path> [--force] <FIELD=VALUE> [FIELD2=VALUE2] ..." >&2
  exit 1
fi

ITEM_NAME="$1"
FOLDER_PATH="$2"
shift 2

FORCE=false
if [[ "${1:-}" == "--force" ]]; then
  FORCE=true
  shift
fi

if [[ $# -lt 1 ]]; then
  echo "At least one FIELD=VALUE pair is required." >&2
  exit 1
fi

# Verify session exists
if [[ -z "${BW_SESSION:-}" ]]; then
  echo "BW_SESSION not set. Run: source bw-unlock.sh" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Duplicate check (collision-safe) --------------------------------------

EXISTING=$(bw get item "$ITEM_NAME" 2>/dev/null || echo "")

if [[ -z "$EXISTING" ]]; then
  # Try search fallback for collision cases
  EXISTING=$(bw list items --search "$ITEM_NAME" 2>/dev/null \
    | jq -r "[.[] | select(.name == \"$ITEM_NAME\")] | (([.[] | select(.type == 2)] | first) // first)" 2>/dev/null || echo "")
fi

if [[ -n "$EXISTING" && "$EXISTING" != "null" ]]; then
  if [[ "$FORCE" == true ]]; then
    echo "Item '$ITEM_NAME' already exists — updating fields (--force)." >&2
    exec bash "$SCRIPT_DIR/bw-update-field.sh" "$ITEM_NAME" "$@"
  else
    echo "Item '$ITEM_NAME' already exists. Use --force to update instead." >&2
    exit 1
  fi
fi

# --- Resolve folder UUID ---------------------------------------------------

FOLDER_ID=$(bw list folders 2>/dev/null | jq -r --arg path "$FOLDER_PATH" '.[] | select(.name == $path) | .id' 2>/dev/null || echo "")

if [[ -z "$FOLDER_ID" || "$FOLDER_ID" == "null" ]]; then
  echo "Folder not found: '$FOLDER_PATH'" >&2
  echo "Available folders:" >&2
  bw list folders 2>/dev/null | jq -r '.[].name' >&2
  exit 1
fi

echo "Folder: $FOLDER_PATH ($FOLDER_ID)" >&2

# --- Build fields JSON array -----------------------------------------------

FIELDS_JSON="[]"
for PAIR in "$@"; do
  if [[ "$PAIR" != *=* ]]; then
    echo "Invalid field format: '$PAIR' (expected FIELD=VALUE)" >&2
    exit 1
  fi

  FNAME="${PAIR%%=*}"
  FVALUE="${PAIR#*=}"

  FIELDS_JSON=$(echo "$FIELDS_JSON" | jq --arg name "$FNAME" --arg val "$FVALUE" \
    '. + [{"name": $name, "value": $val, "type": 1}]')
  echo "  Field: $FNAME" >&2
done

# --- Create item -----------------------------------------------------------

ITEM_ID=$(bw get template item 2>/dev/null \
  | jq --arg name "$ITEM_NAME" \
       --arg folderId "$FOLDER_ID" \
       --argjson fields "$FIELDS_JSON" \
       '.type = 2 | .name = $name | .folderId = $folderId | .secureNote = {"type": 0} | .fields = $fields | .notes = ""' \
  | bw encode \
  | bw create item 2>/dev/null \
  | jq -r '.id')

if [[ -z "$ITEM_ID" || "$ITEM_ID" == "null" ]]; then
  echo "Failed to create item." >&2
  exit 1
fi

echo "Created item: $ITEM_NAME (id: $ITEM_ID)" >&2
echo "$ITEM_ID"

# Sync vault
bw sync --quiet 2>/dev/null || true
echo "Vault synced." >&2
