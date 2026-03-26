import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    userId: v.optional(v.string()),
    title: v.string(),
    query: v.string(),
    // Active states: idle, generating, live, failed
    // Legacy pipeline states also exist in DB (blueprinting, planning, phase_implementing, etc.)
    state: v.string(),
    stateMessage: v.optional(v.string()),
    error: v.optional(v.string()),
    blueprint: v.optional(v.any()), // Validated via Zod at app layer
    sandboxId: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    publishedUrl: v.optional(v.string()),
    type: v.optional(v.union(v.literal("builder"), v.literal("flashcards"))),
  }).index("by_user", ["userId"])
    .index("by_state", ["state"]),

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
    userId: v.optional(v.string()), // Phase 6: will be required + auth-checked
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
    value: v.any(), // Generic KV store — value shape varies by key, validated in application code
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

  imageCache: defineTable({
    promptHash: v.string(),
    prompt: v.string(),
    label: v.string(),
    category: v.string(),
    storageId: v.id("_storage"),
    imageUrl: v.string(),
    model: v.string(),
    createdAt: v.number(),
  }).index("by_promptHash", ["promptHash"])
    .index("by_label_category", ["label", "category"]),

  therapyTemplates: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
    starterPrompt: v.string(),
    sortOrder: v.number(),
    thumbnailStorageId: v.optional(v.id("_storage")),
    thumbnailUrl: v.optional(v.string()),
  })
    .index("by_category", ["category"])
    .index("by_sortOrder", ["sortOrder"]),

  flashcardDecks: defineTable({
    userId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    sessionId: v.id("sessions"),
    cardCount: v.number(),
    coverImageUrl: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),

  flashcards: defineTable({
    deckId: v.id("flashcardDecks"),
    label: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    audioUrl: v.optional(v.string()),
    sortOrder: v.number(),
    category: v.optional(v.string()),
  }).index("by_deck", ["deckId"])
    .index("by_deck_sortOrder", ["deckId", "sortOrder"]),
});
