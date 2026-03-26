import Anthropic from "@anthropic-ai/sdk";
import { exec } from "child_process";
import { ConvexHttpClient } from "convex/browser";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

import { extractErrorMessage, settleInBatches } from "@/core/utils";
import { buildSystemPrompt } from "@/features/builder/lib/agent-prompt";
import { createAgentTools } from "@/features/builder/lib/agent-tools";
import { buildReviewMessages, DESIGN_REVIEW_PROMPT } from "@/features/builder/lib/review-prompt";
import { GenerateInputSchema } from "@/features/builder/lib/schemas/generate";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { sseEncode } from "./sse";

const execAsync = promisify(exec);

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate");
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonErrorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // TODO (Phase 6): Add per-IP rate limiting with @convex-dev/rate-limiter before streaming
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErrorResponse("Invalid JSON", 400);
  }

  const parsed = GenerateInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorResponse(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  const query = parsed.data.query ?? parsed.data.prompt!;
  const providedSessionId = parsed.data.sessionId as Id<"sessions"> | undefined;

  const sessionId: Id<"sessions"> =
    providedSessionId ??
    (await convex.mutation(api.sessions.create, {
      title: query.slice(0, 60),
      query,
    }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (eventType: string, data: object) => {
        controller.enqueue(encoder.encode(sseEncode(eventType, data)));
      };

      let buildDir: string | undefined;

      try {
        send("session", { sessionId });

        if (!providedSessionId) {
          await convex.mutation(api.messages.create, {
            sessionId,
            role: "user",
            content: query,
            timestamp: Date.now(),
          });
        }

        await convex.mutation(api.sessions.startGeneration, { sessionId });
        send("status", { status: "generating" });
        send("activity", { type: "thinking", message: "Understanding your request..." });

        const systemPrompt = buildSystemPrompt();

        const collectedFiles = new Map<string, string>();
        let assistantText = "";

        // Copy WAB scaffold to temp dir for this build
        buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
        cpSync(join(process.cwd(), "artifacts/wab-scaffold"), buildDir, { recursive: true });

        const tools = createAgentTools({ send, sessionId, collectedFiles, convex, buildDir });

        // Generation pass — tool runner handles the multi-turn loop automatically
        const runner = anthropic.beta.messages.toolRunner({
          model: "claude-sonnet-4-6",
          max_tokens: 32768,
          system: systemPrompt,
          tools,
          messages: [{ role: "user", content: query }],
          stream: true,
          max_iterations: 10,
        });

        for await (const messageStream of runner) {
          for await (const event of messageStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              assistantText += event.delta.text;
              send("token", { token: event.delta.text });
            }
          }
        }

        // Design review pass — re-check generated files for visual polish
        if (collectedFiles.size > 0) {
          send("activity", { type: "thinking", message: "Polishing design..." });
          const reviewTools = [tools[1]]; // write_file only
          const reviewRunner = anthropic.beta.messages.toolRunner({
            model: "claude-sonnet-4-6",
            max_tokens: 8192,
            system: DESIGN_REVIEW_PROMPT,
            tools: reviewTools,
            messages: buildReviewMessages(collectedFiles),
            stream: true,
            max_iterations: 3,
          });
          for await (const messageStream of reviewRunner) {
            for await (const event of messageStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                send("token", { token: event.delta.text });
              }
            }
          }
        }

        // Bundle with Parcel
        if (collectedFiles.size > 0) {
          send("status", { status: "bundling" });
          send("activity", { type: "thinking", message: "Bundling your app..." });

          try {
            // Parcel build + custom inliner (html-inline breaks on external URLs)
            await execAsync(
              "pnpm exec parcel build index.html --no-source-maps --dist-dir dist && node scripts/inline-bundle.cjs dist/index.html bundle.html",
              { cwd: buildDir, timeout: 30000 },
            );
            const bundlePath = join(buildDir, "bundle.html");
            if (!existsSync(bundlePath)) throw new Error("Parcel produced no bundle.html");
            const bundleHtml = readFileSync(bundlePath, "utf-8");
            if (bundleHtml.length < 100) throw new Error("bundle.html is suspiciously small");
            send("bundle", { html: bundleHtml });
            // Persist bundle for session resume — fire-and-forget to avoid blocking SSE
            convex.mutation(api.generated_files.upsertAutoVersion, {
              sessionId,
              path: "_bundle.html",
              contents: bundleHtml,
            }).catch((err) => console.error("[generate] Failed to persist bundle:", err));
          } catch (buildError) {
            console.error("[generate] Parcel build failed:", buildError);
            send("activity", { type: "thinking", message: "Build failed — showing raw files instead" });
            // Don't throw — still persist files and send done event
          }
        }

        // Convert Map to array for persistence and done event
        const fileArray = [...collectedFiles.entries()].map(([path, contents]) => ({
          path,
          contents,
        }));

        // Persist files in batches of 10 — prevents rate limit overload
        const mutationThunks = fileArray.map(
          ({ path, contents }) =>
            () =>
              convex.mutation(api.generated_files.upsertAutoVersion, {
                sessionId,
                path,
                contents,
              }),
        );
        const settled =
          mutationThunks.length <= 20
            ? await Promise.allSettled(mutationThunks.map((fn) => fn()))
            : await settleInBatches(mutationThunks, 10);
        const failures = settled.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          console.error(`[generate] ${failures.length} file persistence failure(s)`);
        }

        const postLlmPromises: Promise<unknown>[] = [];

        if (assistantText.trim()) {
          postLlmPromises.push(
            convex.mutation(api.messages.create, {
              sessionId,
              role: "assistant",
              content: assistantText.trim(),
              timestamp: Date.now(),
            }),
          );
        }

        if (fileArray.length > 0) {
          const fileList = fileArray.map((f) => f.path).join(", ");
          postLlmPromises.push(
            convex.mutation(api.messages.create, {
              sessionId,
              role: "system",
              content: `Built ${fileArray.length} file${fileArray.length > 1 ? "s" : ""}: ${fileList}`,
              timestamp: Date.now(),
            }),
          );
        }

        postLlmPromises.push(convex.mutation(api.sessions.setLive, { sessionId }));
        await Promise.all(postLlmPromises);

        send("activity", { type: "complete", message: "App is ready!" });
        send("status", { status: "live" });
        send("done", { sessionId, files: fileArray });
      } catch (error) {
        console.error("[generate] Error:", error instanceof Error ? error.stack : error);

        try {
          await convex.mutation(api.sessions.setFailed, {
            sessionId,
            error: extractErrorMessage(error),
          });
        } catch (persistError) {
          console.error("[generate] Failed to persist error state:", persistError);
        }

        send("error", { message: "Generation failed — please try again" });
      } finally {
        if (buildDir) {
          try { rmSync(buildDir, { recursive: true, force: true }); } catch {}
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
