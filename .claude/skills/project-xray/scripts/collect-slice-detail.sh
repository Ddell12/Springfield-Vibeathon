#!/usr/bin/env bash
# Collect per-slice detail data for project X-Ray
# Usage: collect-slice-detail.sh <target-dir> <output-dir> <slice-name> <slice-path>
# Compatible with macOS BSD tools (no grep -P)
set -euo pipefail

TARGET="${1:-.}"
OUTPUT_DIR="${2:-.xray}"
SLICE_NAME="${3}"
SLICE_PATH="${4}"

mkdir -p "$OUTPUT_DIR"

OUT_FILE="$OUTPUT_DIR/slice-detail-${SLICE_NAME}.json"

# Helper: git root for relative paths
GIT_ROOT="$(cd "$TARGET" && git rev-parse --show-toplevel 2>/dev/null || echo "$TARGET")"

# Helper: ensure a variable is valid JSON array, default to []
json_or_empty() {
  local val="$1"
  if [ -z "$val" ] || ! echo "$val" | jq empty 2>/dev/null; then
    echo "[]"
  else
    echo "$val"
  fi
}

# ─── Files with per-file LOC ───
files_json="[]"
if command -v cloc &>/dev/null; then
  cloc_out=$(cloc --by-file --json --quiet "$SLICE_PATH" 2>/dev/null || echo '{}')
  files_json=$(echo "$cloc_out" | jq -r '
    [to_entries[]
     | select(.key != "header" and .key != "SUM")
     | {
         path: .key,
         language: .value.language,
         loc: .value.code,
         comments: .value.comment,
         blanks: .value.blank
       }
    ] // []
  ' 2>/dev/null || echo '[]')
fi

# Add last-modified date from git
files_with_dates="[]"
if [ "$files_json" != "[]" ]; then
  result=$(echo "$files_json" | jq -c '.[]' | while IFS= read -r entry; do
    fpath=$(echo "$entry" | jq -r '.path')
    last_mod=$(cd "$GIT_ROOT" && git log -1 --format="%ai" -- "$fpath" 2>/dev/null || echo "unknown")
    echo "$entry" | jq -c --arg lm "$last_mod" '. + {lastModified: $lm}'
  done | jq -s '.' 2>/dev/null) || true
  files_with_dates=$(json_or_empty "$result")
fi

# ─── Test files ───
test_files="[]"
if [ -d "$SLICE_PATH/__tests__" ]; then
  result=$(find "$SLICE_PATH/__tests__" \( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" \) 2>/dev/null | while IFS= read -r tf; do
    loc=$(wc -l < "$tf" 2>/dev/null | tr -d ' ')
    echo "{\"path\":\"$tf\",\"loc\":$loc}"
  done | jq -s '.' 2>/dev/null) || true
  test_files=$(json_or_empty "$result")
fi

# ─── Barrel exports ───
exports="[]"
barrel="$SLICE_PATH/index.ts"
if [ -f "$barrel" ]; then
  result=$(grep '^export' "$barrel" 2>/dev/null | while IFS= read -r line; do
    kind="unknown"
    case "$line" in
      *"export function"*) kind="function" ;;
      *"export async function"*) kind="function" ;;
      *"export type"*) kind="type" ;;
      *"export interface"*) kind="interface" ;;
      *"export const"*) kind="const" ;;
      *"export class"*) kind="class" ;;
      *"export default"*) kind="default" ;;
      *"export {"*) kind="re-export" ;;
      *"export *"*) kind="re-export" ;;
    esac
    name=$(echo "$line" | sed -E 's/^export (async )?((function|type|interface|const|class|default) )?([A-Za-z_][A-Za-z0-9_]*).*/\4/' 2>/dev/null || echo "")
    # Extract source file for re-exports (macOS-compatible)
    source=$(echo "$line" | sed -nE "s/.*from ['\"]\.\/([^'\"]*)['\"].*/\1/p" 2>/dev/null || echo "")
    jq -n --arg name "$name" --arg kind "$kind" --arg source "$source" --arg line "$line" \
      '{name: $name, kind: $kind, source: $source, raw: $line}'
  done | jq -s '.' 2>/dev/null) || true
  exports=$(json_or_empty "$result")
fi

# ─── Git history (last 5 commits) ───
git_history="[]"
if [ -d "$GIT_ROOT/.git" ]; then
  result=$(cd "$GIT_ROOT" && git log -5 --format='{"hash":"%h","message":"%s","date":"%ai","author":"%an"}' -- "$SLICE_PATH" 2>/dev/null | jq -s '.' 2>/dev/null) || true
  git_history=$(json_or_empty "$result")
fi

# ─── TODOs / FIXMEs ───
todos="[]"
result=$(grep -rn 'TODO\|FIXME\|HACK\|XXX' "$SLICE_PATH" --include="*.ts" --include="*.tsx" 2>/dev/null | head -50 | while IFS= read -r match; do
  file=$(echo "$match" | cut -d: -f1)
  line_no=$(echo "$match" | cut -d: -f2)
  text=$(echo "$match" | cut -d: -f3-)
  # Validate line_no is numeric
  if echo "$line_no" | grep -q '^[0-9]*$' 2>/dev/null; then
    jq -n --arg file "$file" --argjson line "$line_no" --arg text "$text" \
      '{file: $file, line: $line, text: ($text | ltrimstr(" ") | ltrimstr("\t"))}'
  fi
done | jq -s '.' 2>/dev/null) || true
todos=$(json_or_empty "$result")

