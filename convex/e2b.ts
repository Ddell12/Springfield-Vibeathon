// convex/e2b.ts — E2B sandbox operations
"use node";
import { Sandbox } from "@e2b/code-interpreter";

const TEMPLATE_REGISTRY: Record<string, string> = {
  "vite-therapy": "wsjspn0oy5ygip6y8rjr",
  // TODO: Add therapy-communication, therapy-behavior, therapy-schedule, therapy-academic
};

async function waitForVite(sandbox: Sandbox, maxRetries = 5): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await sandbox.commands.run(
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 2>/dev/null || echo '000'",
        { cwd: "/home/user/app" },
      );
      if (result.stdout.trim() === "200") return;
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Fallback: Vite may still be starting, continue anyway
}

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

  // Extend sandbox lifetime to 10 minutes
  await sandbox.setTimeout(600_000);

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
  await waitForVite(sandbox);

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
  await waitForVite(sandbox);
}

export async function connectOrRecreate(
  sandboxId: string,
  templateName: string,
  files: { filePath: string; fileContents: string }[],
  commands: string[] = [],
): Promise<{ sandboxId: string; previewUrl: string; isNew: boolean }> {
  try {
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
    await waitForVite(sandbox);
    return {
      sandboxId,
      previewUrl: `https://${sandbox.getHost(5173)}`,
      isNew: false,
    };
  } catch {
    // Sandbox expired — create a fresh one
    const result = await createAndDeploySandbox(templateName, files, commands);
    return { ...result, isNew: true };
  }
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
