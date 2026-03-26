#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WAB_SKILL_DIR="$HOME/.claude/plugins/marketplaces/anthropic-agent-skills/skills/web-artifacts-builder"
SCAFFOLD_DIR="$PROJECT_ROOT/artifacts/wab-scaffold"

WAB_INIT="$WAB_SKILL_DIR/scripts/init-artifact.sh"
if [ ! -f "$WAB_INIT" ]; then
  echo "❌ WAB skill not found at $WAB_SKILL_DIR"
  echo "   Install it via Claude Code skill marketplace first."
  exit 1
fi

echo "🏗️  Setting up WAB scaffold..."

# Clean existing scaffold
rm -rf "$SCAFFOLD_DIR"
mkdir -p "$PROJECT_ROOT/artifacts"

# Run WAB init-artifact.sh
cd "$PROJECT_ROOT/artifacts"
bash "$WAB_SKILL_DIR/scripts/init-artifact.sh" wab-scaffold

# Pre-install Parcel bundling deps (so bundle step doesn't install per-request)
cd "$SCAFFOLD_DIR"
pnpm add -D parcel @parcel/config-default parcel-resolver-tspaths html-inline

# Create .parcelrc
cat > .parcelrc << 'PARCELRC'
{
  "extends": "@parcel/config-default",
  "resolvers": ["parcel-resolver-tspaths", "..."]
}
PARCELRC

# Install motion (framer-motion) for therapy animations
pnpm add motion

echo "✅ WAB scaffold ready at artifacts/wab-scaffold/"
echo "   Next: run Task 2 to add therapy components"
