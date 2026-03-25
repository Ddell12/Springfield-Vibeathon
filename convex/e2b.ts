// convex/e2b.ts — E2B sandbox operations (simplified for streaming builder)
"use node";
import { Sandbox } from "e2b";

const TEMPLATE_ID = "wsjspn0oy5ygip6y8rjr"; // vite-therapy

export async function createSandbox(): Promise<{ sandboxId: string; previewUrl: string }> {
  const sandbox = await Sandbox.create(TEMPLATE_ID, {
    apiKey: process.env.E2B_API_KEY,
  });
  const previewUrl = `https://${sandbox.getHost(5173)}`;
  return { sandboxId: sandbox.sandboxId, previewUrl };
}

export async function writeFiles(
  sandboxId: string,
  files: { path: string; contents: string }[],
): Promise<void> {
  const sandbox = await Sandbox.connect(sandboxId, {
    apiKey: process.env.E2B_API_KEY,
  });
  for (const file of files) {
    await sandbox.files.write(`/home/user/app/${file.path}`, file.contents);
  }
  // Give Vite HMR time to pick up the new files
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
