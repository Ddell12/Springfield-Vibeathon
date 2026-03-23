#!/usr/bin/env bash
set -euo pipefail

# Bitwarden Unlock Helper
# Ensures Bitwarden is unlocked and session is exported.
# Usage: source scripts/bw-unlock.sh
#   or:  eval "$(scripts/bw-unlock.sh)"
#
# After sourcing, BW_SESSION is exported and vault is synced.

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Check if bw is installed
if ! command -v bw &>/dev/null; then
  echo -e "${RED}Bitwarden CLI not found. Install with: npm install -g @bitwarden/cli${NC}" >&2
  exit 1
fi

# Check login status
STATUS=$(bw status 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unknown")

case "$STATUS" in
  unauthenticated)
    echo -e "${RED}Not logged in. Run: bw login${NC}" >&2
    exit 1
    ;;
  locked)
    if [[ -z "${BW_SESSION:-}" ]]; then
      echo "Bitwarden is locked. Unlocking..." >&2
      # Use BW_MASTER_PASSWORD env var for non-interactive unlock if available
      if [[ -n "${BW_MASTER_PASSWORD:-}" ]]; then
        export BW_PASSWORD="$BW_MASTER_PASSWORD"
        BW_SESSION=$(bw unlock --raw --passwordenv BW_PASSWORD 2>/dev/null)
        unset BW_PASSWORD
      else
        BW_SESSION=$(bw unlock --raw 2>/dev/null)
      fi
      if [[ -z "$BW_SESSION" ]]; then
        echo -e "${RED}Failed to unlock Bitwarden.${NC}" >&2
        exit 1
      fi
      export BW_SESSION
      echo "export BW_SESSION=\"$BW_SESSION\""
    fi
    ;;
  unlocked)
    if [[ -z "${BW_SESSION:-}" ]]; then
      # Unlocked but no session in env — re-unlock to get key
      BW_SESSION=$(bw unlock --raw 2>/dev/null)
      if [[ -n "$BW_SESSION" ]]; then
        export BW_SESSION
        echo "export BW_SESSION=\"$BW_SESSION\""
      fi
    fi
    ;;
  *)
    echo -e "${RED}Unknown Bitwarden status: $STATUS${NC}" >&2
    exit 1
    ;;
esac

# Sync vault
bw sync --quiet 2>/dev/null || true
echo -e "${GREEN}Bitwarden unlocked and synced.${NC}" >&2
