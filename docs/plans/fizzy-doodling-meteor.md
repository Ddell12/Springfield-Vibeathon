# Fix: Preview Bundling on Vercel — Replace Parcel with esbuild

## Context

The builder preview doesn't work on the deployed Vercel app. The WAB scaffold's `node_modules/` (367MB) is gitignored and never deployed. At runtime, `parcel build` fails silently because the binary doesn't exist. The first attempt to fix this (postinstall + outputFileTracingIncludes) failed because 367MB exceeds Vercel's 250MB serverless function limit.

**Solution:** Replace Parcel with esbuild for the runtime bundling step. esbuild is ~10MB, already a transitive dependency (via Vite), and bundles 10-100x faster.

## Changes

### 1. Revert the failed Parcel approach
- **`package.json`**: Remove the `postinstall` script
- **`next.config.ts`**: Remove `outputFileTracingIncludes`

### 2. Replace Parcel bundling with esbuild in `src/app/api/generate/route.ts`

Replace the Parcel build command (~lines 200-230) with esbuild's JavaScript API:

- Import `esbuild` (already available as transitive dep of Vite/Next.js)
- Use `esbuild.build()` with `bundle: true`, `format: "esm"`, `target: "chrome100"`
- Entry point: the scaffold's `src/main.tsx`
- Handle CSS: Use `@tailwindcss/cli` or inline Tailwind CDN for the scaffold
- Generate a single JS bundle + CSS, then inline into `index.html` template
- Replace `html-inline` with a simple string concatenation of HTML + inlined JS/CSS

**Key esbuild config:**
```ts
const result = await esbuild.build({
  entryPoints: [join(buildDir, "src/main.tsx")],
  bundle: true,
  format: "esm",
  target: ["chrome100"],
  outdir: join(buildDir, "dist"),
  jsx: "automatic",
  loader: { ".tsx": "tsx", ".ts": "ts", ".css": "css" },
  minify: true,
  sourcemap: false,
  // Resolve from scaffold's installed deps AND root node_modules
  nodePaths: [join(buildDir, "node_modules"), join(process.cwd(), "node_modules")],
});
```

### 3. Scaffold deps — minimal install
- Only install the scaffold's **production** dependencies (React, Radix, etc.) — NOT Parcel/html-inline
- The scaffold's `node_modules` without Parcel is much smaller (~80-100MB)
- esbuild itself comes from the root project (already traced by nft via import)

### 4. Tailwind CSS handling
The scaffold uses Tailwind v3 with `tailwind.config.js`. Options:
- **Option A**: Run `tailwindcss` CLI at build time (add to scaffold deps, ~15MB)
- **Option B**: Use Tailwind CDN play script in the output HTML (no build step needed, slightly larger output)
- **Option C**: Use esbuild's CSS bundling with a PostCSS plugin

Option B is simplest for the vibeathon demo. The generated apps are standalone HTML files viewed in iframes — CDN Tailwind is acceptable.

## Critical Files
- `src/app/api/generate/route.ts` — main bundling logic
- `artifacts/wab-scaffold/package.json` — remove Parcel from devDeps
- `next.config.ts` — revert outputFileTracingIncludes
- `package.json` — revert postinstall, add esbuild to deps if not already traced

## Verification
1. `npm run build` passes locally
2. Vercel deployment succeeds (no function size error)
3. Generate an app on the deployed site → preview renders correctly
4. Check Vercel runtime logs for no Parcel/esbuild errors
