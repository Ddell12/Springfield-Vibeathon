#!/usr/bin/env bash
# Collect dependency graph using dependency-cruiser
# Output: deps.json (full graph) + deps-mermaid.md (Mermaid diagram)
set -euo pipefail

TARGET="${1:-.}"
OUTPUT_DIR="${2:-.xray}"
mkdir -p "$OUTPUT_DIR"

cd "$TARGET"

# Find the main source directory
SRC_DIR=""
for dir in src app lib features pages components; do
  if [ -d "$dir" ]; then
    SRC_DIR="$dir"
    break
  fi
done

if [ -z "$SRC_DIR" ]; then
  echo '{"error":"no src directory found","modules":[],"summary":{}}' > "$OUTPUT_DIR/deps.json"
  exit 0
fi

# Try dependency-cruiser first
if command -v npx &>/dev/null && [ -f "package.json" ]; then
  # JSON output (full graph)
  npx --yes dependency-cruiser "$SRC_DIR" \
    --include-only "^$SRC_DIR" \
    --output-type json \
    > "$OUTPUT_DIR/deps.json" 2>/dev/null || echo '{"modules":[],"summary":{}}' > "$OUTPUT_DIR/deps.json"

  # Mermaid output (for diagram)
  npx --yes dependency-cruiser "$SRC_DIR" \
    --include-only "^$SRC_DIR" \
    --output-type mermaid \
    > "$OUTPUT_DIR/deps-mermaid.md" 2>/dev/null || echo "graph LR\n  A[No dependency data]" > "$OUTPUT_DIR/deps-mermaid.md"
else
  echo '{"error":"dependency-cruiser not available or no package.json","modules":[],"summary":{}}' > "$OUTPUT_DIR/deps.json"
fi

echo "deps.json written to $OUTPUT_DIR"
