#!/usr/bin/env bash
set -euo pipefail

# Hackathon Starter Kit - GitHub Secrets Setup
# Sets CI/CD secrets for a GitHub repository from Bitwarden + local Vercel config.
# Usage: ./setup-github-secrets.sh [owner/repo]

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO="${1:-}"

# Auto-detect repo from git remote if not provided
if [[ -z "$REPO" ]]; then
  REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || echo "")
  if [[ -z "$REPO" ]]; then
    echo -e "${RED}Error: Could not detect repo. Pass owner/repo as argument.${NC}"
    echo "Usage: $0 <owner/repo>"
    exit 1
  fi
  echo "Detected repo: $REPO"
fi

echo ""
echo "=== Setting GitHub Secrets for $REPO ==="
echo ""

# Ensure Bitwarden is unlocked
if [[ -z "${BW_SESSION:-}" ]]; then
  echo "Unlocking Bitwarden..."
  export BW_SESSION
  BW_SESSION=$(bw unlock --raw)
  if [[ -z "$BW_SESSION" ]]; then
    echo -e "${RED}Failed to unlock Bitwarden.${NC}"
    exit 1
  fi
fi

bw sync --quiet 2>/dev/null || true

get_bw_field() {
  local item_name="$1"
  local field_name="${2:-}"

  if [[ -n "$field_name" ]]; then
    bw get item "$item_name" 2>/dev/null | jq -r ".fields[]? | select(.name==\"$field_name\") | .value" 2>/dev/null
  else
    bw get item "$item_name" 2>/dev/null | jq -r '.fields[0].value // .login.password // .notes' 2>/dev/null
  fi
}

set_secret() {
  local name="$1"
  local value="$2"
  local source="$3"

  if [[ -z "$value" || "$value" == "null" ]]; then
    echo -e "  ${YELLOW}SKIP${NC}  $name — not found ($source)"
    return 1
  fi

  gh secret set "$name" --repo "$REPO" --body "$value"
  echo -e "  ${GREEN}SET${NC}   $name"
  return 0
}

# ── Convex Deploy Key ──
echo "Deployment Keys:"
CONVEX_KEY=$(get_bw_field "Convex" "CONVEX_DEPLOY_KEY")
set_secret "CONVEX_DEPLOY_KEY" "$CONVEX_KEY" "Bitwarden: Convex" || \
  echo "           → Get from dashboard.convex.dev → Project Settings → Deploy Key"

VERCEL_TOKEN=$(get_bw_field "Vercel Token" "VERCEL_TOKEN")
set_secret "VERCEL_TOKEN" "$VERCEL_TOKEN" "Bitwarden: Vercel Token" || \
  echo "           → Get from vercel.com → Settings → Tokens"

# ── Vercel IDs (from local .vercel/project.json) ──
echo ""
echo "Vercel Project IDs:"
if [[ -f .vercel/project.json ]]; then
  VERCEL_ORG_ID=$(jq -r '.orgId' .vercel/project.json 2>/dev/null)
  VERCEL_PROJECT_ID=$(jq -r '.projectId' .vercel/project.json 2>/dev/null)

  set_secret "VERCEL_ORG_ID" "$VERCEL_ORG_ID" ".vercel/project.json"
  set_secret "VERCEL_PROJECT_ID" "$VERCEL_PROJECT_ID" ".vercel/project.json"
else
  echo -e "  ${YELLOW}SKIP${NC}  VERCEL_ORG_ID — .vercel/project.json not found"
  echo -e "  ${YELLOW}SKIP${NC}  VERCEL_PROJECT_ID — run 'vercel link --yes' first"
fi

echo ""
echo "=== Done ==="
echo "Verify with: gh secret list --repo $REPO"
