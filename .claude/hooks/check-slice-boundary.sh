#!/bin/bash
# Detect forbidden cross-slice imports in VSA architecture.
# PostToolUse hook — warns via stderr, exits 0 (non-blocking).

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE_PATH" ] && exit 0

# Only check src/ files
[[ "$FILE_PATH" != */src/* ]] && exit 0

# Skip if file doesn't exist
[ ! -f "$FILE_PATH" ] && exit 0

# Extract the slice this file belongs to
SLICE=$(echo "$FILE_PATH" | sed -n 's|.*/src/\([^/]*\)/.*|\1|p')
[ -z "$SLICE" ] && exit 0

# core and shared can import from anywhere
[[ "$SLICE" == "core" || "$SLICE" == "shared" ]] && exit 0

# Check for direct imports from other feature slices (not through barrel index.ts)
# Allowed: from "../core/...", from "../shared/...", from "../<own-slice>/..."
# Allowed: from "../<other-slice>/index.js" (barrel import)
# Forbidden: from "../<other-slice>/some-file.js" (direct cross-slice)
VIOLATIONS=$(grep -nE 'from\s+["'"'"']\.\./[^"'"'"']+/[^"'"'"']+["'"'"']' "$FILE_PATH" 2>/dev/null \
  | grep -v "from.*\"\.\./core/" \
  | grep -v "from.*\"\.\./shared/" \
  | grep -v "from.*\"\.\./$SLICE/" \
  | grep -v "from.*\"\.\./[^/]*/index\.js\"" \
  | head -5)

if [ -n "$VIOLATIONS" ]; then
  echo "VSA VIOLATION: Direct cross-slice import in $SLICE slice:" >&2
  echo "$VIOLATIONS" >&2
  echo "Use barrel imports (index.ts) for cross-slice access." >&2
fi

exit 0
