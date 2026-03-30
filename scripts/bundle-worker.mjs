#!/usr/bin/env node
// Standalone esbuild bundler — runs in its own process to isolate memory from
// the Next.js server. Receives a buildDir path, bundles with esbuild, processes
// CSS, assembles self-contained HTML, and writes JSON result to stdout.

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { createRequire } from "module";

// Use createRequire for esbuild since Next.js keeps it as serverExternalPackage (CJS)
const require = createRequire(import.meta.url);
const esbuild = require("esbuild");

const buildDir = process.argv[2];
if (!buildDir || !existsSync(buildDir)) {
  process.stdout.write(JSON.stringify({ ok: false, error: "buildDir not provided or does not exist" }));
  process.exit(1);
}

async function main() {
  // ---------------------------------------------------------------------------
  // 1. esbuild bundle (must be async — plugins require the async API)
  // ---------------------------------------------------------------------------
  const entryPoint = join(buildDir, "src", "main.tsx");
  if (!existsSync(entryPoint)) throw new Error("Scaffold entry point src/main.tsx not found");

  const nodePaths = [
    join(buildDir, "node_modules"),
    // Also resolve from the project root's node_modules (shared packages)
    ...(process.argv[3] ? [process.argv[3]] : []),
  ].filter(existsSync);

  const result = await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    target: ["chrome100"],
    outdir: join(buildDir, "dist"),
    jsx: "automatic",
    loader: { ".tsx": "tsx", ".ts": "ts", ".jsx": "jsx", ".js": "js" },
    minify: true,
    sourcemap: false,
    nodePaths,
    plugins: [{
      name: "ignore-css",
      setup(build) {
        build.onResolve({ filter: /\.css$/ }, () => ({
          path: "css-ignored",
          namespace: "ignore",
        }));
        build.onLoad({ filter: /.*/, namespace: "ignore" }, () => ({
          contents: "",
          loader: "js",
        }));
      },
    }],
    tsconfigRaw: JSON.stringify({
      compilerOptions: {
        baseUrl: buildDir,
        paths: { "@/*": ["./src/*"] },
        jsx: "react-jsx",
      },
    }),
    logLevel: "warning",
  });

  if (result.errors.length > 0) {
    throw new Error(`esbuild errors: ${result.errors.map(e => e.text).join("; ")}`);
  }

  const jsBundle = readFileSync(join(buildDir, "dist", "main.js"), "utf-8");

  // ---------------------------------------------------------------------------
  // 2. CSS processing
  // ---------------------------------------------------------------------------
  const cssPath = join(buildDir, "src", "index.css");
  const rawCss = existsSync(cssPath) ? readFileSync(cssPath, "utf-8") : "";
  const processedCss = rawCss
    .replace(/@tailwind\s+(?:base|components|utilities)\s*;/g, "")
    .replace(/@apply\s+border-border\s*;/g, "border-color: hsl(var(--border));")
    .replace(/@apply\s+bg-background\s+text-foreground\s*;/g,
      "background-color: hsl(var(--background)); color: hsl(var(--foreground));")
    .replace(/@apply\s+[^;]+;/g, "/* @apply stripped */")
    .replace(/@layer\s+base\s*\{\s*(:root\s*\{[\s\S]*?\})\s*\}/g, "$1")
    .replace(/@layer\s+base\s*\{\s*(\.dark\s*\{[\s\S]*?\})\s*\}/g, "$1")
    .replace(/@layer\s+base\s*\{[\s\S]*?\}/g, (match) =>
      match.replace(/\/\*[^*]*\*\//g, "").replace(/\s/g, "").length <= "@layerbase{}".length ? "" : match)
    .trim();

  // ---------------------------------------------------------------------------
  // 3. Tailwind config extraction
  // ---------------------------------------------------------------------------
  const twConfigPath = join(buildDir, "tailwind.config.js");
  const twConfigRaw = existsSync(twConfigPath) ? readFileSync(twConfigPath, "utf-8") : "";
  // LLM can no longer write tailwind.config.js (removed from write_file allowlist).
  // For any pre-existing configs, only safe JSON values are extracted — no JS eval.
  let twExtend = "{}";
  const extendIdx = twConfigRaw.indexOf("extend:");
  if (extendIdx !== -1) {
    let start = -1;
    let depth = 0;
    for (let i = extendIdx + 7; i < twConfigRaw.length; i++) {
      if (twConfigRaw[i] === "{") { if (start === -1) start = i; depth++; }
      else if (twConfigRaw[i] === "}") {
        depth--;
        if (depth === 0 && start !== -1) {
          twExtend = twConfigRaw.slice(start, i + 1);
          break;
        }
      }
    }
    // Sanitize: only allow valid JSON (no JS expressions, getters, or functions)
    try {
      twExtend = JSON.stringify(JSON.parse(twExtend));
    } catch {
      twExtend = "{}";
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Inlined tailwindcss-animate CSS (CDN can't load Node plugins)
  // ---------------------------------------------------------------------------
  const animateCss = `
@keyframes enter { from { opacity: var(--tw-enter-opacity, 1); transform: translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0) scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1)) rotate(var(--tw-enter-rotate, 0)); } }
@keyframes exit { to { opacity: var(--tw-exit-opacity, 1); transform: translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0) scale3d(var(--tw-exit-scale, 1), var(--tw-exit-scale, 1), var(--tw-exit-scale, 1)) rotate(var(--tw-exit-rotate, 0)); } }
.animate-in { animation: enter 150ms; }
.animate-out { animation: exit 150ms; }
.fade-in, .fade-in-0 { --tw-enter-opacity: 0; }
.fade-out, .fade-out-0 { --tw-exit-opacity: 0; }
.fade-out-80 { --tw-exit-opacity: 0.8; }
.zoom-in-90 { --tw-enter-scale: 0.9; }
.zoom-in-95 { --tw-enter-scale: 0.95; }
.zoom-out-95 { --tw-exit-scale: 0.95; }
.slide-in-from-top { --tw-enter-translate-y: -100%; }
.slide-in-from-top-2 { --tw-enter-translate-y: -0.5rem; }
.slide-in-from-top-full { --tw-enter-translate-y: -100%; }
.slide-in-from-top-\\[48\\%\\] { --tw-enter-translate-y: -48%; }
.slide-in-from-bottom { --tw-enter-translate-y: 100%; }
.slide-in-from-bottom-2 { --tw-enter-translate-y: 0.5rem; }
.slide-in-from-bottom-full { --tw-enter-translate-y: 100%; }
.slide-in-from-left { --tw-enter-translate-x: -100%; }
.slide-in-from-left-2 { --tw-enter-translate-x: -0.5rem; }
.slide-in-from-left-1\\/2 { --tw-enter-translate-x: -50%; }
.slide-in-from-left-52 { --tw-enter-translate-x: -13rem; }
.slide-in-from-right { --tw-enter-translate-x: 100%; }
.slide-in-from-right-2 { --tw-enter-translate-x: 0.5rem; }
.slide-in-from-right-52 { --tw-enter-translate-x: 13rem; }
.slide-out-to-top { --tw-exit-translate-y: -100%; }
.slide-out-to-top-\\[48\\%\\] { --tw-exit-translate-y: -48%; }
.slide-out-to-bottom { --tw-exit-translate-y: 100%; }
.slide-out-to-left { --tw-exit-translate-x: -100%; }
.slide-out-to-left-1\\/2 { --tw-exit-translate-x: -50%; }
.slide-out-to-left-52 { --tw-exit-translate-x: -13rem; }
.slide-out-to-right { --tw-exit-translate-x: 100%; }
.slide-out-to-right-52 { --tw-exit-translate-x: 13rem; }
.slide-out-to-right-full { --tw-exit-translate-x: 100%; }`;

  // ---------------------------------------------------------------------------
  // 5. Assemble self-contained HTML
  // ---------------------------------------------------------------------------
  const bundleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src blob: data: https:; connect-src blob: data:; frame-ancestors 'none';" />
  <script>window.tailwind = { config: { darkMode: ["class"], theme: { extend: ${twExtend} } } };</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${processedCss}</style>
  <style>${animateCss}</style>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" />
  <title>Bridges App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module">${jsBundle}</script>
</body>
</html>`;

  if (bundleHtml.length < 200) throw new Error("bundle HTML is suspiciously small");

  // Write JSON to stdout and wait for drain before exiting.
  // process.exit() doesn't wait for stdio to flush — calling it immediately
  // after write() truncates the output, causing JSON.parse failures in the parent.
  const output = JSON.stringify({ ok: true, html: bundleHtml });
  process.stdout.write(output, () => process.exit(0));
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  const output = JSON.stringify({ ok: false, error: message.slice(0, 2000) });
  process.stdout.write(output, () => process.exit(1));
});
