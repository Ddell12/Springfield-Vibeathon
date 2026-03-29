import Anthropic from "@anthropic-ai/sdk";
import { cp } from "fs/promises";
import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { ConvexHttpClient } from "convex/browser";
import { buildSystemPrompt } from "@/features/builder/lib/agent-prompt";
import { createAgentTools } from "@/features/builder/lib/agent-tools";
import { buildFlashcardSystemPrompt } from "@/features/flashcards/lib/flashcard-prompt";
import { createFlashcardTools } from "@/features/flashcards/lib/flashcard-tools";
import type { Id } from "../../../../../convex/_generated/dataModel";

export interface StreamOpts {
  anthropic: Anthropic;
  convex: ConvexHttpClient;
  sessionId: Id<"sessions">;
  query: string;
  blueprintData?: object;
  isFlashcardMode: boolean;
  send: (event: string, data: object) => void;
  isAborted: () => boolean;
}

export interface StreamResult {
  collectedFiles: Map<string, string>;
  buildDir: string | undefined;
}

export async function streamGeneration(opts: StreamOpts): Promise<StreamResult> {
  const {
    anthropic, convex, sessionId, query, blueprintData,
    isFlashcardMode, send, isAborted,
  } = opts;

  const collectedFiles = new Map<string, string>();
  let buildDir: string | undefined;

  if (!isFlashcardMode) {
    buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
    await cp(join(process.cwd(), "artifacts/wab-scaffold"), buildDir, {
      recursive: true,
    });
  }

  const systemPrompt = isFlashcardMode
    ? buildFlashcardSystemPrompt()
    : buildSystemPrompt();

  const tools = isFlashcardMode
    ? createFlashcardTools({ send, sessionId, convex })
    : createAgentTools({
        send,
        sessionId,
        collectedFiles,
        convex,
        buildDir: buildDir!,
      });

  const userContent = blueprintData
    ? `## Pre-Approved Blueprint\n\n${JSON.stringify(blueprintData, null, 2)}\n\n## User Request\n\n${query}`
    : query;

  const runner = anthropic.beta.messages.toolRunner({
    model: "claude-sonnet-4-6",
    max_tokens: isFlashcardMode ? 4096 : 32768,
    system: systemPrompt,
    tools,
    messages: [{ role: "user", content: userContent }],
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

  return { collectedFiles, buildDir };
}
