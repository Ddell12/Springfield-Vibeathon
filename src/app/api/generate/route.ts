import Anthropic from "@anthropic-ai/sdk";
import { ConvexHttpClient } from "convex/browser";

import { buildSystemPrompt } from "@/features/builder/lib/agent-prompt";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { sseEncode } from "./sse";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud"
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const query = body.query ?? body.prompt;
  const providedSessionId = body.sessionId as Id<"sessions"> | undefined;

  if (!query) {
    return new Response(JSON.stringify({ error: "prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create session if not provided
  const sessionId: Id<"sessions"> = providedSessionId ??
    await convex.mutation(api.sessions.create, {
      title: query.slice(0, 60),
      query,
    });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (eventType: string, data: object) => {
        controller.enqueue(encoder.encode(sseEncode(eventType, data)));
      };

      try {
        // Mark session as generating
        await convex.mutation(api.sessions.startGeneration, {
          sessionId: sessionId as Id<"sessions">,
        });
        send("status", { status: "generating" });

        // Create sandbox in parallel while LLM generates
        const sandboxPromise = fetch(
          new URL("/api/sandbox", request.url).toString(),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create" }),
          }
        ).then((r) => r.json());

        const systemPrompt = buildSystemPrompt();
        let version = 1;
        const collectedFiles: { path: string; contents: string }[] = [];

        // Stream from Claude with tool_use for write_file
        const llmStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          system: systemPrompt,
          tools: [
            {
              name: "write_file",
              description: "Write a file to the therapy app. Always write src/App.tsx.",
              input_schema: {
                type: "object" as const,
                properties: {
                  path: {
                    type: "string",
                    description: "File path relative to project root (e.g. src/App.tsx)",
                  },
                  contents: {
                    type: "string",
                    description: "Complete file contents",
                  },
                },
                required: ["path", "contents"],
              },
            },
          ],
          messages: [{ role: "user", content: query }],
        });

        // Emit tokens as they arrive
        llmStream.on("text", (text) => {
          send("token", { token: text });
        });

        // Wait for stream to finish
        const finalMessage = await llmStream.finalMessage();

        // Extract tool_use blocks
        for (const block of finalMessage.content) {
          if (block.type === "tool_use" && block.name === "write_file") {
            const input = block.input as { path: string; contents: string };
            collectedFiles.push(input);
            send("file_complete", { path: input.path, contents: input.contents, version });

            // Persist to Convex
            await convex.mutation(api.generated_files.upsert, {
              sessionId: sessionId as Id<"sessions">,
              path: input.path,
              contents: input.contents,
              version,
            });
            version++;
          }
        }

        // Wait for sandbox, then write files
        const sandboxResult = await sandboxPromise;
        const { sandboxId, previewUrl } = sandboxResult;

        if (sandboxId && collectedFiles.length > 0) {
          await fetch(new URL("/api/sandbox", request.url).toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "write_files",
              sandboxId,
              files: collectedFiles,
            }),
          });

          // Update session to live
          await convex.mutation(api.sessions.setLive, {
            sessionId: sessionId as Id<"sessions">,
            sandboxId,
            previewUrl,
          });

          send("status", { status: "live", previewUrl });
        }

        send("done", { sessionId, previewUrl: previewUrl ?? null, files: collectedFiles });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[generate] Error:", message);

        await convex.mutation(api.sessions.setFailed, {
          sessionId: sessionId as Id<"sessions">,
          error: message,
        });

        send("error", { message });
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
