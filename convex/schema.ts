import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ========== NEW: Pipeline tables ==========
  sessions: defineTable({
    userId: v.optional(v.string()),
    title: v.string(),
    query: v.string(),
    state: v.union(
      v.literal("idle"), v.literal("blueprinting"),
      v.literal("template_selecting"), v.literal("phase_generating"),
      v.literal("phase_implementing"), v.literal("deploying"),
      v.literal("validating"), v.literal("finalizing"),
      v.literal("reviewing"), v.literal("complete"),
      v.literal("failed")
    ),
    stateMessage: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    lastGoodState: v.optional(v.string()),
    blueprintId: v.optional(v.id("blueprints")),
    templateName: v.optional(v.string()),
    currentPhaseIndex: v.number(),
    totalPhasesPlanned: v.optional(v.number()),
    phasesRemaining: v.number(),
    sandboxId: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    publishedUrl: v.optional(v.string()),
    mvpGenerated: v.boolean(),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    timestamp: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_session_timestamp", ["sessionId", "timestamp"]),

  agentContext: defineTable({
    sessionId: v.id("sessions"),
    messages: v.any(),
    tokenCount: v.number(),
  }).index("by_session", ["sessionId"]),

  blueprints: defineTable({
    sessionId: v.id("sessions"),
    blueprint: v.any(),
    markdownPreview: v.string(),
    approved: v.boolean(),
    version: v.number(),
  }).index("by_session", ["sessionId"]),

  phases: defineTable({
    sessionId: v.id("sessions"),
    index: v.number(),
    name: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("pending"), v.literal("generating"),
      v.literal("implementing"), v.literal("deploying"),
      v.literal("validating"), v.literal("completed"), v.literal("failed")
    ),
    concept: v.optional(v.any()),
    files: v.array(v.object({
      path: v.string(),
      purpose: v.string(),
      status: v.union(
        v.literal("pending"), v.literal("generating"),
        v.literal("completed"), v.literal("failed")
      ),
    })),
    installCommands: v.array(v.string()),
    errors: v.optional(v.array(v.string())),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_session", ["sessionId"])
    .index("by_session_index", ["sessionId", "index"]),

  files: defineTable({
    sessionId: v.id("sessions"),
    phaseId: v.id("phases"),
    path: v.string(),
    contents: v.string(),
    purpose: v.string(),
    status: v.union(
      v.literal("generated"),
      v.literal("modified"),
      v.literal("deleted")
    ),
  }).index("by_session", ["sessionId"])
    .index("by_session_path", ["sessionId", "path"])
    .index("by_phase", ["phaseId"]),

  versions: defineTable({
    sessionId: v.id("sessions"),
    version: v.number(),
    trigger: v.union(
      v.literal("phase_complete"),
      v.literal("user_edit"),
      v.literal("auto_fix"),
      v.literal("follow_up")
    ),
    triggerMessage: v.optional(v.string()),
    fileRefs: v.array(v.id("files")),
    diff: v.array(v.object({
      path: v.string(),
      action: v.union(v.literal("added"), v.literal("modified"), v.literal("deleted")),
    })),
    phaseIndex: v.optional(v.number()),
    fileCount: v.number(),
    timestamp: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_session_version", ["sessionId", "version"]),

  // ========== RENAMED: tools → apps ==========
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

  // ========== RENAMED: toolState → appState ==========
  appState: defineTable({
    appId: v.string(),
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_app_key", ["appId", "key"]),

  // ========== KEPT UNCHANGED ==========
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
    exampleFragment: v.optional(v.any()),
    sortOrder: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_sortOrder", ["sortOrder"]),
});
