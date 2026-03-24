import { Sandbox } from "@e2b/code-interpreter";

import type { FragmentResult } from "./schema";

export interface SandboxResult {
  sandboxId: string;
  url: string;
}

export function getSandboxUrl(host: string, port: number): string {
  return `https://${host}`;
}

export async function createSandbox(fragment: FragmentResult): Promise<SandboxResult> {
  const sandbox = await Sandbox.create(fragment.template, {
    timeoutMs: 60_000,
  });

  // Write the generated code to the sandbox
  await sandbox.files.write(fragment.file_path, fragment.code);

  // Install additional dependencies if needed
  if (fragment.has_additional_dependencies && fragment.additional_dependencies?.length) {
    const deps = fragment.additional_dependencies.join(" ");
    await sandbox.commands.run(`npm install ${deps}`, { timeoutMs: 60_000 });
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
  // Reconnect to existing sandbox and update code
  const sandbox = await Sandbox.connect(sandboxId);

  await sandbox.files.write(fragment.file_path, fragment.code);

  if (fragment.has_additional_dependencies && fragment.additional_dependencies?.length) {
    const deps = fragment.additional_dependencies.join(" ");
    await sandbox.commands.run(`npm install ${deps}`, { timeoutMs: 60_000 });
  }

  const port = fragment.port ?? 3000;
  const host = sandbox.getHost(port);
  const url = getSandboxUrl(host, port);

  return {
    sandboxId: sandbox.sandboxId,
    url,
  };
}
