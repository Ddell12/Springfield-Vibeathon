// convex/pipeline.ts — stub, fleshed out in Task 6
"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const executeStep = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async (_ctx, _args) => {
    // Stub — implemented in Task 6
    return;
  },
});
