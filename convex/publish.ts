"use node";

import { v } from "convex/values";

// NOTE: "use node" actions can import from src/ via relative paths (esbuild bundles them)
import { getPublishableTemplateFiles } from "../src/features/builder/lib/template-files";
import { api } from "./_generated/api";
import { action } from "./_generated/server";

export const publishApp = action({
  args: {
    sessionId: v.id("sessions"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ deploymentUrl: string }> => {
    const vercelToken = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken || !projectId) {
      throw new Error("Vercel deployment not configured (VERCEL_TOKEN, VERCEL_PROJECT_ID)");
    }

    // Fetch all generated files for this session
    const files = await ctx.runQuery(api.generated_files.list, {
      sessionId: args.sessionId,
    });

    if (files.length === 0) {
      throw new Error("No files to publish");
    }

    // Build the Vercel file array
    const vercelFiles = buildVercelFiles(
      files.map((f) => ({ path: f.path, contents: f.contents }))
    );

    // Deploy to Vercel
    const deployUrl = `https://api.vercel.com/v13/deployments${teamId ? `?teamId=${teamId}` : ""}`;
    const response = await fetch(deployUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "bridges-tool",
        project: projectId,
        files: vercelFiles,
        projectSettings: {
          framework: "vite",
          buildCommand: "npm run build",
          outputDirectory: "dist",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vercel deploy failed: ${response.status} ${error}`);
    }

    const deployment = (await response.json()) as { url: string; id: string };
    const deploymentUrl = `https://${deployment.url}`;

    // Update the apps table
    const existingApp = await ctx.runQuery(api.apps.getBySession, {
      sessionId: args.sessionId,
    });
    if (existingApp) {
      await ctx.runMutation(api.apps.update, {
        appId: existingApp._id,
        publishedUrl: deploymentUrl,
      });
    } else {
      console.warn(
        `[publish] No app record for session ${args.sessionId} — URL not persisted`,
      );
    }

    return { deploymentUrl };
  },
});

function buildVercelFiles(
  generatedFiles: Array<{ path: string; contents: string }>
): Array<{ file: string; data: string }> {
  // Template files (package.json, components, hooks, CSS, etc.)
  const templateFiles = getPublishableTemplateFiles();

  // Generated source files (App.tsx, custom components)
  const sourceFiles = generatedFiles.map((f) => ({
    file: f.path,
    data: f.contents,
  }));

  // Merge: template first, generated overrides matching paths
  const fileMap = new Map<string, string>();
  for (const f of templateFiles) {
    fileMap.set(f.file, f.data);
  }
  for (const f of sourceFiles) {
    fileMap.set(f.file, f.data);
  }

  return Array.from(fileMap.entries()).map(([file, data]) => ({ file, data }));
}
