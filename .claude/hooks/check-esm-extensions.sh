#!/bin/bash
# Warn about local imports missing .js extension in TypeScript files.
# PostToolUse hook — warns via stderr, exits 0 (non-blocking).

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE_PATH" ] && exit 0

# Only check .ts/.tsx files
[[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]] && exit 0

# Skip if file doesn't exist (e.g., deleted)
[ ! -f "$FILE_PATH" ] && exit 0

# Look for local imports missing .js extension
# Matches: from "../foo" or from "./bar" but NOT from "../foo.js" or from "./bar.json"
VIOLATIONS=$(grep -nE 'from\s+["'"'"']\.\./[^"'"'"']+["'"'"']|from\s+["'"'"']\./[^"'"'"']+["'"'"']' "$FILE_PATH" 2>/dev/null \
  | grep -v 'node_modules' \
  | grep -v '\.js["'"'"']' \
  | grep -v '\.json["'"'"']' \
  | grep -v '\.css["'"'"']' \
  | grep -v '\.svg["'"'"']' \
  | head -5)

if [ -n "$VIOLATIONS" ]; then
  echo "WARNING: Local imports without .js extension in $(basename "$FILE_PATH"):" >&2
  echo "$VIOLATIONS" >&2
  echo "ESM requires explicit .js extensions on local imports." >&2
fi

exit 0
