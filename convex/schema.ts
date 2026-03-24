import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tools: defineTable({
    title: v.string(),
    description: v.string(),
    toolType: v.union(
      v.literal("visual-schedule"),
      v.literal("token-board"),
      v.literal("communication-board"),
      v.literal("choice-board"),
      v.literal("first-then-board")
    ),
    config: v.any(),
    threadId: v.optional(v.string()),
    isTemplate: v.boolean(),
    templateCategory: v.optional(v.string()),
    shareSlug: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_thread", ["threadId"])
    .index("by_share_slug", ["shareSlug"])
    .index("by_template", ["isTemplate", "templateCategory"])
    .index("by_created", ["createdAt"]),

  knowledgeBase: defineTable({
    content: v.string(),
    category: v.union(
      v.literal("aba-terminology"),
      v.literal("speech-therapy"),
      v.literal("tool-patterns"),
      v.literal("developmental-milestones"),
      v.literal("iep-goals")
    ),
    title: v.string(),
    embedding: v.array(v.float64()),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768,
      filterFields: ["category"],
    }),

  ttsCache: defineTable({
    text: v.string(),
    voiceId: v.string(),
    audioUrl: v.string(),
    createdAt: v.number(),
  })
    .index("by_text_voice", ["text", "voiceId"]),
});
