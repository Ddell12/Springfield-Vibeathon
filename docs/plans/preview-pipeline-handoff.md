# Preview Pipeline Handoff — Debugging the esbuild + Tailwind CDN Bundle

## Goal
The builder preview must render **polished, styled** therapy apps in the iframe on the **deployed Vercel** app (bridgeai-iota.vercel.app). Currently the preview renders but CSS/styling is broken — unstyled text, missing colors, icons as emoji, no gradients.

## Current State (commit `e02c3bb`, deploying now)

### What works
- esbuild bundles JS/TSX successfully on Vercel at runtime
- Bundle HTML is delivered to client via SSE and rendered in iframe
- Tailwind CDN script loads and processes utility classes from JSX
- CSS custom properties (`:root { --border, --primary, ... }`) are now in a regular `<style>` tag
- `@apply` directives converted to regular CSS equivalents
- Tailwind config `extend` object fully extracted with balanced brace matching

### What may still be broken
- **Tailwind CDN may not see utility classes** — CDN scans `<body>` for class names, but the classes are inside a `<script type="module">` (minified JS). The CDN might not scan script tags.
- **`@layer` blocks in regular `<style>`** — browser-native `@layer` works but may interact unexpectedly with Tailwind CDN's generated styles
- **shadcn/ui component styles** — components use `cn()` (clsx + tailwind-merge) at runtime, generating class strings. CDN needs to see these classes to generate CSS.
- **Tailwind CDN `content` scanning** — the CDN may need explicit `content` config telling it where to find classes (the inline `<script>` module)

## Architecture

### The Pipeline
```
User prompt → Claude Sonnet generates React files via tool calls →
Files written to temp copy of WAB scaffold →
esbuild bundles src/main.tsx → single main.js →
CSS from index.css processed (strip @tailwind/@apply) →
Tailwind config extracted from tailwind.config.js →
HTML template assembled with CDN + CSS + JS →
Sent to client via SSE "bundle" event →
Client renders in sandboxed iframe via blob: URL
```

### Key Files
| File | Purpose |
|------|---------|
| `src/app/api/generate/route.ts` (lines 195-315) | esbuild bundling + HTML assembly |
| `artifacts/wab-scaffold/src/index.css` | CSS variables + therapy design tokens + utility classes |
| `artifacts/wab-scaffold/tailwind.config.js` | Tailwind v3 theme with shadcn/ui color tokens |
| `artifacts/wab-scaffold/src/main.tsx` | React entry point (imports index.css, renders App) |
| `artifacts/wab-scaffold/src/App.tsx` | Default App component (overwritten by Claude) |
| `src/features/builder/lib/agent-prompt.ts` | System prompt telling Claude what classes/components to use |
| `src/features/builder/components/preview-panel.tsx` | iframe rendering with blob URL |

### The HTML Template (assembled in route.ts ~line 291)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.tailwindcss.com;" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwindcss.config = { darkMode: ["class"], theme: { extend: {colors, borderRadius, keyframes, animation} } };</script>
  <style>/* CSS variables, @layer blocks, therapy tokens — from index.css */</style>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito..." />
  <title>Bridges App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module">/* esbuild-minified React app */</script>
