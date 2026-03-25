import Anthropic from "@anthropic-ai/sdk";
import { ConvexHttpClient } from "convex/browser";

import { buildSystemPrompt } from "@/features/builder/lib/agent-prompt";
import { GenerateInputSchema } from "@/features/builder/lib/schemas/generate";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
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
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS: Anthropic.Tool[] = [
  {
    name: "write_file",
    description:
      "Write or overwrite a file in the therapy app project. Use for src/App.tsx, additional components, styles, or utility files.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "File path relative to project root (e.g. src/App.tsx)",
        },
        contents: {
          type: "string",
          description: "Complete file contents — never truncate or use placeholders",
        },
      },
      required: ["path", "contents"],
    },
  },
  {
    name: "generate_image",
    description:
      "Generate a therapy-friendly illustration. Returns a CDN URL. Use for picture cards, schedule icons, emotion faces, and any visual content.",
    input_schema: {
      type: "object" as const,
      properties: {
        label: {
          type: "string",
          description: "What to illustrate (e.g., 'happy face', 'brush teeth')",
        },
        category: {
          type: "string",
          enum: ["emotions", "daily-activities", "animals", "food", "objects", "people", "places"],
          description: "Image category for style",
        },
      },
      required: ["label", "category"],
    },
  },
  {
    name: "generate_speech",
    description:
      "Generate text-to-speech audio. Returns a CDN URL to an MP3. Use for communication board labels, story narration, schedule steps.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: {
          type: "string",
          description: "Text to speak",
        },
        voice: {
          type: "string",
          enum: ["warm-female", "calm-male", "child-friendly"],
          description: "Voice style",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "enable_speech_input",
    description:
      "Enable microphone input for this app. The useSTT() hook will become active.",
    input_schema: {
      type: "object" as const,
      properties: {
        purpose: {
          type: "string",
          description: "What speech input is for",
        },
      },
      required: ["purpose"],
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonErrorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Validate that a file path from the LLM is safe to write.
 * Allowlist: must start with src/ or be a recognised config file,
 * contain only safe characters, and end with a supported extension.
 */
function isValidFilePath(path: string): boolean {
  // Must start with src/ OR be an allowed root-level config file
  const allowedRoots = /^(src\/|tailwind\.config\.(ts|js|cjs)$|vite\.config\.(ts|js)$|postcss\.config\.(ts|js|cjs)$)/;
  if (!allowedRoots.test(path)) return false;

  // Only allow alphanumeric, hyphens, underscores, dots, and forward slashes
  if (!/^[a-zA-Z0-9\-_.\/]+$/.test(path)) return false;

  // No path traversal sequences or malformed double slashes
  if (path.includes("..") || path.includes("//")) return false;

  // Must end with a supported extension
  if (!/\.(tsx|ts|css|json|cjs|js)$/.test(path)) return false;

  return true;
}

/** Run a Convex action and return a tool_result (success or error). */
async function runToolAction(
  toolUseId: string,
  fn: () => Promise<unknown>,
): Promise<Anthropic.ToolResultBlockParam> {
  try {
    const result = await fn();
    return { type: "tool_result", tool_use_id: toolUseId, content: JSON.stringify(result) };
  } catch (err) {
    return {
      type: "tool_result",
      tool_use_id: toolUseId,
      content: `Error: ${(err as Error).message}`,
      is_error: true,
    };
  }
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
        let version = 1;
        if (providedSessionId) {
          const existingFiles = await convex.query(api.generated_files.list, { sessionId });
          if (existingFiles.length > 0) {
            version = Math.max(...existingFiles.map((f) => f.version ?? 0)) + 1;
          }
        }

        const collectedFiles: { path: string; contents: string }[] = [];
        let assistantText = "";
        const mutationPromises: Promise<unknown>[] = [];

        let messages: Anthropic.MessageParam[] = [{ role: "user", content: query }];
        const MAX_TOOL_TURNS = 10;
        let turnCount = 0;
        let continueLoop = true;

        while (continueLoop && turnCount < MAX_TOOL_TURNS) {
          turnCount++;
          const llmStream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 16384,
            system: systemPrompt,
            tools: TOOLS,
            messages,
          });

          llmStream.on("text", (text) => {
            assistantText += text;
            send("token", { token: text });
          });

          const finalMessage = await llmStream.finalMessage();
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const block of finalMessage.content) {
            if (block.type !== "tool_use") continue;

            const input = block.input as Record<string, unknown>;

            switch (block.name) {
              case "write_file": {
                const path = typeof input.path === "string" ? input.path : "";
                const contents = typeof input.contents === "string" ? input.contents : "";
                if (!isValidFilePath(path)) {
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: "Error: Invalid file path — must be within src/ and use a supported extension",
                    is_error: true,
                  });
                  break;
                }
                if (path && contents) {
                  collectedFiles.push({ path, contents });
                  send("file_complete", { path, contents, version });
                  send("activity", { type: "file_written", message: `Wrote ${path}`, path });
                  mutationPromises.push(
                    convex.mutation(api.generated_files.upsert, {
                      sessionId,
                      path,
                      contents,
                      version,
                    }),
                  );
                  version++;
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: "File written successfully",
                  });
                } else {
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: "Error: write_file requires non-empty path and contents",
                    is_error: true,
                  });
                }
                break;
              }

              case "generate_image": {
                send("activity", { type: "thinking", message: `Generating image: ${input.label}...` });
                const result = await runToolAction(block.id, () =>
                  convex.action(api.image_generation.generateTherapyImage, {
                    label: input.label as string,
                    category: input.category as string,
                  }),
                );
                if (!result.is_error) {
                  send("image_generated", { label: input.label, imageUrl: JSON.parse(result.content as string).imageUrl });
                }
                toolResults.push(result);
                break;
              }

              case "generate_speech": {
                send("activity", { type: "thinking", message: `Generating audio: "${input.text}"...` });
                const result = await runToolAction(block.id, () =>
                  convex.action(api.aiActions.generateSpeech, {
                    text: input.text as string,
                    voice: (input.voice as string) ?? "warm-female",
                  }),
                );
                if (!result.is_error) {
                  send("speech_generated", { text: input.text, audioUrl: JSON.parse(result.content as string).audioUrl });
                }
                toolResults.push(result);
                break;
              }

              case "enable_speech_input": {
                send("stt_enabled", { purpose: input.purpose });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify({ enabled: true }),
                });
                break;
              }
            }
          }

          if (finalMessage.stop_reason === "tool_use" && toolResults.length > 0) {
            messages = [
              ...messages,
              { role: "assistant", content: finalMessage.content },
              { role: "user", content: toolResults },
            ];
          } else {
            continueLoop = false;
          }
        }

        if (turnCount >= MAX_TOOL_TURNS) {
          send("activity", { type: "complete", message: "Generation complete (reached max steps)" });
        }

        // Persist files — use allSettled so one failure doesn't kill the whole generation
        const settled = await Promise.allSettled(mutationPromises);
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

        if (collectedFiles.length > 0) {
          const fileList = collectedFiles.map((f) => f.path).join(", ");
          postLlmPromises.push(
            convex.mutation(api.messages.create, {
              sessionId,
              role: "system",
              content: `Built ${collectedFiles.length} file${collectedFiles.length > 1 ? "s" : ""}: ${fileList}`,
              timestamp: Date.now(),
            }),
          );
        }

        postLlmPromises.push(convex.mutation(api.sessions.setLive, { sessionId }));
        await Promise.all(postLlmPromises);

        send("activity", { type: "complete", message: "App is ready!" });
        send("status", { status: "live" });
        send("done", { sessionId, files: collectedFiles });
      } catch (error) {
        console.error("[generate] Error:", error instanceof Error ? error.stack : error);

        try {
          await convex.mutation(api.sessions.setFailed, {
            sessionId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        } catch (persistError) {
          console.error("[generate] Failed to persist error state:", persistError);
        }

        send("error", { message: "Generation failed — please try again" });
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
