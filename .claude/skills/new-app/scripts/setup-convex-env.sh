#!/usr/bin/env bash
set -euo pipefail

# Hackathon Starter Kit - Convex Environment Variable Setup
# Sets Convex environment variables from Bitwarden for a project.
# Usage: ./setup-convex-env.sh [--with-stripe] [--with-resend] [--with-r2] [--with-elevenlabs]

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

WITH_STRIPE=false
WITH_RESEND=false
WITH_R2=false
WITH_ELEVENLABS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --with-stripe) WITH_STRIPE=true; shift ;;
    --with-resend) WITH_RESEND=true; shift ;;
    --with-r2) WITH_R2=true; shift ;;
    --with-elevenlabs) WITH_ELEVENLABS=true; shift ;;
    --all) WITH_STRIPE=true; WITH_RESEND=true; WITH_R2=true; WITH_ELEVENLABS=true; shift ;;
    *) echo "Unknown arg: $1. Usage: $0 [--with-stripe] [--with-resend] [--with-r2] [--with-elevenlabs] [--all]"; exit 1 ;;
  esac
done

echo ""
echo "=== Setting Convex Environment Variables ==="
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

set_env() {
  local var_name="$1"
  local value="$2"
  local label="$3"

  if [[ -z "$value" || "$value" == "null" ]]; then
    echo -e "  ${YELLOW}SKIP${NC}  $var_name — value not found for $label"
    return 1
  fi

  npx convex env set "$var_name" "$value" 2>/dev/null
  echo -e "  ${GREEN}SET${NC}   $var_name"
  return 0
}

# ── Core: Auth (Clerk) ──
echo "Auth (Clerk):"
CLERK_DATA=$(bw get item "Clerk" 2>/dev/null || echo "")
if [[ -n "$CLERK_DATA" ]]; then
  CLERK_ISSUER=$(echo "$CLERK_DATA" | jq -r '.fields[]? | select(.name=="CLERK_JWT_ISSUER_DOMAIN" or .name=="issuer_domain") | .value' 2>/dev/null)
  CLERK_WEBHOOK=$(echo "$CLERK_DATA" | jq -r '.fields[]? | select(.name=="CLERK_WEBHOOK_SECRET" or .name=="webhook_secret") | .value' 2>/dev/null)
  set_env "CLERK_JWT_ISSUER_DOMAIN" "$CLERK_ISSUER" "Clerk" || echo "           → Get from Clerk Dashboard → JWT Templates"
  set_env "CLERK_WEBHOOK_SECRET" "$CLERK_WEBHOOK" "Clerk" || echo "           → Generated per-project in Clerk Dashboard → Webhooks"
else
  echo -e "  ${RED}MISSING${NC} Clerk item not found in Bitwarden"
fi

# ── Core: AI (Anthropic) ──
echo ""
echo "AI (Anthropic):"
ANTHROPIC_KEY=$(get_bw_field "Anthropic" "ANTHROPIC_API_KEY")
set_env "ANTHROPIC_API_KEY" "$ANTHROPIC_KEY" "Anthropic" || echo "           → Get from console.anthropic.com → API Keys"

# ── Optional: File Storage (R2) ──
if [[ "$WITH_R2" == true ]]; then
  echo ""
  echo "File Storage (Cloudflare R2):"
  CF_DATA=$(bw get item "Cloudflare" 2>/dev/null || echo "")
  if [[ -n "$CF_DATA" ]]; then
    R2_ACCT=$(echo "$CF_DATA" | jq -r '.fields[]? | select(.name=="R2_ACCOUNT_ID" or .name=="account_id") | .value' 2>/dev/null)
    R2_KEY=$(echo "$CF_DATA" | jq -r '.fields[]? | select(.name=="R2_ACCESS_KEY_ID" or .name=="access_key_id") | .value' 2>/dev/null)
    R2_SECRET=$(echo "$CF_DATA" | jq -r '.fields[]? | select(.name=="R2_SECRET_ACCESS_KEY" or .name=="secret_access_key") | .value' 2>/dev/null)
    set_env "R2_ACCOUNT_ID" "$R2_ACCT" "Cloudflare"
    set_env "R2_ACCESS_KEY_ID" "$R2_KEY" "Cloudflare"
    set_env "R2_SECRET_ACCESS_KEY" "$R2_SECRET" "Cloudflare"

    # Bucket name — derive from current directory name
    BUCKET_NAME="$(basename "$(pwd)")-assets"
    set_env "R2_BUCKET_NAME" "$BUCKET_NAME" "R2 Bucket"
  else
    echo -e "  ${RED}MISSING${NC} Cloudflare item not found in Bitwarden"
  fi
fi

# ── Optional: Email (Resend) ──
if [[ "$WITH_RESEND" == true ]]; then
  echo ""
  echo "Email (Resend):"
  RESEND_KEY=$(get_bw_field "Resend" "RESEND_API_KEY")
  set_env "RESEND_API_KEY" "$RESEND_KEY" "Resend" || echo "           → Get from resend.com → API Keys"
fi

# ── Optional: Billing (Stripe) ──
if [[ "$WITH_STRIPE" == true ]]; then
  echo ""
  echo "Billing (Stripe):"
  STRIPE_KEY=$(get_bw_field "Stripe" "STRIPE_SECRET_KEY")
  set_env "STRIPE_SECRET_KEY" "$STRIPE_KEY" "Stripe" || echo "           → Get from dashboard.stripe.com → Developers → API Keys"
  echo -e "  ${YELLOW}NOTE${NC}  STRIPE_WEBHOOK_SECRET must be set per-project after registering webhook endpoint"
fi

# ── Optional: Voice AI (ElevenLabs) ──
if [[ "$WITH_ELEVENLABS" == true ]]; then
  echo ""
  echo "Voice AI (ElevenLabs):"
  EL_KEY=$(get_bw_field "ElevenLabs" "ELEVENLABS_API_KEY")
  set_env "ELEVENLABS_API_KEY" "$EL_KEY" "ElevenLabs" || echo "           → Get from elevenlabs.io → Profile → API Key"
fi

echo ""
echo "=== Done ==="
echo "Run 'npx convex env list' to verify."
