#!/usr/bin/env bash
set -euo pipefail

# Hackathon Starter Kit - Toolchain Verification
# Checks all required CLI tools are installed and at correct versions.
# Installs missing tools via Homebrew where possible.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  local cmd="$2"
  local required_major="${3:-}"
  local install_cmd="${4:-}"

  if ! command -v "$cmd" &>/dev/null; then
    if [[ -n "$install_cmd" ]]; then
      echo -e "  ${YELLOW}MISSING${NC}  $name — install with: $install_cmd"
      WARN=$((WARN + 1))
    else
      echo -e "  ${RED}MISSING${NC}  $name"
      FAIL=$((FAIL + 1))
    fi
    return
  fi

  local version
  case "$cmd" in
    node) version=$(node -v | sed 's/v//') ;;
    npm) version=$(npm -v) ;;
    gh) version=$(gh --version | head -1 | awk '{print $3}') ;;
    bw) version=$(bw --version) ;;
    vercel) version=$(vercel --version 2>/dev/null | head -1 | sed 's/[^0-9.]//g') ;;
    *) version="unknown" ;;
  esac

  if [[ -n "$required_major" ]]; then
    local actual_major
    actual_major=$(echo "$version" | cut -d. -f1)
    if [[ "$actual_major" -lt "$required_major" ]]; then
      echo -e "  ${YELLOW}UPGRADE${NC}  $name v$version (need v${required_major}+)"
      WARN=$((WARN + 1))
      return
    fi
  fi

  echo -e "  ${GREEN}OK${NC}       $name v$version"
  PASS=$((PASS + 1))
}

check_npx() {
  local name="$1"
  local pkg="$2"

  if npx --yes "$pkg" --version &>/dev/null 2>&1; then
    echo -e "  ${GREEN}OK${NC}       $name (via npx)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${YELLOW}WARN${NC}     $name — npx may prompt to install on first use"
    WARN=$((WARN + 1))
  fi
}

echo ""
echo "=== Hackathon Starter Kit — Toolchain Check ==="
echo ""

echo "Core Tools:"
check "Node.js" "node" "24" "brew install node@24 (or nvm install 24)"
check "npm" "npm" "" ""
check "GitHub CLI" "gh" "" "brew install gh"
check "Bitwarden CLI" "bw" "" "brew install bitwarden-cli"
check "Vercel CLI" "vercel" "" "npm i -g vercel"

echo ""
echo "npx Tools (no install needed):"
check_npx "Convex CLI" "convex"
check_npx "shadcn CLI" "shadcn@latest"

echo ""
echo "=== Results ==="
echo -e "  ${GREEN}$PASS passed${NC} | ${YELLOW}$WARN warnings${NC} | ${RED}$FAIL failed${NC}"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "Fix failures before proceeding."
  exit 1
elif [[ $WARN -gt 0 ]]; then
  echo ""
  echo "Warnings found — some tools may need upgrading."
  exit 0
else
  echo ""
  echo "All tools ready!"
  exit 0
fi
