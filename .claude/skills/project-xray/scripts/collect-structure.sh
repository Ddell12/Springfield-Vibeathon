#!/usr/bin/env bash
# Collect code structure using repomix --compress (Tree-sitter extraction)
# Output: structure.json
set -euo pipefail

TARGET="${1:-.}"
OUTPUT_DIR="${2:-.xray}"
mkdir -p "$OUTPUT_DIR"

cd "$TARGET"

if command -v npx &>/dev/null && [ -f "package.json" ]; then
  npx --yes repomix --style json --compress --output "$OUTPUT_DIR/structure.json" 2>/dev/null || \
    echo '{"error":"repomix failed"}' > "$OUTPUT_DIR/structure.json"
else
  # Fallback: basic directory tree as JSON
  find . -type f \
    -not -path '*/node_modules/*' \
    -not -path '*/.git/*' \
    -not -path '*/dist/*' \
    -not -path '*/.next/*' \
    -not -path '*/__pycache__/*' \
    -not -path '*/venv/*' \
    | head -300 | sort | \
    jq -R -s 'split("\n") | map(select(length > 0))' \
    > "$OUTPUT_DIR/structure.json" 2>/dev/null || \
    echo '{"error":"no jq available","files":[]}' > "$OUTPUT_DIR/structure.json"
fi

echo "structure.json written to $OUTPUT_DIR"
