import type { ConvexHttpClient } from "convex/browser";

import { extractErrorMessage } from "@/core/utils";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export interface CreateSessionOpts {
  convex: ConvexHttpClient;
  existingSessionId?: Id<"sessions">;
  title: string;
  query: string;
  type: "builder" | "flashcards";
}

export async function createOrReuseSession(
  opts: CreateSessionOpts,
): Promise<Id<"sessions">> {
  if (opts.existingSessionId) return opts.existingSessionId;

  return await opts.convex.mutation(api.sessions.create, {
    title: opts.title.slice(0, 60),
    query: opts.query,
    type: opts.type,
  });
}

export async function startGeneration(
  convex: ConvexHttpClient,
  sessionId: Id<"sessions">,
): Promise<void> {
  try {
    await convex.mutation(api.sessions.startGeneration, { sessionId });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Cannot start generation from state")) {
      console.warn("[session] startGeneration: session already generating, continuing");
      return;
    }
    throw err;
  }
}

export async function persistUserMessage(
  convex: ConvexHttpClient,
  sessionId: Id<"sessions">,
  content: string,
): Promise<void> {
  await convex.mutation(api.messages.create, {
    sessionId,
    role: "user",
    content,
    timestamp: Date.now(),
  });
}

export async function persistAssistantMessage(
  convex: ConvexHttpClient,
  sessionId: Id<"sessions">,
  content: string,
): Promise<void> {
  if (!content.trim()) return;
  await convex.mutation(api.messages.create, {
    sessionId,
    role: "assistant",
    content,
    timestamp: Date.now(),
  });
}

export async function completeSession(
  convex: ConvexHttpClient,
  sessionId: Id<"sessions">,
): Promise<void> {
  await convex.mutation(api.sessions.setLive, { sessionId });
}

export async function failSession(
  convex: ConvexHttpClient,
  sessionId: Id<"sessions"> | undefined,
  error: unknown,
): Promise<void> {
  if (!sessionId) return;
  try {
    await convex.mutation(api.sessions.setFailed, {
      sessionId,
      error: extractErrorMessage(error),
    });
  } catch (persistError) {
    console.error("[generate] Failed to persist error state:", persistError);
  }
}
