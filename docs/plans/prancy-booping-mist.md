# Fix Turbopack Dev Server Issue

## Context

The Next.js 16 dev server (Turbopack) returns HTTP 500 on all routes. The `.next/dev/logs/next-development.log` reveals **two stacked issues**:

1. **Stale Turbopack cache** — The `.next/` directory contains compiled artifacts from a previous session that had unresolved git merge conflicts (from `worktree-design-system-migration`). The source files are now clean (conflicts resolved), but Turbopack is still serving the stale compiled versions with `<<<<<<< HEAD` markers baked in.

2. **Symlink scanning (secondary)** — 43 symlinks in `.claude/skills/` point outside the project root. Someone already added `@source not "../.claude"` and `@source not "../.worktrees"` to `globals.css` (currently unstaged), which should prevent Tailwind v4 from following them. This change needs to be kept.

## Files to Modify

- `src/app/globals.css` — already has the fix (unstaged `@source not` directives), just needs cache clear
- `.next/` — delete entirely to clear stale Turbopack cache

## Plan

### Step 1: Clear stale Turbopack cache
```bash
rm -rf .next
```

### Step 2: Restart dev server
```bash
npm run dev
```
The `@source not` directives already in `globals.css` will prevent the symlink issue on restart.

### Step 3: Verify via browser
- Hit `http://localhost:3000` — should render the landing page (not 500)
- Use `/agent-browser` skill to navigate the app and confirm no console errors

## Verification

1. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` should return `200`
2. Browser automation: navigate to `/`, `/builder`, `/templates` — all should render
3. No CSS parsing errors or merge conflict markers in dev server logs
4. Check `.next/dev/logs/next-development.log` for clean startup
