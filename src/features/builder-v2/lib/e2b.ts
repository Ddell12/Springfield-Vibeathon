import { Sandbox } from "@e2b/code-interpreter";

import type { FragmentResult } from "./schema";

export interface SandboxResult {
  sandboxId: string;
  url: string;
}

export function getSandboxUrl(host: string, port: number): string {
  // E2B's getHost(port) already embeds the port in the hostname
  // We include port in the URL path to distinguish different ports
  return `https://${host}:${port}`;
}

export async function createSandbox(fragment: FragmentResult): Promise<SandboxResult> {
  const sandbox = await Sandbox.create(fragment.template, {
    timeoutMs: 60_000,
  });

  await sandbox.files.write(fragment.file_path, fragment.code);

  if (fragment.has_additional_dependencies && fragment.additional_dependencies?.length) {
    const deps = fragment.additional_dependencies.join(" ");
    await sandbox.commands?.run(`npm install ${deps}`);
  }

  const port = fragment.port ?? 3000;
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
  const sandbox = await Sandbox.create(fragment.template, {
    timeoutMs: 60_000,
  });

  await sandbox.files.write(fragment.file_path, fragment.code);

  const port = fragment.port ?? 3000;
  const host = sandbox.getHost(port);
  const url = getSandboxUrl(host, port);

  return {
    sandboxId: sandbox.sandboxId,
    url,
  };
}
