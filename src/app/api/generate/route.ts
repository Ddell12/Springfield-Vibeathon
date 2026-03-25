import Anthropic from "@anthropic-ai/sdk";
import { ConvexHttpClient } from "convex/browser";

import { buildSystemPrompt } from "@/features/builder/lib/agent-prompt";
import { GenerateInputSchema } from "@/features/builder/lib/schemas/generate";

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = GenerateInputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const query = parsed.data.query ?? parsed.data.prompt!;
  const providedSessionId = parsed.data.sessionId as Id<"sessions"> | undefined;

  // Create session if not provided
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

      try {
        // Emit sessionId immediately so the client can start loading messages
        send("session", { sessionId });

        // Only persist user message for NEW sessions (not retries on existing ones)
        if (!providedSessionId) {
          await convex.mutation(api.messages.create, {
            sessionId,
            role: "user",
            content: query,
            timestamp: Date.now(),
          });
        }

        // Mark session as generating
        await convex.mutation(api.sessions.startGeneration, { sessionId });
        send("status", { status: "generating" });
        send("activity", {
          type: "thinking",
          message: "Understanding your request...",
        });

        const systemPrompt = buildSystemPrompt();
        let version = 1;
        if (providedSessionId) {
          const existingFiles = await convex.query(api.generated_files.list, { sessionId });
          if (existingFiles.length > 0) {
            version = Math.max(...existingFiles.map(f => f.version ?? 0)) + 1;
          }
        }
        const collectedFiles: { path: string; contents: string }[] = [];
        let assistantText = "";

        // Stream from Claude with tool_use for write_file
        const llmStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 16384,
          system: systemPrompt,
          tools: [
            {
              name: "write_file",
              description:
                "Write or overwrite a file in the therapy app project. Use for src/App.tsx, additional components, styles, or utility files.",
              input_schema: {
                type: "object" as const,
                properties: {
                  path: {
                    type: "string",
                    description:
                      "File path relative to project root (e.g. src/App.tsx, src/components/MyWidget.tsx)",
                  },
                  contents: {
                    type: "string",
                    description: "Complete file contents — never truncate or use placeholders",
                  },
                },
                required: ["path", "contents"],
              },
            },
          ],
          messages: [{ role: "user", content: query }],
        });

        // Stream text tokens for real-time display
        llmStream.on("text", (text) => {
          assistantText += text;
          send("token", { token: text });
        });

        // Detect tool use start for progress indication
        llmStream.on("contentBlock", (block) => {
          if (block.type === "tool_use" && block.name === "write_file") {
            // Tool use block started — we'll get the full input when it completes
            send("activity", {
              type: "writing_file",
              message: "Writing code...",
            });
          }
        });

        // Wait for stream to finish
        const finalMessage = await llmStream.finalMessage();

        // Extract tool_use blocks and emit file events
        const mutationPromises: Promise<unknown>[] = [];
        for (const block of finalMessage.content) {
          if (block.type === "tool_use" && block.name === "write_file") {
            const input = block.input as Record<string, unknown>;
            const path = typeof input.path === "string" ? input.path : "";
            const contents =
              typeof input.contents === "string" ? input.contents : "";

            if (!path || !contents) continue;

            collectedFiles.push({ path, contents });
            send("file_complete", { path, contents, version });
            send("activity", {
              type: "file_written",
              message: `Wrote ${path}`,
              path,
            });

            mutationPromises.push(
              convex.mutation(api.generated_files.upsert, {
                sessionId,
                path,
                contents,
                version,
              })
            );
            version++;
          }
        }

        // Persist all files in parallel
        if (mutationPromises.length > 0) {
          await Promise.all(mutationPromises);
        }

        // Persist assistant message, system summary, and setLive in parallel
        const postLlmPromises: Promise<unknown>[] = [];

        if (assistantText.trim()) {
          postLlmPromises.push(
            convex.mutation(api.messages.create, {
              sessionId,
              role: "assistant",
              content: assistantText.trim(),
              timestamp: Date.now(),
            })
          );
        }

        if (collectedFiles.length > 0) {
          const fileList = collectedFiles.map((f) => f.path).join(", ");
          postLlmPromises.push(
            convex.mutation(api.messages.create, {
              sessionId,
              role: "system",
              content: `Built ${collectedFiles.length} file${collectedFiles.length > 1 ? "s" : ""}: ${fileList}`,
              timestamp: Date.now(),
            })
          );
        }

        postLlmPromises.push(convex.mutation(api.sessions.setLive, { sessionId }));
        await Promise.all(postLlmPromises);

        send("activity", { type: "complete", message: "App is ready!" });
        send("status", { status: "live" });
        send("done", { sessionId, files: collectedFiles });
      } catch (error) {
        // Log full detail server-side only
        console.error("[generate] Error:", error instanceof Error ? error.stack : error);

        // Send generic message to client — never expose internals
        const clientMessage = "Generation failed — please try again";

        try {
          await convex.mutation(api.sessions.setFailed, {
            sessionId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        } catch (persistError) {
          console.error("[generate] Failed to persist error state:", persistError);
        }

        send("error", { message: clientMessage });
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
