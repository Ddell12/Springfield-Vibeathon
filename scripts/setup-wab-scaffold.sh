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

# Restore git-tracked therapy components, hooks, and design tokens
# (init-artifact.sh creates a fresh project, overwriting committed files)
cd "$PROJECT_ROOT"
git checkout HEAD -- \
  artifacts/wab-scaffold/src/components/ \
  artifacts/wab-scaffold/src/hooks/useLocalStorage.ts \
  artifacts/wab-scaffold/src/hooks/useTTS.ts \
  artifacts/wab-scaffold/src/hooks/useAnimation.ts \
  artifacts/wab-scaffold/src/hooks/useDataCollection.ts \
  artifacts/wab-scaffold/src/index.css \
  artifacts/wab-scaffold/index.html \
  2>/dev/null || echo "⚠️  No therapy components committed yet — run Task 2"

echo "✅ WAB scaffold ready at artifacts/wab-scaffold/"
