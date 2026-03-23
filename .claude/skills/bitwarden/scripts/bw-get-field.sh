#!/usr/bin/env bash
set -euo pipefail

# Bitwarden Field Extractor
# Retrieves a specific field value from a Bitwarden item.
#
# Usage:
#   bw-get-field.sh <item-name> [field-name]     Get custom field by name
#   bw-get-field.sh <item-name>                   Get default value (first field / password / notes)
#   bw-get-field.sh <item-name> --username        Get login username
#   bw-get-field.sh <item-name> --password        Get login password
#   bw-get-field.sh <item-name> --notes           Get notes field
#   bw-get-field.sh <item-name> --uri             Get first login URI
#   bw-get-field.sh <item-name> --all-fields      List all custom field names
#   bw-get-field.sh <item-name> --json            Output full item JSON
#
# Requires: BW_SESSION exported (run bw-unlock.sh first)
# Output: Prints the value to stdout. Empty output = not found.

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <item-name> [field-name|--username|--password|--notes|--uri|--all-fields|--json]" >&2
  exit 1
fi

ITEM_NAME="$1"
FIELD_NAME="${2:-}"

# Verify session exists
if [[ -z "${BW_SESSION:-}" ]]; then
  echo "BW_SESSION not set. Run: source bw-unlock.sh" >&2
  exit 1
fi

# Fetch the item — handles "more than one result" by filtering to exact name match
ITEM_JSON=$(bw get item "$ITEM_NAME" 2>/dev/null || echo "")

if [[ -z "$ITEM_JSON" ]]; then
  # bw get item fails on name collisions (e.g. "Clerk" matches Login items too).
  # Fall back to search + exact name filter, preferring Secure Notes (type 2).
  ITEM_JSON=$(bw list items --search "$ITEM_NAME" 2>/dev/null \
    | jq -r "[.[] | select(.name == \"$ITEM_NAME\")] | (([.[] | select(.type == 2)] | first) // first)" 2>/dev/null || echo "")
fi

if [[ -z "$ITEM_JSON" || "$ITEM_JSON" == "null" ]]; then
  echo "Item not found: $ITEM_NAME" >&2
  exit 1
fi

case "$FIELD_NAME" in
  --username)
    echo "$ITEM_JSON" | jq -r '.login.username // empty'
    ;;
  --password)
    echo "$ITEM_JSON" | jq -r '.login.password // empty'
    ;;
  --notes)
    echo "$ITEM_JSON" | jq -r '.notes // empty'
    ;;
  --uri)
    echo "$ITEM_JSON" | jq -r '.login.uris[0].uri // empty'
    ;;
  --all-fields)
    echo "$ITEM_JSON" | jq -r '.fields[]?.name // empty'
    ;;
  --json)
    echo "$ITEM_JSON" | jq '.'
    ;;
  "")
    # Default: try custom field first, then password, then notes
    echo "$ITEM_JSON" | jq -r '.fields[0].value // .login.password // .notes // empty'
    ;;
  *)
    # Named custom field
    VALUE=$(echo "$ITEM_JSON" | jq -r ".fields[]? | select(.name==\"$FIELD_NAME\") | .value" 2>/dev/null)
    if [[ -n "$VALUE" && "$VALUE" != "null" ]]; then
      echo "$VALUE"
    else
      echo "Field '$FIELD_NAME' not found on item '$ITEM_NAME'" >&2
      echo "Available fields:" >&2
      echo "$ITEM_JSON" | jq -r '.fields[]?.name // empty' >&2
      exit 1
    fi
    ;;
esac
