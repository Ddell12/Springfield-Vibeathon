#!/usr/bin/env bash
# Run all collectors in parallel
# Usage: collect-all.sh [target-dir] [output-dir]
set -euo pipefail

TARGET="${1:-.}"
OUTPUT_DIR="${2:-.xray}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$OUTPUT_DIR"

echo "=== Project X-Ray: Collecting data ==="
echo "Target: $TARGET"
echo "Output: $OUTPUT_DIR"

# Run collectors in parallel
bash "$SCRIPT_DIR/collect-metrics.sh" "$TARGET" "$OUTPUT_DIR" &
bash "$SCRIPT_DIR/collect-deps.sh" "$TARGET" "$OUTPUT_DIR" &
bash "$SCRIPT_DIR/collect-git.sh" "$TARGET" "$OUTPUT_DIR" &
bash "$SCRIPT_DIR/collect-structure.sh" "$TARGET" "$OUTPUT_DIR" &

# Wait for all background jobs
wait

echo "=== Phase 1 collectors done. Starting slice-detail collection ==="

# Detect slices: directories in src/ with index.ts or >2 .ts files
if [ -d "$TARGET/src" ]; then
  SLICES=()
  for dir in "$TARGET/src"/*/; do
    [ -d "$dir" ] || continue
    slice_name=$(basename "$dir")
    # Skip hidden dirs
    [[ "$slice_name" == .* ]] && continue
    # Include if has index.ts or >2 .ts files
    if [ -f "$dir/index.ts" ] || [ "$(find "$dir" -maxdepth 1 -name '*.ts' 2>/dev/null | wc -l | tr -d ' ')" -gt 2 ]; then
      SLICES+=("$slice_name:$dir")
    fi
  done

  if [ ${#SLICES[@]} -gt 0 ]; then
    echo "Found ${#SLICES[@]} slices to detail"
    # Run slice detail collectors in parallel (max 4 at a time)
    printf '%s\n' "${SLICES[@]}" | while IFS=: read -r name path; do
      echo "$name $path"
    done | xargs -P 4 -I {} bash -c '
      name="${1%% *}"
      path="${1#* }"
      bash "'"$SCRIPT_DIR"'/collect-slice-detail.sh" "'"$TARGET"'" "'"$OUTPUT_DIR"'" "$name" "$path"
    ' _ {}
  fi
fi

echo "=== Data collection complete ==="
ls -la "$OUTPUT_DIR"/*.json 2>/dev/null || echo "Warning: no JSON files generated"
