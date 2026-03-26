/**
 * Reads WAB scaffold files from disk and returns them as a flat array
 * suitable for the Vercel Deploy API.
 *
 * Used by convex/publish.ts (a "use node" action) to include all template
 * files (components, hooks, CSS, config) alongside generated files.
 *
 * NOTE: This module uses Node.js `fs` — it can only be imported from
 * "use node" Convex actions (esbuild bundles src/ imports at deploy time).
 */

import * as fs from "fs";
import * as path from "path";

interface FlatFile {
  file: string;
  data: string;
}

const SKIP_DIRS = new Set(["node_modules", "dist", "scripts", ".git"]);
const SKIP_FILES = new Set(["src/App.tsx"]);

function readDirRecursive(dir: string, prefix = ""): FlatFile[] {
  const result: FlatFile[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      result.push(...readDirRecursive(path.join(dir, entry.name), relPath));
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(relPath)) continue;
      const data = fs.readFileSync(path.join(dir, entry.name), "utf-8");
      result.push({ file: relPath, data });
    }
  }

  return result;
}

export function getPublishableTemplateFiles(): FlatFile[] {
  // Resolve scaffold path relative to this file at bundle time.
  // convex/publish.ts is a "use node" action; esbuild inlines src/ imports,
  // so __dirname here refers to the location of THIS source file.
  const scaffoldDir = path.resolve(__dirname, "../../../../artifacts/wab-scaffold");

  if (!fs.existsSync(scaffoldDir)) {
    console.warn("[template-files] WAB scaffold not found at", scaffoldDir);
    return [];
  }

  return readDirRecursive(scaffoldDir);
}
