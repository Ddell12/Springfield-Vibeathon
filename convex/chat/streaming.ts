// convex/chat/streaming.ts
// Queries and mutations for chat streaming — NO "use node;" (V8 runtime)
// The streamAsync internalAction lives in convex/chat/actions.ts (Node.js runtime)

import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components,internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { bridgesAgent } from "../agents/bridges";

// 1. initiateStreaming — saves the user message and schedules the async stream
export const initiateStreaming = mutation({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    const { messageId } = await bridgesAgent.saveMessage(ctx, {
      threadId,
      prompt,
      skipEmbeddings: true,
    });
    await ctx.scheduler.runAfter(0, internal.chat.actions.streamAsync, {
      threadId,
      promptMessageId: messageId,
    });
    return messageId;
  },
});

// 2. listThreadMessages — paginated query for messages with streaming support
export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const streams = await syncStreams(ctx, components.agent, args);
    const paginated = await listUIMessages(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});

// 3. createNewThread — creates a new Convex Agent thread and returns its ID
// Named createNewThread to avoid collision with the imported createThread from @convex-dev/agent
export const createNewThread = mutation({
  args: {},
  handler: async (ctx) => {
    const { threadId } = await bridgesAgent.createThread(ctx, {});
    return threadId;
  },
});
