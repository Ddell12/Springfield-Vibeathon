import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ToolError } from "@anthropic-ai/sdk/lib/tools/ToolError";
import type { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { templateFiles } from "@/features/builder/hooks/webcontainer-files";

export interface ToolContext {
  send: (event: string, data: object) => void;
  sessionId: Id<"sessions">;
  collectedFiles: Map<string, string>;
  convex: ConvexHttpClient;
}

/**
 * Validate that a file path from the LLM is safe to write.
 * Allowlist: must start with src/ or be a recognised config file,
 * contain only safe characters, and end with a supported extension.
 */
export function isValidFilePath(path: string): boolean {
  const allowedRoots =
    /^(src\/|tailwind\.config\.(ts|js|cjs)$|vite\.config\.(ts|js)$|postcss\.config\.(ts|js|cjs)$)/;
  if (!allowedRoots.test(path)) return false;

  if (!/^[a-zA-Z0-9\-_.\/]+$/.test(path)) return false;

  if (path.includes("..") || path.includes("//")) return false;

  if (!/\.(tsx|ts|css|json|cjs|js)$/.test(path)) return false;

  return true;
}

type FileSystemNode =
  | { file: { contents: string } }
  | { directory: Record<string, FileSystemNode> };

/**
 * Walk the FileSystemTree to retrieve file contents by path.
 * Returns null if the path doesn't exist in the template.
 */
export function getTemplateFileContents(path: string): string | null {
  const parts = path.split("/").filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: Record<string, any> = templateFiles as Record<string, any>;

  for (let i = 0; i < parts.length - 1; i++) {
    const segment = parts[i];
    const node = current[segment];
    if (!node) return null;
    if ("directory" in node) {
      current = node.directory;
    } else {
      return null;
    }
  }

  const leaf = current[parts[parts.length - 1]];
  if (!leaf) return null;
  if ("file" in leaf && typeof leaf.file.contents === "string") {
    return leaf.file.contents;
  }
  return null;
}

/**
 * List all file paths within a given directory in the template tree,
 * merged with any generated files that share the same directory prefix.
 */
export function getTemplateDirectoryListing(
  directory: string,
  generatedFiles: Map<string, string>,
): string[] {
  // Normalize directory — ensure trailing slash stripped for segment lookup
  const dirNorm = directory.endsWith("/") ? directory.slice(0, -1) : directory;
  const parts = dirNorm.split("/").filter(Boolean);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: Record<string, any> = templateFiles as Record<string, any>;

  for (const part of parts) {
    const node = current[part];
    if (!node) {
      // Directory not in template — only return generated files
      const prefix = directory.endsWith("/") ? directory : directory + "/";
      return [...generatedFiles.keys()].filter((k) => k.startsWith(prefix));
    }
    if ("directory" in node) {
      current = node.directory;
    } else {
      return [];
    }
  }

  const prefix = dirNorm ? dirNorm + "/" : "";
  const templateListing = Object.keys(current).map((name) => prefix + name);

  const generatedListing = [...generatedFiles.keys()].filter((k) =>
    k.startsWith(prefix),
  );

  return [...new Set([...templateListing, ...generatedListing])];
}

/** Add `inputSchema` alias to satisfy test introspection while keeping SDK shape intact. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withInputSchemaAlias<T extends Record<string, any>>(tool: T) {
  return Object.assign(tool, { inputSchema: (tool as Record<string, unknown>).input_schema });
}

export function createAgentTools(ctx: ToolContext) {
  const setAppName = withInputSchemaAlias(
    betaZodTool({
      name: "set_app_name",
      description:
        "Set a short, friendly name for this therapy app. Call this FIRST, before writing any files. The name appears in the toolbar and share links. Keep it under 60 characters, therapy-appropriate, no developer jargon.",
      inputSchema: z.object({
        name: z
          .string()
          .max(60)
          .describe(
            "Short app name (e.g., 'Morning Star Board', 'Feelings Check-In', 'My Daily Schedule')",
          ),
      }),
      run: async ({ name }) => {
        await ctx.convex.mutation(api.sessions.updateTitle, {
          sessionId: ctx.sessionId,
          title: name,
        });
        ctx.send("app_name", { name });
        return `App name set to "${name}"`;
      },
    }),
  );

  const writeFile = withInputSchemaAlias(
    betaZodTool({
      name: "write_file",
      description:
        "Write or overwrite a file in the therapy app project. Use for src/App.tsx, additional components, styles, or utility files.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("File path relative to project root (e.g. src/App.tsx)"),
        contents: z
          .string()
          .describe(
            "Complete file contents — never truncate or use placeholders",
          ),
      }),
      run: async ({ path, contents }) => {
        if (!isValidFilePath(path)) {
          throw new ToolError(
            "Error: Invalid file path — must be within src/ and use a supported extension",
          );
        }
        ctx.collectedFiles.set(path, contents);
        ctx.send("file_complete", { path, contents });
        ctx.send("activity", { type: "file_written", message: `Wrote ${path}`, path });
        return "File written successfully";
      },
    }),
  );

  const readFile = withInputSchemaAlias(
    betaZodTool({
      name: "read_file",
      description:
        "Read the current contents of a file. Checks generated files first, then falls back to the template.",
      inputSchema: z.object({
        path: z.string().describe("File path relative to project root"),
      }),
      run: async ({ path }) => {
        const generated = ctx.collectedFiles.get(path);
        if (generated !== undefined) return generated;

        const template = getTemplateFileContents(path);
        if (template !== null) return template;

        throw new ToolError(`Error: File not found: ${path}`);
      },
    }),
  );

  const listFiles = withInputSchemaAlias(
    betaZodTool({
      name: "list_files",
      description:
        "List all files available in a directory, including template files and generated files.",
      inputSchema: z.object({
        directory: z
          .string()
          .describe(
            "Directory path relative to project root (e.g. src/, src/components/)",
          ),
      }),
      run: async ({ directory }) => {
        const listing = getTemplateDirectoryListing(directory, ctx.collectedFiles);
        return listing.join("\n");
      },
    }),
  );

  return [setAppName, writeFile, readFile, listFiles];
}
