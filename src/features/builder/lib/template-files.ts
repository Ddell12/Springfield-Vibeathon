/**
 * Extracts the WAB template files into a flat array
 * suitable for the Vercel Deploy API.
 *
 * Used by convex/publish.ts to include all template files
 * (components, hooks, CSS, config) alongside generated files.
 *
 * NOTE: Previously sourced from WebContainer template tree.
 * Now uses a standalone tree definition — no @webcontainer/api dependency.
 */

// Minimal file-system tree types (replaces @webcontainer/api FileSystemTree)
type FileNode = { file: { contents: string } };
type DirectoryNode = { directory: LocalFileTree };
type LocalFileTree = Record<string, FileNode | DirectoryNode>;

interface FlatFile {
  file: string;
  data: string;
}

// Stub: template files are bundled server-side via WAB scaffold during publish.
const templateFiles: LocalFileTree = {};

/**
 * Recursively flattens a LocalFileTree into an array of { file, data } objects.
 * Skips the placeholder App.tsx (it gets overwritten by generated code).
 */
function flattenTree(tree: LocalFileTree, prefix = ""): FlatFile[] {
  const result: FlatFile[] = [];

  for (const [name, entry] of Object.entries(tree)) {
    const path = prefix ? `${prefix}/${name}` : name;

    if ("file" in entry) {
      // Skip placeholder App.tsx — the generated version replaces it
      if (path === "src/App.tsx") continue;

      const { contents } = entry.file;
      if (typeof contents === "string") {
        result.push({ file: path, data: contents });
      }
    } else if ("directory" in entry) {
      result.push(...flattenTree(entry.directory, path));
    }
  }

  return result;
}

export function getPublishableTemplateFiles(): FlatFile[] {
  return flattenTree(templateFiles);
}
