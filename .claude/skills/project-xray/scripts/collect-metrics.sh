#!/usr/bin/env bash
# Collect codebase metrics using cloc
# Output: metrics.json with language breakdown, LOC, comments
set -euo pipefail

TARGET="${1:-.}"
OUTPUT_DIR="${2:-.xray}"
mkdir -p "$OUTPUT_DIR"

# Check if cloc is available
if command -v cloc &>/dev/null; then
  cloc --json --quiet "$TARGET" > "$OUTPUT_DIR/metrics.json" 2>/dev/null
elif command -v npx &>/dev/null; then
  npx --yes cloc --json --quiet "$TARGET" > "$OUTPUT_DIR/metrics.json" 2>/dev/null
else
  # Fallback: basic file counting
  echo '{"error":"cloc not available","fallback":true}' > "$OUTPUT_DIR/metrics.json"
  find "$TARGET" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/.next/*' | \
    sed 's/.*\.//' | sort | uniq -c | sort -rn | \
    jq -R -s 'split("\n") | map(select(length > 0) | capture("^\\s*(?<count>[0-9]+)\\s+(?<ext>.+)$")) | map({(.ext): (.count | tonumber)}) | add // {}' \
    > "$OUTPUT_DIR/metrics.json" 2>/dev/null || true
fi

echo "metrics.json written to $OUTPUT_DIR"
