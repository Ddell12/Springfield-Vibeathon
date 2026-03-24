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

export async function createSandbox(fragment: FragmentResult): Promise<SandboxResult> {
  const template = fragment.template;
  const sandbox = await Sandbox.create(template, {
    timeoutMs: 300_000,
  });

  const code = template === "vite-therapy" ? sanitizeForVite(fragment.code) : fragment.code;
  await sandbox.files.write(fragment.file_path, code);

  if (fragment.has_additional_dependencies && fragment.additional_dependencies?.length) {
    const deps = fragment.additional_dependencies.join(" ");
    await sandbox.commands.run(`npm install ${deps}`, { timeoutMs: 60_000 });
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
  await sandbox.files.write(fragment.file_path, code);

  if (fragment.has_additional_dependencies && fragment.additional_dependencies?.length) {
    const deps = fragment.additional_dependencies.join(" ");
    await sandbox.commands.run(`npm install ${deps}`, { timeoutMs: 60_000 });
  }

  const port = fragment.port ?? 5173;
  const host = sandbox.getHost(port);
  const url = getSandboxUrl(host, port);

  return {
    sandboxId: sandbox.sandboxId,
    url,
  };
}
