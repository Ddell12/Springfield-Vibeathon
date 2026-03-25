import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    userId: v.optional(v.string()),
    title: v.string(),
    query: v.string(),
    // New states: idle | generating | live | failed
    // Legacy states from old pipeline also exist in data — using v.string() for compat
    state: v.string(),
    stateMessage: v.optional(v.string()),
    error: v.optional(v.string()),
    // Blueprint produced by the LLM from the user's initial description.
    // Stored as v.any() because TherapyBlueprintSchema (src/features/builder/lib/schemas)
    // is a Zod schema — we validate in application code, not at the DB layer.
    blueprint: v.optional(v.any()),
    sandboxId: v.optional(v.string()), // deprecated: kept for backward compat with setSandbox mutation + tests
    previewUrl: v.optional(v.string()), // deprecated: kept for backward compat
    publishedUrl: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    timestamp: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_session_timestamp", ["sessionId", "timestamp"]),

  files: defineTable({
    sessionId: v.id("sessions"),
    path: v.string(),
    contents: v.string(),
    version: v.optional(v.number()),
  }).index("by_session", ["sessionId"])
    .index("by_session_path", ["sessionId", "path"]),

  apps: defineTable({
    title: v.string(),
    description: v.string(),
    sessionId: v.optional(v.id("sessions")),
    shareSlug: v.string(),
    previewUrl: v.optional(v.string()),
    publishedUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_share_slug", ["shareSlug"])
    .index("by_session", ["sessionId"])
    .index("by_created", ["createdAt"]),

  appState: defineTable({
    appId: v.string(),
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_app_key", ["appId", "key"]),

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
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["category"],
  }),

  ttsCache: defineTable({
    text: v.string(),
    voiceId: v.string(),
    audioUrl: v.string(),
    createdAt: v.number(),
  }).index("by_text_voice", ["text", "voiceId"]),

  therapyTemplates: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
    starterPrompt: v.string(),
    sortOrder: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_sortOrder", ["sortOrder"]),
});
