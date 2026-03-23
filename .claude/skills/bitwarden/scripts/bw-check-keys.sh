#!/usr/bin/env bash
set -euo pipefail

# Bitwarden Key Verification
# Checks whether specified Bitwarden items exist and have values.
#
# Usage:
#   bw-check-keys.sh <item1> <item2> ...       Check specific items
#   bw-check-keys.sh --all                      Check all common dev keys
#
# Requires: BW_SESSION exported (run bw-unlock.sh first)
# Exit code: 0 if all found, 1 if any missing

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <item1> [item2] ... or $0 --all" >&2
  exit 1
fi

# Verify session
if [[ -z "${BW_SESSION:-}" ]]; then
  echo -e "${RED}BW_SESSION not set. Run: source bw-unlock.sh${NC}" >&2
  exit 1
fi

bw sync --quiet 2>/dev/null || true

# Dashboard URLs for common services
declare -A DASHBOARDS=(
  ["Anthropic"]="console.anthropic.com"
  ["OpenAI"]="platform.openai.com/api-keys"
  ["ElevenLabs"]="elevenlabs.io → Profile → API Key"
  ["Clerk"]="dashboard.clerk.com → API Keys"
  ["Convex"]="dashboard.convex.dev → Settings → Deploy Key"
  ["Stripe"]="dashboard.stripe.com/apikeys"
  ["Resend"]="resend.com/api-keys"
  ["GitHub"]="github.com/settings/tokens"
  ["Vercel"]="vercel.com/account/tokens"
  ["Cloudflare-R2"]="dash.cloudflare.com → R2 → API Tokens"
  ["Supabase"]="supabase.com/dashboard → Settings → API"
  ["Composio"]="app.composio.dev"
  ["Firecrawl"]="firecrawl.dev"
  ["Exa"]="exa.ai"
  ["Linear"]="linear.app/settings/api"
  ["Telegram"]="t.me/BotFather"
)

# If --all, check common keys
if [[ "$1" == "--all" ]]; then
  set -- "Anthropic" "OpenAI" "ElevenLabs" "Clerk" "Convex" "Stripe" "Resend" "GitHub" "Vercel" "Cloudflare-R2" "Supabase"
fi

FOUND=0
MISSING=0

echo ""
echo "=== Bitwarden Key Check ==="
echo ""

for ITEM in "$@"; do
  # Try direct lookup first, fall back to search on name collision
  if bw get item "$ITEM" &>/dev/null; then
    echo -e "  ${GREEN}FOUND${NC}    $ITEM"
    FOUND=$((FOUND + 1))
  elif bw list items --search "$ITEM" 2>/dev/null | jq -e ".[] | select(.name == \"$ITEM\")" &>/dev/null; then
    echo -e "  ${GREEN}FOUND${NC}    $ITEM ${YELLOW}(name collision — use ID for retrieval)${NC}"
    FOUND=$((FOUND + 1))
  else
    echo -e "  ${RED}MISSING${NC}  $ITEM"
    if [[ -n "${DASHBOARDS[$ITEM]:-}" ]]; then
      echo -e "           ${BLUE}→ ${DASHBOARDS[$ITEM]}${NC}"
    fi
    MISSING=$((MISSING + 1))
  fi
done

echo ""
echo -e "  ${GREEN}$FOUND found${NC} | ${RED}$MISSING missing${NC}"

if [[ $MISSING -gt 0 ]]; then
  exit 1
fi
exit 0