# ─── Outbound dependencies (imports from other slices) ───
deps_outbound="[]"
result=$(grep -rh "from ['\"]" "$SLICE_PATH" --include="*.ts" --include="*.tsx" 2>/dev/null | \
  sed -nE "s/.*from ['\"]\.\.\/([^/'\"]*).*/\1/p" 2>/dev/null | \
  sort | uniq -c | sort -rn | \
  while read -r count dep; do
    [ -n "$dep" ] && jq -n --arg slice "$dep" --argjson count "$count" '{slice: $slice, importCount: $count}'
  done | jq -s '.' 2>/dev/null) || true
deps_outbound=$(json_or_empty "$result")

# ─── Inbound dependencies (who imports this slice) ───
deps_inbound="[]"
if [ -d "$TARGET/src" ]; then
  result=$(grep -rl "from.*['\"].*/${SLICE_NAME}" "$TARGET/src" --include="*.ts" --include="*.tsx" 2>/dev/null | \
    grep -v "$SLICE_PATH" | \
    sed -E "s|$TARGET/src/||" | \
    sed -E 's|/.*||' | \
    sort | uniq -c | sort -rn | \
    while read -r count dep; do
      [ -n "$dep" ] && jq -n --arg slice "$dep" --argjson count "$count" '{slice: $slice, importCount: $count}'
    done | jq -s '.' 2>/dev/null) || true
  deps_inbound=$(json_or_empty "$result")
fi

# ─── Bus events (emit/on/once) — macOS compatible ───
bus_emits="[]"
bus_subscribes="[]"
result=$(grep -rh 'bus\.\(emit\|publish\)' "$SLICE_PATH" --include="*.ts" 2>/dev/null | \
  sed -nE 's/.*(emit|publish)\(['"'"'"]([^'"'"'",$)]*).*/\2/p' 2>/dev/null | \
  sort -u | jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null) || true
bus_emits=$(json_or_empty "$result")

result=$(grep -rh 'bus\.\(on\|once\|subscribe\)' "$SLICE_PATH" --include="*.ts" 2>/dev/null | \
  sed -nE 's/.*(on|once|subscribe)\(['"'"'"]([^'"'"'",$)]*).*/\2/p' 2>/dev/null | \
  sort -u | jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null) || true
bus_subscribes=$(json_or_empty "$result")

# ─── MCP tools (tool names) ───
mcp_tools="[]"
result=$(grep -rh 'name:' "$SLICE_PATH" --include="*.ts" 2>/dev/null | \
  sed -nE 's/.*name:\s*["'"'"']([^"'"'"']*)["'"'"'].*/\1/p' 2>/dev/null | \
  sort -u | jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null) || true
mcp_tools=$(json_or_empty "$result")

# ─── Schema tables (Convex schema matching slice) ───
schema_tables="[]"
schema_file="$TARGET/convex/schema.ts"
if [ -f "$schema_file" ]; then
  convex_slice_dir="$TARGET/convex/${SLICE_NAME}"
  if [ ! -d "$convex_slice_dir" ]; then
    convex_slice_dir="$TARGET/convex/$(echo "$SLICE_NAME" | sed 's/s$//')"
  fi
  if [ -d "$convex_slice_dir" ]; then
    result=$(sed -nE 's/^[[:space:]]*([a-zA-Z_]+)[[:space:]]*:.*defineTable.*/\1/p' "$schema_file" 2>/dev/null | while read -r table; do
      if grep -q "$table" "$convex_slice_dir"/*.ts 2>/dev/null; then
        echo "{\"name\":\"$table\"}"
      fi
    done | jq -s '.' 2>/dev/null) || true
    schema_tables=$(json_or_empty "$result")
  fi
fi

# ─── Dashboard routes matching slice ───
dashboard_routes="[]"
if [ -d "$TARGET/dashboard/src/app" ]; then
  result=$(find "$TARGET/dashboard/src/app" -name "page.tsx" -path "*${SLICE_NAME}*" 2>/dev/null | \
    sed -E "s|$TARGET/dashboard/src/app||" | \
    sed -E 's|/page\.tsx$||' | \
    jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null) || true
  dashboard_routes=$(json_or_empty "$result")
fi

# ─── Assemble final JSON ───
jq -n \
  --arg name "$SLICE_NAME" \
  --arg path "$SLICE_PATH" \
  --argjson files "$files_with_dates" \
  --argjson testFiles "$test_files" \
  --argjson exports "$exports" \
  --argjson gitHistory "$git_history" \
  --argjson todos "$todos" \
  --argjson depsOutbound "$deps_outbound" \
  --argjson depsInbound "$deps_inbound" \
  --argjson busEmits "$bus_emits" \
  --argjson busSubscribes "$bus_subscribes" \
  --argjson mcpTools "$mcp_tools" \
  --argjson schemaTables "$schema_tables" \
  --argjson dashboardRoutes "$dashboard_routes" \
  '{
    name: $name,
    path: $path,
    files: $files,
    testFiles: $testFiles,
    exports: $exports,
    gitHistory: $gitHistory,
    todos: $todos,
    depsOutbound: $depsOutbound,
    depsInbound: $depsInbound,
    busEvents: { emits: $busEmits, subscribes: $busSubscribes },
    mcpTools: $mcpTools,
    schemaTables: $schemaTables,
    dashboardRoutes: $dashboardRoutes
  }' > "$OUT_FILE"

echo "slice-detail-${SLICE_NAME}.json written to $OUTPUT_DIR"
