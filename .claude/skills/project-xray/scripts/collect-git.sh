#!/usr/bin/env bash
# Collect git intelligence: staleness, hotspots, churn
# Output: git-intel.json
set -euo pipefail

TARGET="${1:-.}"
OUTPUT_DIR="${2:-.xray}"
mkdir -p "$OUTPUT_DIR"

cd "$TARGET"

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo '{"error":"not a git repo","stale_files":[],"hotspots":[],"churn":[]}' > "$OUTPUT_DIR/git-intel.json"
  exit 0
fi

# Snapshot previous metrics for trend arrows (before overwriting)
PREV_TEST=$(cat "$OUTPUT_DIR/git-intel.json" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('test_files',0))" 2>/dev/null || echo 0)

# Collect all data and assemble JSON
{
  echo '{'

  # Stale files: last modified date per file
  echo '  "file_ages": ['
  first=true
  git ls-files | head -500 | while IFS= read -r f; do
    if [ -f "$f" ]; then
      d=$(git log -1 --format=%aI -- "$f" 2>/dev/null || echo "unknown")
      if [ "$first" = true ]; then first=false; else echo ','; fi
      printf '    {"file":"%s","last_modified":"%s"}' "$f" "$d"
    fi
  done
  echo ''
  echo '  ],'

  # Hotspots: most frequently changed files (top 20)
  echo '  "hotspots": ['
  git log --format=format: --name-only --since="6 months ago" 2>/dev/null | \
    sort | uniq -c | sort -rn | head -20 | \
    awk 'BEGIN{first=1} NF>0 {if(!first) printf ",\n"; first=0; printf "    {\"changes\":%d,\"file\":\"%s\"}", $1, $2}' || true
  echo ''
  echo '  ],'

  # Recent commit summary
  echo '  "recent_activity": {'
  total=$(git log --oneline --since="30 days ago" 2>/dev/null | wc -l | tr -d ' ')
  contributors=$(git log --format=%aN --since="30 days ago" 2>/dev/null | sort -u | wc -l | tr -d ' ')
  echo "    \"commits_30d\": $total,"
  echo "    \"contributors_30d\": $contributors"
  echo '  },'

  # TODO/FIXME count
  echo '  "todo_count": '
  grep -rn 'TODO\|FIXME\|HACK\|XXX' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.py' . 2>/dev/null | wc -l | tr -d ' '
  echo ','

  # Test file count
  echo '  "test_files": '
  find . -name '*.test.*' -o -name '*.spec.*' -o -name 'test_*' | grep -v node_modules | wc -l | tr -d ' '
  echo ','

  # Recent commits (last 5)
  echo '  "recent_commits": ['
  git log --oneline -5 --format='{"hash":"%h","message":"%s","date":"%ar"}' 2>/dev/null | \
    awk 'BEGIN{first=1} {if(!first) printf ",\n"; first=0; print "    "$0}'
  echo ''
  echo '  ],'

  # Previous test file count (for trend arrows — captured before redirect)
  echo "  \"prev_test_files\": $PREV_TEST,"

  # Outdated dependency count (npm outdated exits 1 when deps are outdated, so suppress pipefail)
  echo -n '  "outdated_deps": '
  OUTDATED=$(npm outdated --json 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || true)
  echo "${OUTDATED:-0}"

  echo '}'
} > "$OUTPUT_DIR/git-intel.json" 2>/dev/null

echo "git-intel.json written to $OUTPUT_DIR"
