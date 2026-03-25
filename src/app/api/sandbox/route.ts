import { Sandbox } from "e2b";

export const runtime = "nodejs";

const TEMPLATE_ID = "wsjspn0oy5ygip6y8rjr"; // vite-therapy

export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body;

  try {
    if (action === "create") {
      const sandbox = await Sandbox.create(TEMPLATE_ID, {
        apiKey: process.env.E2B_API_KEY,
      });
      const previewUrl = `https://${sandbox.getHost(5173)}`;
      return Response.json({ sandboxId: sandbox.sandboxId, previewUrl });
    }

    if (action === "write_files") {
      const { sandboxId, files } = body as {
        sandboxId: string;
        files: { path: string; contents: string }[];
      };

      if (!sandboxId || !files) {
        return Response.json({ error: "sandboxId and files are required" }, { status: 400 });
      }

      const sandbox = await Sandbox.connect(sandboxId, {
        apiKey: process.env.E2B_API_KEY,
      });

      for (const file of files) {
        await sandbox.files.write(`/home/user/app/${file.path}`, file.contents);
      }

      // Give Vite HMR time to pick up the changes
      await new Promise((r) => setTimeout(r, 2000));

      return Response.json({ ok: true });
    }

    if (action === "kill") {
      const { sandboxId } = body as { sandboxId: string };
      if (!sandboxId) {
        return Response.json({ error: "sandboxId is required" }, { status: 400 });
      }
      try {
        const sandbox = await Sandbox.connect(sandboxId, {
          apiKey: process.env.E2B_API_KEY,
        });
        await sandbox.kill();
      } catch {
        // Already gone — ignore
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sandbox operation failed";
    console.error("[sandbox]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
