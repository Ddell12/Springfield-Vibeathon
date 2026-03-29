// Force esbuild into this function's file trace — the bundle-worker.mjs child
// process requires it at runtime but Next.js can't trace child process imports.
import "esbuild";

import { rmSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { GenerateInputSchema } from "@/features/builder/lib/schemas/generate";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { sseEncode } from "./sse";
import { authenticate } from "./lib/authenticate";
import {
  createOrReuseSession,
  startGeneration,
  persistUserMessage,
  completeSession,
  failSession,
} from "./lib/session-lifecycle";
import { streamGeneration } from "./lib/stream-generation";
import { bundleFiles, persistFiles } from "./lib/bundle-and-persist";

export const runtime = "nodejs";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate");
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function jsonErrorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request): Promise<Response> {
  // 1. Auth
  const { convex } = await authenticate();

  // 2. Validate body
  let body: unknown;
  try { body = await request.json(); } catch {
    return jsonErrorResponse("Invalid JSON", 400);
  }
  const parsed = GenerateInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorResponse(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  // 3. Rate limit
  const ip = request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "anonymous";
  try {
    await convex.mutation(api.rate_limit_check.checkGenerateLimit, { key: ip });
  } catch (e) {
    return jsonErrorResponse(e instanceof Error ? e.message : "Rate limited", 429);
  }

  // 4. Extract input
  const query = parsed.data.query ?? parsed.data.prompt!;
  const blueprintData = parsed.data.blueprint;
  const isFlashcardMode = parsed.data.mode === "flashcards";
  const providedSessionId = parsed.data.sessionId as Id<"sessions"> | undefined;

  // 5. Session
  const sessionId = await createOrReuseSession({
    convex,
    existingSessionId: providedSessionId,
    title: query.slice(0, 60),
    query,
    type: isFlashcardMode ? "flashcards" : "builder",
  });

  // 6. Stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const isAborted = () => request.signal.aborted;
      const send = (event: string, data: object) => {
        if (isAborted()) return;
        try { controller.enqueue(encoder.encode(sseEncode(event, data))); } catch {}
      };

      let buildDir: string | undefined;
      let buildSucceeded = false;

      try {
        send("session", { sessionId });

        if (!providedSessionId) {
          await persistUserMessage(convex, sessionId, query);
        }

        await startGeneration(convex, sessionId);
        send("status", { status: "generating" });
        send("activity", { type: "thinking", message: "Understanding your request..." });

        const result = await streamGeneration({
          anthropic, convex, sessionId, query, blueprintData,
          isFlashcardMode, send, isAborted,
        });
        buildDir = result.buildDir;

        if (!isFlashcardMode && buildDir && result.collectedFiles.size > 0) {
          const bundle = await bundleFiles({
            convex, sessionId, collectedFiles: result.collectedFiles, buildDir, send,
          });
          buildSucceeded = bundle.succeeded;
        }

        const fileArray = await persistFiles({
          convex, sessionId, collectedFiles: result.collectedFiles,
        });

        await completeSession(convex, sessionId, {
          isFlashcardMode,
          buildSucceeded,
          hasFiles: fileArray.length > 0,
        });

        send("activity", {
          type: "complete",
          message: buildSucceeded ? "App is live and ready!" : "Code generated — preview build had issues",
        });
        send("status", { status: "live" });
        send("done", {
          sessionId,
          files: fileArray,
          buildFailed: !buildSucceeded && result.collectedFiles.size > 0,
        });
      } catch (error) {
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
          await failSession(convex, sessionId, error);
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
