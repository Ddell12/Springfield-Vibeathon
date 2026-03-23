#!/usr/bin/env bash
set -euo pipefail

# Hackathon Starter Kit - Bitwarden Key Verification
# Checks that all required API keys exist in Bitwarden.
# Reports missing keys with instructions on where to find them.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MISSING=0
FOUND=0

echo ""
echo "=== Bitwarden API Key Check ==="
echo ""

# Ensure Bitwarden is unlocked
if [[ -z "${BW_SESSION:-}" ]]; then
  echo "Bitwarden is locked. Unlocking..."
  export BW_SESSION
  BW_SESSION=$(bw unlock --raw)
  if [[ -z "$BW_SESSION" ]]; then
    echo -e "${RED}Failed to unlock Bitwarden. Exiting.${NC}"
    exit 1
  fi
fi

bw sync --quiet 2>/dev/null || true

check_key() {
  local display_name="$1"
  local bw_item_name="$2"
  local folder_hint="$3"
  local dashboard_url="$4"

  if bw get item "$bw_item_name" &>/dev/null 2>&1; then
    echo -e "  ${GREEN}FOUND${NC}    $display_name"
    FOUND=$((FOUND + 1))
  else
    echo -e "  ${RED}MISSING${NC}  $display_name"
    echo -e "           Folder: ${BLUE}$folder_hint${NC}"
    echo -e "           Get it: ${BLUE}$dashboard_url${NC}"
    MISSING=$((MISSING + 1))
  fi
}

echo "Required Keys (every project):"
check_key "Anthropic API Key" "Anthropic" "API Keys/AI-ML" "console.anthropic.com"
check_key "Clerk" "Clerk" "API Keys/Developer-Tools" "dashboard.clerk.com → API Keys"
check_key "Convex Deploy Key" "Convex" "API Keys/Databases" "dashboard.convex.dev → Settings → Deploy Key"
check_key "Vercel Token" "Vercel Token" "API Keys/Cloud-Infrastructure" "vercel.com → Settings → Tokens"
check_key "GitHub PAT" "GitHub" "API Keys/Developer-Tools" "github.com/settings/tokens"

echo ""
echo "Optional Keys (per-project):"
check_key "ElevenLabs" "ElevenLabs" "API Keys/AI-ML" "elevenlabs.io → Profile → API Key"
check_key "Cloudflare R2" "Cloudflare" "API Keys/Cloud-Infrastructure" "dash.cloudflare.com → R2 → API Tokens"
check_key "Stripe" "Stripe" "API Keys/Business-Services" "dashboard.stripe.com → Developers → API Keys"
check_key "Resend" "Resend" "API Keys/Communication" "resend.com → API Keys"
check_key "OpenAI" "OpenAI" "API Keys/AI-ML" "platform.openai.com → API Keys"

echo ""
echo "=== Results ==="
echo -e "  ${GREEN}$FOUND found${NC} | ${RED}$MISSING missing${NC}"

if [[ $MISSING -gt 0 ]]; then
  echo ""
  echo "Open missing key dashboards in browser? (y/n)"
  read -r OPEN_BROWSER
  if [[ "$OPEN_BROWSER" == "y" ]]; then
    # Re-check and open URLs for missing items
    for url in $(bw list items --search "nonexistent_placeholder" 2>/dev/null | jq -r '.[].login.uris[]?.uri' 2>/dev/null || true); do
      open "$url" 2>/dev/null || true
    done
    echo "Check your browser for dashboard links above."
  fi
fi

exit 0
