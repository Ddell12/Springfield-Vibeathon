// convex/e2b.ts — E2B sandbox operations
"use node";
import { Sandbox } from "@e2b/code-interpreter";

const TEMPLATE_REGISTRY: Record<string, string> = {
  "vite-therapy": "wsjspn0oy5ygip6y8rjr",
  // TODO: Add therapy-communication, therapy-behavior, therapy-schedule, therapy-academic
};

export async function createAndDeploySandbox(
  templateName: string,
  files: { filePath: string; fileContents: string }[],
  commands: string[] = [],
): Promise<{ sandboxId: string; previewUrl: string }> {
  const templateId =
    TEMPLATE_REGISTRY[templateName] ?? TEMPLATE_REGISTRY["vite-therapy"];
  const sandbox = await Sandbox.create(templateId, {
    apiKey: process.env.E2B_API_KEY,
  });

  for (const file of files) {
    await sandbox.files.write(
      `/home/user/app/${file.filePath}`,
      file.fileContents,
    );
  }
  for (const cmd of commands) {
    await sandbox.commands.run(cmd, { cwd: "/home/user/app" });
  }

  // Wait for Vite HMR to pick up the new files
  await new Promise((r) => setTimeout(r, 2000));

  const previewUrl = `https://${sandbox.getHost(5173)}`;

  return {
    sandboxId: sandbox.sandboxId,
    previewUrl,
  };
}

export async function updateSandboxFiles(
  sandboxId: string,
  files: { filePath: string; fileContents: string }[],
  commands: string[] = [],
): Promise<void> {
  const sandbox = await Sandbox.connect(sandboxId, {
    apiKey: process.env.E2B_API_KEY,
  });
  for (const file of files) {
    await sandbox.files.write(
      `/home/user/app/${file.filePath}`,
      file.fileContents,
    );
  }
  for (const cmd of commands) {
    await sandbox.commands.run(cmd, { cwd: "/home/user/app" });
  }
  // Wait for Vite HMR
  await new Promise((r) => setTimeout(r, 2000));
}

export async function killSandbox(sandboxId: string): Promise<void> {
  try {
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: process.env.E2B_API_KEY,
    });
    await sandbox.kill();
  } catch {
    // Sandbox may have already timed out — ignore
  }
}

export async function getRuntimeErrors(sandboxId: string): Promise<string[]> {
  const sandbox = await Sandbox.connect(sandboxId, {
    apiKey: process.env.E2B_API_KEY,
  });
  const result = await sandbox.commands.run(
    "cat /tmp/vite-errors.log 2>/dev/null || echo ''",
    { cwd: "/home/user/app" },
  );
  const errors = result.stdout.trim().split("\n").filter(Boolean);
  return errors;
}