</body>
</html>
```

## Known Issues & Debugging Approach

### Issue 1: Tailwind CDN Class Scanning
The CDN scans the DOM for class names to generate CSS. But our app is a React SPA that renders AFTER the CDN initializes. The CDN should re-scan on DOM mutations (it uses MutationObserver), but verify this:

**Test:** Open browser console in the iframe and run:
```js
document.querySelectorAll('[class]').length  // Should be > 0
getComputedStyle(document.querySelector('.bg-primary')).backgroundColor  // Should resolve
```

**Fix if needed:** Add `tailwindcss.config.content` pointing to the script:
```html
<script>
tailwindcss.config = {
  content: [{ raw: document.querySelector('script[type=module]').textContent, extension: 'js' }],
  theme: { extend: ... }
};
</script>
```

### Issue 2: CSS Variable Scope
The `:root` variables are inside `@layer base { }` in the processed CSS. `@layer base` has the lowest specificity in the cascade. If the Tailwind CDN generates its own base styles, they might override ours.

**Test:** In the iframe console:
```js
getComputedStyle(document.documentElement).getPropertyValue('--primary')  // Should return "0 0% 9%"
getComputedStyle(document.documentElement).getPropertyValue('--border')   // Should return "0 0% 89.8%"
```

**Fix if needed:** Move variables out of `@layer base` — put them directly in `:root { }` without the layer wrapper.

### Issue 3: The CDN `extend` Config May Have Invalid JS
The `twExtend` string is extracted from `tailwind.config.js` and injected raw into a `<script>` tag. If the extracted JS contains `require()` calls or CommonJS syntax, it'll fail.

**Test:** Check browser console for "Uncaught ReferenceError: require is not defined"

**Current tailwind.config.js has:** `plugins: [require("tailwindcss-animate")]` but this is outside `extend`, so it's not extracted. Verify no `require()` leaked into twExtend.

### Issue 4: Agent Prompt May Generate Incompatible Patterns
The system prompt in `agent-prompt.ts` tells Claude to use:
- shadcn/ui semantic tokens: `bg-primary`, `text-foreground`, `bg-card`
- These rely on `hsl(var(--primary))` etc. in the Tailwind config

If the config or variables are wrong, Claude's generated code uses correct class names but they resolve to nothing.

**Test:** Generate a minimal app with known classes and check which ones work:
```
Create a card with a blue heading that says "Test" using bg-primary text-primary-foreground p-4 rounded-lg
```

## How to Debug

### 1. Use agent-browser to test on deployed app
```bash
agent-browser open https://bridgeai-iota.vercel.app/builder?new=1
# Sign in with e2e+clerk_test@bridges.ai (see memory for password)
# Verification code is always 424242
# Generate an app, then:
agent-browser errors    # Check iframe console errors
agent-browser console   # Check all console output
```

### 2. Check Vercel runtime logs
```
Use Vercel MCP: mcp__claude_ai_Vercel__get_runtime_logs
Project: prj_9sPQIvGuMxzn20hjGCA7FmFUf2uT
Team: team_JUbmJwIU5PZX64QfSZpuIeBp
```
Look for `[generate] esbuild bundle assembled:` log — shows JS/CSS/HTML sizes.

### 3. Test locally
The esbuild pipeline works locally. Run `npm run dev`, open `/builder`, generate an app. Compare local preview vs deployed preview to isolate Vercel-specific issues.

### 4. Inspect the raw bundle HTML
Add this to `preview-panel.tsx` temporarily:
```tsx
{hasPreview && <button onClick={() => { const w = window.open(); w?.document.write('<pre>' + bundleHtml + '</pre>'); }}>View HTML</button>}
```

## Vercel Deployment Context
- **Project:** bridge_ai on Vercel (prj_9sPQIvGuMxzn20hjGCA7FmFUf2uT)
- **Production URL:** bridgeai-iota.vercel.app
- **esbuild:** v0.27.4, marked as `serverExternalPackages` in next.config.ts
- **Scaffold deps:** installed via postinstall (`npm install --omit=dev`, 136MB prod deps)
- **Scaffold files:** included via `outputFileTracingIncludes` in next.config.ts
- **pnpm 10:** requires `onlyBuiltDependencies: ["esbuild"]` in package.json

### Issue 5: "tailwindcss is not defined" (CONFIRMED — found in latest test)
The CDN script loads asynchronously from `cdn.tailwindcss.com` inside a blob: URL iframe. The next `<script>` tag runs `tailwindcss.config = { ... }` before the CDN has loaded. This means the custom `extend` config (colors, animations) is NEVER applied — only Tailwind defaults work.

**Fix:** Wait for the CDN to load before setting config:
```html
<script src="https://cdn.tailwindcss.com"></script>
<script>
  // CDN may not be loaded yet in blob: context — wait for it
  function applyConfig() {
    if (typeof tailwindcss !== 'undefined') {
      tailwindcss.config = { darkMode: ["class"], theme: { extend: ... } };
    } else {
      setTimeout(applyConfig, 50);
    }
  }
  applyConfig();
</script>
```

Or use the CDN's built-in config mechanism:
```html
<script>
  // Pre-define config before CDN loads — CDN picks it up on init
  window.tailwind = { config: { darkMode: ["class"], theme: { extend: ... } } };
</script>
<script src="https://cdn.tailwindcss.com"></script>
```

This is the **highest priority fix** — it will unlock all the custom therapy colors (teal gradients, warm accents, celebration gold).

## Previous Fixes This Session (for context)
1. Clerk UserButton auth guard (`d9220da`)
2. Chat auto-scroll (`ff346f7`)
3. Parcel → esbuild migration (`ae49e89`) — Parcel was 367MB, exceeded 250MB limit
4. resolveDir for @/* aliases (`56e7eda`)
5. pnpm onlyBuiltDependencies for esbuild (`10bd8ba`)
6. tsconfigRaw replaces plugin for aliases (`1885fc4`)
7. CSS import stripping with ignore-css plugin (`d5e8165`)
8. CSS variables + @apply + extend regex fix (`e02c3bb`) ← latest, deploying now
