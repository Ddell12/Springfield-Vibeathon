import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

// TTS cache helpers — must be in a non-"use node" file
// (actions that call ElevenLabs/Google live in convex/aiActions.ts)

export const getTtsCache = internalQuery({
  args: {
    text: v.string(),
    voiceId: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const entry = await ctx.db
      .query("ttsCache")
      .withIndex("by_textVoice", (q) =>
        q.eq("text", args.text).eq("voiceId", args.voiceId),
      )
      .first();

    return entry?.audioUrl ?? null;
  },
});

export const saveTtsCache = internalMutation({
  args: {
    text: v.string(),
    voiceId: v.string(),
    audioUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("ttsCache", {
      text: args.text,
      voiceId: args.voiceId,
      audioUrl: args.audioUrl,
      createdAt: Date.now(),
    });
  },
});
