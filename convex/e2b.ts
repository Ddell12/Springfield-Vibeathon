// convex/e2b.ts — E2B sandbox operations
"use node";
import { Sandbox } from "e2b";

const TEMPLATE_REGISTRY: Record<string, string> = {
  "vite-therapy": "wsjspn0oy5ygip6y8rjr",
  // TODO: Add therapy-communication, therapy-behavior, therapy-schedule, therapy-academic
};

/**
 * Ensure Vite dev server is running on port 5173.
 * Uses Node.js http module (always available in the sandbox) instead of curl
 * (not installed in node:20-slim).
 */
async function ensureViteRunning(sandbox: Sandbox): Promise<void> {
  // Kill any existing Vite process and restart fresh
  await sandbox.commands.run("pkill -f 'vite' 2>/dev/null || true", {
    cwd: "/home/user/app",
  });

  // Start Vite in the background
  await sandbox.commands.run("npm run dev > /tmp/vite.log 2>&1 &", {
    cwd: "/home/user/app",
    background: true,
  });

  // Wait for Vite to be ready by checking if port 5173 responds
  // Use Node.js one-liner since curl isn't available in node:20-slim
  const checkCmd = `node -e "const http = require('http'); const req = http.get('http://localhost:5173', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.setTimeout(1000, () => { req.destroy(); process.exit(1); });"`;

  for (let i = 0; i < 10; i++) {
    try {
      const result = await sandbox.commands.run(checkCmd, {
        cwd: "/home/user/app",
      });
      if (result.exitCode === 0) return;
    } catch {
      /* ignore — Vite still starting */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  // After 10 retries (10s), continue anyway — Vite may just be slow
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

  // Ensure Vite is running (Docker CMD may not persist with code-interpreter sandbox)
  await ensureViteRunning(sandbox);

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
  // Restart Vite to pick up new files cleanly
  await ensureViteRunning(sandbox);
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
    await ensureViteRunning(sandbox);
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
