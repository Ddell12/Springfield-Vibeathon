"use node";
// convex/chat/actions.ts
// Node.js runtime — required for @ai-sdk/anthropic used inside bridgesAgent.streamText

import { v } from "convex/values";

import { internalAction } from "../_generated/server";
import { bridgesAgent } from "../agents/bridges";

// streamAsync — internal action that runs the agent's streamText and persists stream deltas
export const streamAsync = internalAction({
  args: { promptMessageId: v.string(), threadId: v.string() },
  handler: async (ctx, { promptMessageId, threadId }) => {
    const result = await bridgesAgent.streamText(
      ctx,
      { threadId },
      { promptMessageId },
      { saveStreamDeltas: true }
    );
    await result.consumeStream();
  },
});
