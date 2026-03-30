import Anthropic from "@anthropic-ai/sdk";
import type { ConvexHttpClient } from "convex/browser";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { cp } from "fs/promises";
import { tmpdir } from "os";
import { dirname,join } from "path";

import { buildSystemPrompt } from "@/features/builder/lib/agent-prompt";
import { createAgentTools } from "@/features/builder/lib/agent-tools";
import { buildFlashcardSystemPrompt } from "@/features/flashcards/lib/flashcard-prompt";
import { createFlashcardTools } from "@/features/flashcards/lib/flashcard-tools";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

/** Canned messages from the old pipeline that should not be sent to Claude. */
const CANNED_MESSAGES = [
  "Your app is ready!",
  "Your flashcards are ready!",
  "preview needs a small fix",
];

/** Max total characters for conversation context sent to Claude. */
const MAX_CONTEXT_CHARS = 120_000;

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
  streamingText: string;
}

export async function streamGeneration(opts: StreamOpts): Promise<StreamResult> {
  const {
    anthropic, convex, sessionId, query, blueprintData,
    isFlashcardMode, send, isAborted,
  } = opts;

  const collectedFiles = new Map<string, string>();
  let buildDir: string | undefined;
  let streamingText = "";

  if (!isFlashcardMode) {
    buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
    await cp(join(process.cwd(), "artifacts/wab-scaffold"), buildDir, {
      recursive: true,
    });
  }

  // Fetch conversation history and existing files for iterative editing
  const [history, existingFiles] = await Promise.all([
    convex.query(api.messages.list, { sessionId }),
    isFlashcardMode
      ? Promise.resolve([])
      : convex.query(api.generated_files.list, { sessionId }),
  ]);

  const isFollowUp = existingFiles.some(
    (f: { path: string }) => f.path !== "_bundle.html"
  );

  // Pre-populate build directory with existing session files so Claude's
  // read_file/list_files tools see the current state and esbuild can bundle
  // the complete file set (not just newly written files).
  if (isFollowUp && buildDir) {
    for (const file of existingFiles) {
      if (file.path === "_bundle.html") continue;
      const fullPath = join(buildDir, file.path);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, file.contents, "utf-8");
      collectedFiles.set(file.path, file.contents);
    }
  }

  const systemPrompt = isFlashcardMode
    ? buildFlashcardSystemPrompt()
    : buildSystemPrompt({ isFollowUp });

  const tools = isFlashcardMode
    ? createFlashcardTools({ send, sessionId, convex })
    : createAgentTools({
        send,
        sessionId,
        collectedFiles,
        convex,
        buildDir: buildDir!,
      });

  // Build the messages array — single-turn for new sessions, multi-turn for follow-ups
  const messages = buildMessages({ history, existingFiles, query, blueprintData, isFollowUp });

  const runner = anthropic.beta.messages.toolRunner({
    model: "claude-sonnet-4-6",
    max_tokens: isFlashcardMode ? 4096 : 32768,
    system: systemPrompt,
    tools,
    messages,
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
        streamingText += event.delta.text;
        send("token", { token: event.delta.text });
      }
    }
  }

  return { collectedFiles, buildDir, streamingText };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface BuildMessagesOpts {
  history: Array<{ role: string; content: string }>;
  existingFiles: Array<{ path: string; contents: string }>;
  query: string;
  blueprintData?: object;
  isFollowUp: boolean;
}

function buildMessages(
  opts: BuildMessagesOpts,
): Array<{ role: "user" | "assistant"; content: string }> {
  const { history, existingFiles, query, blueprintData, isFollowUp } = opts;

  if (!isFollowUp) {
    // First-time generation: single user message (original behavior)
    const userContent = blueprintData
      ? `## Pre-Approved Blueprint\n\n${JSON.stringify(blueprintData, null, 2)}\n\n## User Request\n\n${query}`
      : query;
    return [{ role: "user", content: userContent }];
  }

  // Follow-up: build multi-turn conversation with file context
  const fileContext = existingFiles
    .filter((f) => f.path !== "_bundle.html")
    .map((f) => `### ${f.path}\n\`\`\`tsx\n${f.contents}\n\`\`\``)
    .join("\n\n");

  // Filter out canned/system messages from history
  const conversationMsgs = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .filter((m) => !CANNED_MESSAGES.some((c) => m.content.includes(c)))
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Build the full message array:
  // 1. Synthetic file context message (so Claude sees current code)
  // 2. Synthetic ack from assistant
  // 3. Prior conversation turns (skip first user msg — redundant with file context)
  // 4. Current user request
  let messages: Array<{ role: "user" | "assistant"; content: string }> = [
    {
      role: "user",
      content: `Here are the current files in my app:\n\n${fileContext}`,
    },
    {
      role: "assistant",
      content:
        "I can see all your current files. What would you like me to change?",
    },
    // Include prior turns (skip the very first user message which was the original build request)
    ...conversationMsgs.slice(1),
    // Current request (the latest user message was already persisted to Convex
    // by route.ts, but may also be in conversationMsgs — deduplicate by checking
    // if the last message matches the current query)
  ];

  // Avoid duplicating the current query if it's already the last message
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== query) {
    messages.push({ role: "user", content: query });
  }

  // Enforce context size limit — keep file context + last N turns
  messages = enforceContextLimit(messages);

  return messages;
}

function enforceContextLimit(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Array<{ role: "user" | "assistant"; content: string }> {
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (totalChars <= MAX_CONTEXT_CHARS) return messages;

  // Keep first 2 messages (file context + ack) and last 20 messages
  const head = messages.slice(0, 2);
  const tail = messages.slice(-20);

  // If still over limit with just head + tail, truncate file context
  const trimmed = [...head, ...tail];
  const trimmedTotal = trimmed.reduce((sum, m) => sum + m.content.length, 0);
  if (trimmedTotal > MAX_CONTEXT_CHARS && trimmed[0]) {
    const budget = MAX_CONTEXT_CHARS - (trimmedTotal - trimmed[0].content.length);
    trimmed[0] = {
      ...trimmed[0],
      content: trimmed[0].content.slice(0, Math.max(0, budget)) +
        "\n\n[... files truncated for context limit ...]",
    };
  }

  return trimmed;
}
