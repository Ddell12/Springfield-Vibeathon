import Anthropic from "@anthropic-ai/sdk";

import { GenerateFlashcardsInputSchema } from "@/features/flashcards/lib/schemas/generate-flashcards";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { authenticate } from "../generate/lib/authenticate";
import {
  completeSession,
  createOrReuseSession,
  failSession,
  persistAssistantMessage,
  persistUserMessage,
  startGeneration,
} from "../generate/lib/session-lifecycle";
import { streamGeneration } from "../generate/lib/stream-generation";
import { sseEncode } from "../generate/sse";

export const runtime = "nodejs";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate-flashcards");
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate-flashcards");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function jsonErrorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const { convex } = await authenticate();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErrorResponse("Invalid JSON", 400);
  }

  const parsed = GenerateFlashcardsInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorResponse(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "anonymous";
  try {
    await convex.mutation(api.rate_limit_check.checkGenerateLimit, { key: ip });
  } catch {
    return jsonErrorResponse("Rate limited — please wait before trying again", 429);
  }

  const query = parsed.data.query ?? parsed.data.prompt!;
  const providedSessionId = parsed.data.sessionId as Id<"sessions"> | undefined;

  const sessionId = await createOrReuseSession({
    convex,
    existingSessionId: providedSessionId,
    title: query.slice(0, 60),
    query,
    type: "flashcards",
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const isAborted = () => request.signal.aborted;
      const send = (event: string, data: object) => {
        if (isAborted()) return;
        try {
          controller.enqueue(encoder.encode(sseEncode(event, data)));
        } catch {}
      };

      try {
        send("session", { sessionId });

        await persistUserMessage(convex, sessionId, query);
        await startGeneration(convex, sessionId);
        send("status", { status: "generating" });
        send("activity", { type: "thinking", message: "Planning your flashcard set..." });

        const result = await streamGeneration({
          anthropic,
          convex,
          sessionId,
          query,
          isFlashcardMode: true,
          send,
          isAborted,
        });

        await persistAssistantMessage(convex, sessionId, result.streamingText);
        await completeSession(convex, sessionId);

        send("activity", {
          type: "complete",
          message: "Flashcards are ready to review.",
        });
        send("status", { status: "live" });
        send("done", {
          sessionId,
          files: [],
          buildFailed: false,
        });
      } catch (error) {
        const isClientDisconnect =
          isAborted() ||
          (error instanceof Error &&
            (error.message.includes("aborted") ||
              (error as NodeJS.ErrnoException).code === "ECONNRESET" ||
              error.name === "AbortError"));

        if (isClientDisconnect) {
          try {
            send("error", { message: "Client disconnected" });
          } catch {}
          await failSession(convex, sessionId, new Error("Client disconnected during flashcard generation"));
        } else {
          console.error("[generate-flashcards] Error:", error instanceof Error ? error.stack : error);
          await failSession(convex, sessionId, error);
          send("error", { message: "Flashcard generation failed — please try again" });
        }
      } finally {
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
