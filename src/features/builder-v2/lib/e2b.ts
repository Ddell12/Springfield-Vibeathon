import { Sandbox } from "@e2b/code-interpreter";

import type { FragmentResult } from "./schema";

export interface SandboxResult {
  sandboxId: string;
  url: string;
}

export function getSandboxUrl(host: string, _port: number): string {
  return `https://${host}`;
}

/**
 * Sanitize code from old Next.js projects to work in Vite sandbox.
 * Strips next/image, next/link imports and removes "use client" directive.
 */
function sanitizeForVite(code: string): string {
  let sanitized = code;
  // Remove next/image import and replace <Image> with <img>
  sanitized = sanitized.replace(/import\s+Image\s+from\s+['"]next\/image['"];?\n?/g, "");
  sanitized = sanitized.replace(/<Image\b/g, "<img");
  sanitized = sanitized.replace(/<\/Image>/g, "</img>");
  // Remove next/link import and replace <Link> with <a>
  sanitized = sanitized.replace(/import\s+Link\s+from\s+['"]next\/link['"];?\n?/g, "");
  sanitized = sanitized.replace(/<Link\b/g, "<a");
  sanitized = sanitized.replace(/<\/Link>/g, "</a>");
  // Remove "use client" directive (not needed in Vite)
  sanitized = sanitized.replace(/^['"]use client['"];?\n?/m, "");
  return sanitized;
}

/**
 * Ensure Vite dev server is running in the sandbox.
 * The template's CMD may already have started it — check first.
 * After confirming it's running, wait briefly for HMR to process any recent file writes.
 */
async function ensureViteRunning(sandbox: InstanceType<typeof Sandbox>): Promise<void> {
  // Check if Vite is already serving on port 5173
  const check = await sandbox.commands.run(
    `node -e "const http=require('http');const r=http.get('http://localhost:5173',()=>{console.log('UP');process.exit(0)});r.on('error',()=>{console.log('DOWN');process.exit(1)});r.end()"`,
    { timeoutMs: 5_000 }
  ).catch(() => ({ exitCode: 1, stdout: "DOWN" }));

  if (check.exitCode !== 0) {
    // Vite not running — start it in background and wait for it
    await sandbox.commands.run(
      "cd /home/user/app && npx vite --host 0.0.0.0 --port 5173",
      { background: true }
    );
    // Poll until Vite is ready
    await sandbox.commands.run(
      `node -e "const http=require('http');let n=0;const c=()=>{n++;const r=http.get('http://localhost:5173',()=>process.exit(0));r.on('error',()=>{if(n<40)setTimeout(c,750);else process.exit(1)});r.end()};c()"`,
      { timeoutMs: 45_000 }
    );
  }

  // Wait for HMR to process the file write we just did.
  // Vite's HMR typically takes <500ms, but give it a full second to be safe.
  await sandbox.commands.run("sleep 2", { timeoutMs: 5_000 });
}

export async function createSandbox(fragment: FragmentResult): Promise<SandboxResult> {
  const template = fragment.template;
  const sandbox = await Sandbox.create(template, {
    timeoutMs: 300_000,
  });

  const code = template === "vite-therapy" ? sanitizeForVite(fragment.code) : fragment.code;
  // E2B resolves paths relative to /home/user/, not WORKDIR.
  // Vite template lives at /home/user/app/, so prepend for vite-therapy.
  const filePath = template === "vite-therapy"
    ? `/home/user/app/${fragment.file_path}`
    : fragment.file_path;
  await sandbox.files.write(filePath, code);

  if (fragment.has_additional_dependencies && fragment.additional_dependencies?.length) {
    const deps = fragment.additional_dependencies.join(" ");
    await sandbox.commands.run(`npm install ${deps}`, { timeoutMs: 60_000 });
  }

  // For vite-therapy: ensure Vite is running and has processed the file write
  if (template === "vite-therapy") {
    await ensureViteRunning(sandbox);
  }

  const port = fragment.port ?? 5173;
  const host = sandbox.getHost(port);
  const url = getSandboxUrl(host, port);

  return {
    sandboxId: sandbox.sandboxId,
    url,
  };
}

export async function executeFragment(
  sandboxId: string,
  fragment: FragmentResult
): Promise<SandboxResult> {
  const sandbox = await Sandbox.connect(sandboxId);

  const code = fragment.template === "vite-therapy" ? sanitizeForVite(fragment.code) : fragment.code;
  const filePath = fragment.template === "vite-therapy"
    ? `/home/user/app/${fragment.file_path}`
    : fragment.file_path;
  await sandbox.files.write(filePath, code);

  if (fragment.has_additional_dependencies && fragment.additional_dependencies?.length) {
    const deps = fragment.additional_dependencies.join(" ");
    await sandbox.commands.run(`npm install ${deps}`, { timeoutMs: 60_000 });
  }

  // For reconnected sandboxes: Vite should already be running, just wait for HMR
  if (fragment.template === "vite-therapy") {
    await ensureViteRunning(sandbox);
  }

  const port = fragment.port ?? 5173;
  const host = sandbox.getHost(port);
  const url = getSandboxUrl(host, port);

  return {
    sandboxId: sandbox.sandboxId,
    url,
  };
}
