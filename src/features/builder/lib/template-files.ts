/**
 * Extracts the WebContainer template files into a flat array
 * suitable for the Vercel Deploy API.
 *
 * Used by convex/publish.ts to include all template files
 * (components, hooks, CSS, config) alongside generated files.
 */

import type { FileSystemTree } from "@webcontainer/api";

import { templateFiles } from "../hooks/webcontainer-files";

interface FlatFile {
  file: string;
  data: string;
}

/**
 * Recursively flattens a FileSystemTree into an array of { file, data } objects.
 * Skips the placeholder App.tsx (it gets overwritten by generated code).
 */
function flattenTree(tree: FileSystemTree, prefix = ""): FlatFile[] {
  const result: FlatFile[] = [];

  for (const [name, entry] of Object.entries(tree)) {
    const path = prefix ? `${prefix}/${name}` : name;

    if ("file" in entry && entry.file) {
      // Skip placeholder App.tsx — the generated version replaces it
      if (path === "src/App.tsx") continue;

      const contents = "contents" in entry.file ? entry.file.contents : undefined;
      if (typeof contents === "string") {
        result.push({ file: path, data: contents });
      }
    } else if ("directory" in entry && entry.directory) {
      result.push(...flattenTree(entry.directory, path));
    }
  }

  return result;
}

export function getPublishableTemplateFiles(): FlatFile[] {
  return flattenTree(templateFiles);
}
