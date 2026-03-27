import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { cp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import { extractErrorMessage, settleInBatches } from "@/core/utils";
import { buildSystemPrompt } from "@/features/builder/lib/agent-prompt";
import { createAgentTools } from "@/features/builder/lib/agent-tools";
// Design review pass removed — main prompt has extensive design rules already
import { GenerateInputSchema } from "@/features/builder/lib/schemas/generate";
import { buildFlashcardSystemPrompt } from "@/features/flashcards/lib/flashcard-prompt";
import { createFlashcardTools } from "@/features/flashcards/lib/flashcard-tools";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { acquireBuildSlot } from "./build-limiter";
import { runBundleWorker } from "./run-bundle-worker";
import { sseEncode } from "./sse";

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
  // Try Clerk auth if available, but don't block generation
  try {
    const { userId: clerkUserId, getToken } = await auth();
    if (clerkUserId) {
      const token = await getToken({ template: "convex" });
      if (token) convex.setAuth(token);
    }
  } catch {
    // Auth not configured yet — allow unauthenticated generation for demo
  }

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

  const ip = request.headers.get("x-real-ip")
      ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? "anonymous";
  try {
    await convex.mutation(api.rate_limit_check.checkGenerateLimit, { key: ip });
  } catch (e) {
    return jsonErrorResponse(e instanceof Error ? e.message : "Rate limited", 429);
  }

  const query = parsed.data.query ?? parsed.data.prompt!;
  const mode = parsed.data.mode;
  const providedSessionId = parsed.data.sessionId as Id<"sessions"> | undefined;

  const isFlashcardMode = mode === "flashcards";
  const sessionId: Id<"sessions"> =
    providedSessionId ??
    (await convex.mutation(api.sessions.create, {
      title: query.slice(0, 60),
      query,
      type: isFlashcardMode ? "flashcards" as const : "builder" as const,
    }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Check if client has disconnected (navigation away, tab close, etc.)
      const isAborted = () => request.signal.aborted;

      const send = (eventType: string, data: object) => {
        if (isAborted()) return;
        try {
          controller.enqueue(encoder.encode(sseEncode(eventType, data)));
        } catch {
          // Client disconnected — normal for tab close, navigation away, etc.
        }
      };

      let buildDir: string | undefined;
      let buildSucceeded = false;

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

        const systemPrompt = isFlashcardMode
          ? buildFlashcardSystemPrompt()
          : buildSystemPrompt();

        const collectedFiles = new Map<string, string>();

        if (!isFlashcardMode) {
          // Copy WAB scaffold to temp dir for this build
          buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
          await cp(join(process.cwd(), "artifacts/wab-scaffold"), buildDir, { recursive: true });
        }

        const tools = isFlashcardMode
          ? createFlashcardTools({ send, sessionId, convex })
          : createAgentTools({ send, sessionId, collectedFiles, convex, buildDir: buildDir! });

        // Generation pass — tool runner handles the multi-turn loop automatically
        const runner = anthropic.beta.messages.toolRunner({
          model: "claude-sonnet-4-6",
          max_tokens: isFlashcardMode ? 4096 : 32768,
          system: systemPrompt,
          tools,
          messages: [{ role: "user", content: query }],
          stream: true,
          max_iterations: 10,
        });

        for await (const messageStream of runner) {
          if (isAborted()) break;
          for await (const event of messageStream) {
            if (isAborted()) break;
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              send("token", { token: event.delta.text });
            }
          }
        }

        if (!isFlashcardMode) {
          // Bundle with esbuild in a child process (memory isolated from Next.js heap)
          if (buildDir && collectedFiles.size > 0) {
            send("status", { status: "bundling" });
            send("activity", { type: "thinking", message: "Bundling your app..." });

            const release = await acquireBuildSlot();
            try {
              const bundleHtml = await runBundleWorker(buildDir!);
              if (bundleHtml.length < 200) throw new Error("bundle HTML is suspiciously small");

              send("activity", { type: "thinking", message: "Almost ready..." });
              send("bundle", { html: bundleHtml });
              buildSucceeded = true;

              // Persist bundle for session resume
              try {
                await convex.mutation(api.generated_files.upsertAutoVersion, {
                  sessionId,
                  path: "_bundle.html",
                  contents: bundleHtml,
                });
              } catch (err) {
                console.error("[generate] Failed to persist bundle:", err);
                send("activity", { type: "thinking", message: "Warning: app may not load on resume" });
              }
            } catch (buildError) {
              const errMsg = buildError instanceof Error ? buildError.message : String(buildError);
              console.error("[generate] Bundle worker failed:", errMsg.slice(0, 1000));
              send("activity", { type: "complete", message: `Build failed: ${errMsg.slice(0, 200)}` });
              // buildSucceeded stays false — done event will carry buildFailed: true
            } finally {
              release();
            }
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

        // Persist a friendly summary instead of raw Claude reasoning text
        if (fileArray.length > 0) {
          const friendlyMsg = `I built your app with ${fileArray.length} file${fileArray.length > 1 ? "s" : ""}. ${buildSucceeded ? "It's ready to use!" : "Check the preview for details."}`;
          postLlmPromises.push(
            convex.mutation(api.messages.create, {
              sessionId,
              role: "assistant",
              content: friendlyMsg,
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

        // Persist messages — failures don't prevent going live
        await Promise.allSettled(postLlmPromises);
        // Always transition to live
        await convex.mutation(api.sessions.setLive, { sessionId });

        send("activity", {
          type: "complete",
          message: buildSucceeded ? "App is live and ready!" : "Code generated — preview build had issues",
        });
        send("status", { status: "live" });
        send("done", { sessionId, files: fileArray, buildFailed: !buildSucceeded && collectedFiles.size > 0 });
      } catch (error) {
        // Always log the error for debugging — even client disconnects can mask real issues
        const errSummary = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        const isClientDisconnect =
          isAborted() ||
          (error instanceof Error &&
            (error.message.includes("aborted") ||
              (error as NodeJS.ErrnoException).code === "ECONNRESET" ||
              error.name === "AbortError"));

        if (isClientDisconnect) {
          console.log(`[generate] Client disconnected: ${errSummary.slice(0, 200)}`);
        } else {
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
        }
      } finally {
        if (buildDir) {
          try { rmSync(buildDir, { recursive: true, force: true }); } catch (err) {
            console.error("[generate] Failed to cleanup buildDir:", err);
          }
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
