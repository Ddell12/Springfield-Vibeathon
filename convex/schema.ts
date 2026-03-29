import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    userId: v.optional(v.string()),
    title: v.string(),
    query: v.string(),
    state: v.union(
      v.literal("idle"),
      v.literal("generating"),
      v.literal("live"),
      v.literal("failed"),
      // Legacy states — existing documents only, not created by new code
      v.literal("blueprinting"),
      v.literal("planning"),
      v.literal("phase_implementing"),
    ),
    stateMessage: v.optional(v.string()),
    error: v.optional(v.string()),
    blueprint: v.optional(v.any()), // Validated via Zod at app layer
    sandboxId: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    publishedUrl: v.optional(v.string()),
    type: v.optional(v.union(v.literal("builder"), v.literal("flashcards"))),
    patientId: v.optional(v.id("patients")),
  }).index("by_user", ["userId"])
    .index("by_state", ["state"])
    .index("by_state_user", ["state", "userId"]),

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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_share_slug", ["shareSlug"])
    .index("by_session", ["sessionId"])
    .index("by_created", ["createdAt"])
    .index("by_user", ["userId"]),

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

  userBilling: defineTable({
    userId: v.string(),
    billingStatus: v.optional(v.string()),
    pastDueSince: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_billingStatus", ["billingStatus"]),

  usage: defineTable({
    userId: v.string(),
    periodStart: v.number(),
    generationCount: v.number(),
    appCount: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_period", ["userId", "periodStart"]),

  flashcards: defineTable({
    deckId: v.id("flashcardDecks"),
    label: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    audioUrl: v.optional(v.string()),
    sortOrder: v.number(),
    category: v.optional(v.string()),
  }).index("by_deck", ["deckId"])
    .index("by_deck_sortOrder", ["deckId", "sortOrder"])
    .index("by_deck_label", ["deckId", "label"]),

  patients: defineTable({
    slpUserId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    diagnosis: v.union(
      v.literal("articulation"),
      v.literal("language"),
      v.literal("fluency"),
      v.literal("voice"),
      v.literal("aac-complex"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("on-hold"),
      v.literal("discharged"),
      v.literal("pending-intake")
    ),
    parentEmail: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    communicationLevel: v.optional(
      v.union(
        v.literal("pre-verbal"),
        v.literal("single-words"),
        v.literal("phrases"),
        v.literal("sentences")
      )
    ),
    sensoryNotes: v.optional(v.string()),
    behavioralNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_slpUserId", ["slpUserId"])
    .index("by_slpUserId_status", ["slpUserId", "status"]),

  caregiverLinks: defineTable({
    patientId: v.id("patients"),
    caregiverUserId: v.optional(v.string()),
    email: v.string(),
    inviteToken: v.string(),
    inviteStatus: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked")
    ),
    relationship: v.optional(v.string()),
  }).index("by_patientId", ["patientId"])
    .index("by_caregiverUserId", ["caregiverUserId"])
    .index("by_caregiverUserId_patientId", ["caregiverUserId", "patientId"])
    .index("by_inviteToken", ["inviteToken"])
    .index("by_email", ["email"]),

  patientMaterials: defineTable({
    patientId: v.id("patients"),
    sessionId: v.optional(v.id("sessions")),
    appId: v.optional(v.id("apps")),
    assignedBy: v.string(),
    assignedAt: v.number(),
    notes: v.optional(v.string()),
    goalId: v.optional(v.id("goals")),
  }).index("by_patientId", ["patientId"])
    .index("by_sessionId", ["sessionId"]),

  activityLog: defineTable({
    patientId: v.id("patients"),
    actorUserId: v.string(),
    action: v.union(
      v.literal("patient-created"),
      v.literal("profile-updated"),
      v.literal("material-assigned"),
      v.literal("invite-sent"),
      v.literal("invite-accepted"),
      v.literal("status-changed"),
      v.literal("session-documented"),
      v.literal("session-signed"),
      v.literal("session-unsigned"),
      v.literal("goal-created"),
      v.literal("goal-met"),
      v.literal("goal-modified"),
      v.literal("report-generated"),
      v.literal("material-generated-for-patient"),
      v.literal("practice-logged"),
      v.literal("message-sent"),
      v.literal("home-program-assigned")
    ),
    details: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_patientId_timestamp", ["patientId", "timestamp"]),

  sessionNotes: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    sessionDate: v.string(),
    sessionDuration: v.number(),
    sessionType: v.union(
      v.literal("in-person"),
      v.literal("teletherapy"),
      v.literal("parent-consultation")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("in-progress"),
      v.literal("complete"),
      v.literal("signed")
    ),
    structuredData: v.object({
      targetsWorkedOn: v.array(v.object({
        target: v.string(),
        goalId: v.optional(v.string()),
        trials: v.optional(v.number()),
        correct: v.optional(v.number()),
        promptLevel: v.optional(v.union(
          v.literal("independent"),
          v.literal("verbal-cue"),
          v.literal("model"),
          v.literal("physical")
        )),
        notes: v.optional(v.string()),
      })),
      behaviorNotes: v.optional(v.string()),
      parentFeedback: v.optional(v.string()),
      homeworkAssigned: v.optional(v.string()),
      nextSessionFocus: v.optional(v.string()),
    }),
    soapNote: v.optional(v.object({
      subjective: v.string(),
      objective: v.string(),
      assessment: v.string(),
      plan: v.string(),
    })),
    aiGenerated: v.boolean(),
    signedAt: v.optional(v.number()),
  })
    .index("by_patientId_sessionDate", ["patientId", "sessionDate"])
    .index("by_slpUserId", ["slpUserId"]),

  goals: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    domain: v.union(
      v.literal("articulation"),
      v.literal("language-receptive"),
      v.literal("language-expressive"),
      v.literal("fluency"),
      v.literal("voice"),
      v.literal("pragmatic-social"),
      v.literal("aac"),
      v.literal("feeding")
    ),
    shortDescription: v.string(),
    fullGoalText: v.string(),
    targetAccuracy: v.number(),
    targetConsecutiveSessions: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("met"),
      v.literal("discontinued"),
      v.literal("modified")
    ),
    startDate: v.string(),
    targetDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_patientId_status", ["patientId", "status"]),

  progressData: defineTable({
    goalId: v.id("goals"),
    patientId: v.id("patients"),
    source: v.union(
      v.literal("session-note"),
      v.literal("in-app-auto"),
      v.literal("manual-entry")
    ),
    sourceId: v.optional(v.string()),
    date: v.string(),
    trials: v.optional(v.number()),
    correct: v.optional(v.number()),
    accuracy: v.number(),
    promptLevel: v.optional(v.union(
      v.literal("independent"),
      v.literal("verbal-cue"),
      v.literal("model"),
      v.literal("physical")
    )),
    notes: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_goalId", ["goalId"])
    .index("by_goalId_date", ["goalId", "date"])
    .index("by_patientId_date", ["patientId", "date"]),

  progressReports: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    reportType: v.union(
      v.literal("weekly-summary"),
      v.literal("monthly-summary"),
      v.literal("iep-progress-report")
    ),
    periodStart: v.string(),
    periodEnd: v.string(),
    goalSummaries: v.array(v.object({
      goalId: v.string(),
      shortDescription: v.string(),
      domain: v.union(
        v.literal("articulation"),
        v.literal("language-receptive"),
        v.literal("language-expressive"),
        v.literal("fluency"),
        v.literal("voice"),
        v.literal("pragmatic-social"),
        v.literal("aac"),
        v.literal("feeding")
      ),
      accuracyTrend: v.union(
        v.literal("improving"),
        v.literal("stable"),
        v.literal("declining")
      ),
      averageAccuracy: v.number(),
      sessionsCount: v.number(),
      status: v.union(
        v.literal("active"),
        v.literal("met"),
        v.literal("discontinued"),
        v.literal("modified")
      ),
      narrative: v.string(),
    })),
    overallNarrative: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("reviewed"),
      v.literal("signed")
    ),
    signedAt: v.optional(v.number()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_patientId_reportType", ["patientId", "reportType"]),

  homePrograms: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    title: v.string(),
    instructions: v.string(),
    materialId: v.optional(v.id("patientMaterials")),
    goalId: v.optional(v.id("goals")),
    frequency: v.union(
      v.literal("daily"),
      v.literal("3x-week"),
      v.literal("weekly"),
      v.literal("as-needed")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
    startDate: v.string(),
    endDate: v.optional(v.string()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_patientId_status", ["patientId", "status"]),

  practiceLog: defineTable({
    homeProgramId: v.id("homePrograms"),
    patientId: v.id("patients"),
    caregiverUserId: v.string(),
    date: v.string(),
    duration: v.optional(v.number()),
    confidence: v.optional(v.number()),
    notes: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_homeProgramId", ["homeProgramId"])
    .index("by_patientId_date", ["patientId", "date"]),

  patientMessages: defineTable({
    patientId: v.id("patients"),
    senderUserId: v.string(),
    senderRole: v.union(v.literal("slp"), v.literal("caregiver")),
    content: v.string(),
    timestamp: v.number(),
    readAt: v.optional(v.number()),
  })
    .index("by_patientId_timestamp", ["patientId", "timestamp"]),
});

/** Active session states used by current code. Legacy states are read-only. */
export type SessionState = "idle" | "generating" | "live" | "failed";
