#!/usr/bin/env bash
set -euo pipefail

# Hackathon Starter - Project Scaffolding Script
# Usage: bash setup.sh --name my-app --dir ~/Projects/my-app --auth yes --theme neutral --components "button,card,input"

# Defaults
NAME=""
DIR=""
AUTH="yes"
THEME="neutral"
COMPONENTS="button,card,input,dialog,sonner,dropdown-menu"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --name) NAME="$2"; shift 2 ;;
    --dir) DIR="$2"; shift 2 ;;
    --auth) AUTH="$2"; shift 2 ;;
    --theme) THEME="$2"; shift 2 ;;
    --components) COMPONENTS="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$NAME" ]]; then
  echo "Error: --name is required"
  exit 1
fi

DIR="${DIR:-$HOME/Projects/$NAME}"
PARENT_DIR="$(dirname "$DIR")"

echo "==> Creating $NAME at $DIR"
echo "    Auth: $AUTH | Theme: $THEME"
echo ""

# Ensure parent directory exists
mkdir -p "$PARENT_DIR"

# Step 1: Create Next.js app
echo "==> [1/5] Creating Next.js app..."
npx create-next-app@latest "$DIR" \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack \
  --use-npm \
  --yes

cd "$DIR"

# Step 2: Install Convex
echo ""
echo "==> [2/5] Installing Convex..."
npm install convex
mkdir -p convex

# Initialize Convex project (creates convex/ dir with _generated/)
npx convex dev --once || echo "    (Run 'npx convex dev' manually to complete Convex setup)"

# Step 3: Install shadcn/ui
echo ""
echo "==> [3/5] Setting up shadcn/ui..."
npx shadcn@latest init -y -b "$THEME"

# Install requested components
if [[ -n "$COMPONENTS" ]]; then
  IFS=',' read -ra COMP_ARRAY <<< "$COMPONENTS"
  for comp in "${COMP_ARRAY[@]}"; do
    comp=$(echo "$comp" | xargs) # trim whitespace
    echo "    Adding component: $comp"
    npx shadcn@latest add "$comp" -y 2>/dev/null || echo "    Warning: Could not add $comp"
  done
fi

# Step 4: Install Clerk (if auth)
echo ""
echo "==> [4/5] Installing additional dependencies..."
if [[ "$AUTH" == "yes" ]]; then
  npm install @clerk/nextjs @clerk/backend svix
  echo "    Installed @clerk/nextjs, @clerk/backend, svix"
fi

# Common dev deps
npm install -D prettier
echo "    Installed dev dependencies"

# Always-on extras
npm install next-themes
echo "    Installed next-themes"
npm install -D vercel
echo "    Installed vercel CLI"

# Write Prettier config
cat > .prettierrc << 'PRETTIER'
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
PRETTIER
echo "    Wrote .prettierrc"

# Add .vercel to gitignore
echo "" >> .gitignore
echo "# Vercel" >> .gitignore
echo ".vercel" >> .gitignore
echo "    Added .vercel to .gitignore"

# Step 5: Clean up default files we'll replace
echo ""
echo "==> [5/5] Cleaning up defaults..."
# Remove default page/layout that create-next-app generates (we'll write our own)
rm -f src/app/page.tsx src/app/layout.tsx 2>/dev/null || true
# Remove default favicon if present
# Keep globals.css as shadcn init configures it

echo ""
echo "==> Scaffold complete! Project at: $DIR"
echo "    Run Claude Code to generate boilerplate files."
