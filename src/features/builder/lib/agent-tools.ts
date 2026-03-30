import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ToolError } from "@anthropic-ai/sdk/lib/tools/ToolError";
import type { ConvexHttpClient } from "convex/browser";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { z } from "zod";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export interface ToolContext {
  send: (event: string, data: object) => void;
  sessionId: Id<"sessions">;
  collectedFiles: Map<string, string>;
  convex: ConvexHttpClient;
  buildDir: string; // path to temp WAB scaffold copy
}

/**
 * Validate that a file path from the LLM is safe to write.
 * Allowlist: must start with src/ or be a recognised config file,
 * contain only safe characters, and end with a supported extension.
 */
export function isValidFilePath(path: string): boolean {
  const allowedRoots =
    /^(src\/|vite\.config\.(ts|js)$|postcss\.config\.(ts|js|cjs)$)/;
  if (!allowedRoots.test(path)) return false;

  if (!/^[a-zA-Z0-9\-_.\/]+$/.test(path)) return false;

  if (path.includes("..") || path.includes("//")) return false;

  if (!/\.(tsx|ts|css|json|cjs|js)$/.test(path)) return false;

  return true;
}

/**
 * Scaffold files that the AI is not permitted to overwrite.
 * These are pre-built components, hooks, and utilities in the WAB scaffold.
 */
const PROTECTED_PATHS = [
  "src/components/ui/",
  "src/lib/utils.ts",
  "src/components/TokenBoard.tsx",
  "src/components/CommunicationBoard.tsx",
  "src/components/SentenceStrip.tsx",
  "src/components/CelebrationOverlay.tsx",
  "src/components/VisualSchedule.tsx",
  "src/components/TapCard.tsx",
  "src/components/BoardGrid.tsx",
  "src/components/DataTracker.tsx",
  "src/components/ChoiceGrid.tsx",
  "src/components/TimerBar.tsx",
  "src/components/PromptCard.tsx",
  "src/components/PageViewer.tsx",
  "src/components/TherapyCard.tsx",
  "src/components/SocialStory.tsx",
  "src/components/RewardPicker.tsx",
  "src/components/TokenSlot.tsx",
  "src/components/StepItem.tsx",
  "src/hooks/useLocalStorage.ts",
  "src/hooks/useTTS.ts",
  "src/hooks/useAnimation.ts",
  "src/hooks/useDataCollection.ts",
];

export function createAgentTools(ctx: ToolContext) {
  const setAppName = betaZodTool({
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
        try {
          await ctx.convex.mutation(api.sessions.updateTitle, {
            sessionId: ctx.sessionId,
            title: name,
          });
        } catch (err) {
          console.error("[set_app_name] Failed to update title:", err);
          return `App name "${name}" noted (save failed, will retry)`;
        }
        ctx.send("app_name", { name });
        return `App name set to "${name}"`;
      },
    });

  const writeFile = betaZodTool({
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

        // Path traversal guard
        const fullPath = join(ctx.buildDir, path);
        const resolved = resolve(fullPath);
        if (!resolved.startsWith(resolve(ctx.buildDir))) {
          throw new ToolError(`Path traversal blocked: ${path}`);
        }

        // Scaffold file protection
        if (PROTECTED_PATHS.some((p) => path.startsWith(p) || path === p)) {
          throw new ToolError(`Cannot overwrite scaffold file: ${path}`);
        }

        // Dual write: disk (for Parcel build) + Map (for Convex persistence & review)
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, contents, "utf-8");
        ctx.collectedFiles.set(path, contents);

        ctx.send("file_complete", { path, contents });
        const fileCount = ctx.collectedFiles.size;
        ctx.send("activity", { type: "file_written", message: `Built ${path} (${fileCount} file${fileCount > 1 ? "s" : ""})`, path });
        return "File written successfully";
      },
    });

  const readFile = betaZodTool({
      name: "read_file",
      description:
        "Read the current contents of a file from the build directory on disk.",
      inputSchema: z.object({
        path: z.string().describe("File path relative to project root"),
      }),
      run: async ({ path }) => {
        // Path traversal guard (matches write_file)
        const fullPath = join(ctx.buildDir, path);
        const resolved = resolve(fullPath);
        if (!resolved.startsWith(resolve(ctx.buildDir))) {
          throw new ToolError(`Path traversal blocked: ${path}`);
        }
        if (!existsSync(fullPath)) {
          throw new ToolError(`Error: File not found: ${path}`);
        }
        return readFileSync(fullPath, "utf-8");
      },
    });

  const listFiles = betaZodTool({
      name: "list_files",
      description:
        "List all files and directories available in a directory of the build directory.",
      inputSchema: z.object({
        directory: z
          .string()
          .describe(
            "Directory path relative to project root (e.g. src/, src/components/)",
          ),
      }),
      run: async ({ directory }) => {
        const fullPath = join(ctx.buildDir, directory);
        const resolved = resolve(fullPath);
        if (!resolved.startsWith(resolve(ctx.buildDir))) {
          throw new ToolError(`Path traversal blocked: ${directory}`);
        }
        if (!existsSync(fullPath)) return "Directory not found";
        const entries = readdirSync(fullPath, { withFileTypes: true });
        return entries
          .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
          .join("\n");
      },
    });

  return [setAppName, writeFile, readFile, listFiles];
}
