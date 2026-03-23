#!/usr/bin/env bash
# Fetch and parse RSS feeds, outputting clean title/description pairs.
# Usage: fetch_rss.sh <feed_url> [max_items]
#
# Example:
#   fetch_rss.sh "https://feeds.bbci.co.uk/news/world/rss.xml" 10

set -euo pipefail

FEED_URL="${1:?Usage: fetch_rss.sh <feed_url> [max_items]}"
MAX_ITEMS="${2:-15}"

xml_content=$(curl -sL --max-time 10 "$FEED_URL") || {
  echo "ERROR: Failed to fetch $FEED_URL" >&2
  exit 1
}

# Extract items using awk for robust XML parsing without external deps
echo "$xml_content" | awk -v max="$MAX_ITEMS" '
BEGIN { in_item=0; count=0; title=""; desc="" }
/<item>/ { in_item=1; title=""; desc="" }
/<\/item>/ {
  if (in_item && count < max) {
    # Clean tags and whitespace
    gsub(/<!\[CDATA\[/, "", title); gsub(/\]\]>/, "", title)
    gsub(/<!\[CDATA\[/, "", desc); gsub(/\]\]>/, "", desc)
    gsub(/^[ \t]+|[ \t]+$/, "", title)
    gsub(/^[ \t]+|[ \t]+$/, "", desc)
    if (title != "") {
      print "TITLE: " title
      if (desc != "" && desc != title) print "DESC: " desc
      print "---"
      count++
    }
  }
  in_item=0
}
in_item && /<title>/ {
  gsub(/.*<title>/, ""); gsub(/<\/title>.*/, "")
  title=$0
}
in_item && /<description>/ {
  gsub(/.*<description>/, ""); gsub(/<\/description>.*/, "")
  desc=$0
}
'
