#!/usr/bin/env bash
set -euo pipefail

# Hackathon Starter Kit - Production Deployment
# Full prod deployment: Vercel project → Convex prod → GitHub repo → CI/CD secrets → custom subdomain.
# Usage: ./deploy.sh [--subdomain appname] [--skip-github] [--skip-secrets]
#
# Prerequisites:
# - Project scaffolded and working locally
# - Bitwarden unlocked (BW_SESSION set)
# - gh authenticated
# - vercel authenticated

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SUBDOMAIN=""
SKIP_GITHUB=false
SKIP_SECRETS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --subdomain) SUBDOMAIN="$2"; shift 2 ;;
    --skip-github) SKIP_GITHUB=true; shift ;;
    --skip-secrets) SKIP_SECRETS=true; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

PROJECT_NAME=$(basename "$(pwd)")
SUBDOMAIN="${SUBDOMAIN:-$PROJECT_NAME}"
DOMAIN="${SUBDOMAIN}.dellai.agency"

echo ""
echo "=== Deploying $PROJECT_NAME ==="
echo "    Domain: $DOMAIN"
echo ""

# ── Step 1: GitHub Repo ──
if [[ "$SKIP_GITHUB" == false ]]; then
  echo -e "${BLUE}[1/5]${NC} Creating GitHub repo..."
  if gh repo view "ddell12/$PROJECT_NAME" &>/dev/null 2>&1; then
    echo "  Repo already exists: ddell12/$PROJECT_NAME"
  else
    gh repo create "$PROJECT_NAME" --private --source=. --push
    echo -e "  ${GREEN}Created${NC} ddell12/$PROJECT_NAME"
  fi
else
  echo -e "${BLUE}[1/5]${NC} Skipping GitHub repo (--skip-github)"
fi

# ── Step 2: Vercel Project ──
echo ""
echo -e "${BLUE}[2/5]${NC} Linking Vercel project..."
if [[ -f .vercel/project.json ]]; then
  echo "  Already linked to Vercel"
else
  npx vercel link --yes
  echo -e "  ${GREEN}Linked${NC} to Vercel"
fi

# Add custom domain
echo "  Adding domain: $DOMAIN"
npx vercel domains add "$DOMAIN" 2>/dev/null || echo "  Domain already configured or needs DNS CNAME record"
echo ""
echo -e "  ${YELLOW}DNS:${NC} Add CNAME record for '$SUBDOMAIN' → 'cname.vercel-dns.com' in your DNS provider"

# ── Step 3: Convex Production ──
echo ""
echo -e "${BLUE}[3/5]${NC} Deploying Convex to production..."
npx convex deploy --cmd 'npm run build'
echo -e "  ${GREEN}Deployed${NC} Convex production instance"

# ── Step 4: GitHub Secrets ──
if [[ "$SKIP_SECRETS" == false && "$SKIP_GITHUB" == false ]]; then
  echo ""
  echo -e "${BLUE}[4/5]${NC} Setting GitHub secrets..."
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -f "$SCRIPT_DIR/setup-github-secrets.sh" ]]; then
    bash "$SCRIPT_DIR/setup-github-secrets.sh" "ddell12/$PROJECT_NAME"
  else
    echo -e "  ${YELLOW}SKIP${NC} setup-github-secrets.sh not found"
  fi
else
  echo ""
  echo -e "${BLUE}[4/5]${NC} Skipping GitHub secrets"
fi

# ── Step 5: Vercel Production Deploy ──
echo ""
echo -e "${BLUE}[5/5]${NC} Deploying to Vercel production..."
npx vercel deploy --prod --yes
echo -e "  ${GREEN}Deployed${NC} to production"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo -e "  ${GREEN}Live at:${NC} https://$DOMAIN"
echo -e "  ${GREEN}Vercel:${NC}  https://vercel.com/ddell12/$PROJECT_NAME"
echo -e "  ${GREEN}GitHub:${NC}  https://github.com/ddell12/$PROJECT_NAME"
echo ""
echo "Remaining manual steps:"
echo "  1. Add DNS CNAME record: $SUBDOMAIN → cname.vercel-dns.com"
echo "  2. Configure Clerk webhook endpoint for production Convex URL"
echo "  3. Set production Convex env vars (if not already done via setup-convex-env.sh)"
