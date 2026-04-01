import Anthropic from "@anthropic-ai/sdk";
import type { ConvexHttpClient } from "convex/browser";

import { buildFlashcardSystemPrompt } from "@/features/flashcards/lib/flashcard-prompt";
import { createFlashcardTools } from "@/features/flashcards/lib/flashcard-tools";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

/** Canned messages from the old pipeline that should not be sent to Claude. */
const CANNED_MESSAGES = [
  "Your app is ready!",
  "Your flashcards are ready!",
  "preview needs a small fix",
];

/** Max total characters for conversation context sent to Claude. */
const MAX_CONTEXT_CHARS = 120_000;

export interface FlashcardStreamOpts {
  anthropic: Anthropic;
  convex: ConvexHttpClient;
  sessionId: Id<"sessions">;
  query: string;
  send: (event: string, data: object) => void;
  isAborted: () => boolean;
}

export interface FlashcardStreamResult {
  streamingText: string;
}

export async function streamFlashcardGeneration(
  opts: FlashcardStreamOpts,
): Promise<FlashcardStreamResult> {
  const { anthropic, convex, sessionId, query, send, isAborted } = opts;

  let streamingText = "";

  const history = await convex.query(api.messages.list, { sessionId });

  const systemPrompt = buildFlashcardSystemPrompt();
  const tools = createFlashcardTools({ send, sessionId, convex });

  const messages = buildFlashcardMessages({ history, query });

  const runner = anthropic.beta.messages.toolRunner({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
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

  return { streamingText };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface BuildFlashcardMessagesOpts {
  history: Array<{ role: string; content: string }>;
  query: string;
}

function buildFlashcardMessages(
  opts: BuildFlashcardMessagesOpts,
): Array<{ role: "user" | "assistant"; content: string }> {
  const { history, query } = opts;

  const conversationMsgs = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .filter((m) => !CANNED_MESSAGES.some((c) => m.content.includes(c)))
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const isFollowUp = conversationMsgs.length > 0;

  if (!isFollowUp) {
    return [{ role: "user", content: query }];
  }

  let messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...conversationMsgs.slice(1),
  ];

  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== query) {
    messages.push({ role: "user", content: query });
  }

  messages = enforceContextLimit(messages);

  return messages;
}

function enforceContextLimit(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Array<{ role: "user" | "assistant"; content: string }> {
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (totalChars <= MAX_CONTEXT_CHARS) return messages;

  const tail = messages.slice(-20);
  const trimmedTotal = tail.reduce((sum, m) => sum + m.content.length, 0);

  if (trimmedTotal > MAX_CONTEXT_CHARS && tail[0]) {
    const budget = MAX_CONTEXT_CHARS - (trimmedTotal - tail[0].content.length);
    tail[0] = {
      ...tail[0],
      content: tail[0].content.slice(0, Math.max(0, budget)) +
        "\n\n[... truncated for context limit ...]",
    };
  }

  return tail;
}
