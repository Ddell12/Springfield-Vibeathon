#!/usr/bin/env node
/**
 * Simple HTML inliner that replaces <link rel="stylesheet"> and <script src="...">
 * with their inline contents. External URLs (https://) are left as-is.
 */
const fs = require("fs");
const path = require("path");

const htmlPath = process.argv[2] || "dist/index.html";
const outPath = process.argv[3] || "bundle.html";
const distDir = path.dirname(htmlPath);

let html = fs.readFileSync(htmlPath, "utf-8");

// Inline local CSS: <link rel=stylesheet href=/file.css> → <style>contents</style>
html = html.replace(
  /<link\s+rel=["']?stylesheet["']?\s+href=["']?([^"'\s>]+)["']?\s*\/?>/gi,
  (match, href) => {
    if (href.startsWith("http://") || href.startsWith("https://")) return match;
    const cssPath = path.join(distDir, href.replace(/^\//, ""));
    if (!fs.existsSync(cssPath)) return match;
    const css = fs.readFileSync(cssPath, "utf-8");
    return `<style>${css}</style>`;
  }
);

// Inline local JS: <script type=module src=/file.js></script> → <script>contents</script>
html = html.replace(
  /<script\s+(?:type=["']?module["']?\s+)?src=["']?([^"'\s>]+)["']?(?:\s+type=["']?module["']?)?\s*><\/script>/gi,
  (match, src) => {
    if (src.startsWith("http://") || src.startsWith("https://")) return match;
    const jsPath = path.join(distDir, src.replace(/^\//, ""));
    if (!fs.existsSync(jsPath)) return match;
    const js = fs.readFileSync(jsPath, "utf-8");
    return `<script>${js}</script>`;
  }
);

fs.writeFileSync(outPath, html, "utf-8");
const size = (fs.statSync(outPath).size / 1024).toFixed(1);
process.stderr.write(`Bundled: ${outPath} (${size} KB)\n`);
