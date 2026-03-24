import type { FragmentResult } from "./schema";

export interface VercelDeployResult {
  url: string;
}

/**
 * Deploy a Vite therapy tool to Vercel via the Deploy API.
 * Creates a minimal static deployment with the generated code embedded.
 */
export async function deployToVercel(
  fragment: FragmentResult,
  options?: { projectName?: string; token?: string }
): Promise<VercelDeployResult> {
  const token = options?.token ?? process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is not configured");

  const projectName =
    options?.projectName ??
    `bridges-${fragment.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Date.now()}`;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>${fragment.title}</title>
    <script type="module" src="/src/main.tsx"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

  const response = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      files: [
        {
          file: "index.html",
          data: Buffer.from(indexHtml).toString("base64"),
          encoding: "base64",
        },
        {
          file: "src/App.tsx",
          data: Buffer.from(fragment.code).toString("base64"),
          encoding: "base64",
        },
      ],
      projectSettings: {
        framework: "vite",
        buildCommand: "vite build",
        outputDirectory: "dist",
        installCommand: "npm install",
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vercel API error: ${response.status} ${text}`);
  }

  const data = await response.json() as { url?: string; alias?: string[] };
  const url = data.url ? `https://${data.url}` : (data.alias?.[0] ? `https://${data.alias[0]}` : "");

  return { url };
}
