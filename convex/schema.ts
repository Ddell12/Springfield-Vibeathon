import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { speechCoachTemplateValidator } from "./lib/speechCoachValidators";
import { testMetadataValidator } from "./lib/testMetadata";

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
    blueprint: v.optional(v.any()), // Structured therapy PRD from SSE pipeline, validated at app layer
    sandboxId: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    publishedUrl: v.optional(v.string()),
    type: v.optional(v.union(v.literal("builder"), v.literal("flashcards"))),
    patientId: v.optional(v.id("patients")),
    archived: v.optional(v.boolean()),
  }).index("by_user", ["userId"])
    .index("by_state", ["state"])
    .index("by_state_user", ["state", "userId"])
    .index("by_user_archived", ["userId", "archived"]),

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
    featured: v.optional(v.boolean()),
    featuredOrder: v.optional(v.number()),
    featuredCategory: v.optional(v.string()),
  })
    .index("by_shareSlug", ["shareSlug"])
    .index("by_session", ["sessionId"])
    .index("by_created", ["createdAt"])
    .index("by_user", ["userId"])
    .index("by_featured_order", ["featured", "featuredOrder"]),

  appState: defineTable({
    appId: v.id("app_instances"), // Scoped to a valid app instance — closes free-string abuse surface
    key: v.string(),
    value: v.any(), // Intentional: sandbox KV, value shape varies by key
    updatedAt: v.number(),
  }).index("by_appKey", ["appId", "key"]),

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
  }).index("by_textVoice", ["text", "voiceId"]),

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
    usageCount: v.optional(v.number()),
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
    icdCodes: v.optional(v.array(v.object({
      code: v.string(),
      description: v.string(),
    }))),
    insuranceCarrier: v.optional(v.string()),
    insuranceMemberId: v.optional(v.string()),
    insuranceGroupNumber: v.optional(v.string()),
    insurancePhone: v.optional(v.string()),
    testMetadata: v.optional(testMetadataValidator),
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
    kidModePIN: v.optional(v.string()),
    intakeCompletedAt: v.optional(v.number()),
  }).index("by_patientId", ["patientId"])
    .index("by_caregiverUserId", ["caregiverUserId"])
    .index("by_caregiverUserId_patientId", ["caregiverUserId", "patientId"])
    .index("by_inviteToken", ["inviteToken"])
    .index("by_email", ["email"]),

  app_instances: defineTable({
    templateType: v.string(),
    title: v.string(),
    titleLower: v.optional(v.string()),
    patientId: v.optional(v.id("patients")),
    slpUserId: v.string(),
    configJson: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    version: v.number(),
    originalDescription: v.optional(v.string()),
    shareToken: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    goalTags: v.optional(v.array(v.string())),
    lastActivityAt: v.optional(v.number()),
  })
    .index("by_slpUserId", ["slpUserId"])
    .index("by_slpUserId_status", ["slpUserId", "status"])
    .index("by_patientId", ["patientId"])
    .index("by_shareToken", ["shareToken"]),

  published_app_versions: defineTable({
    appInstanceId: v.id("app_instances"),
    version: v.number(),
    configJson: v.string(),
    publishedAt: v.number(),
  })
    .index("by_appInstanceId", ["appInstanceId"]),

  tool_events: defineTable({
    appInstanceId: v.id("app_instances"),
    patientId: v.optional(v.id("patients")),
    eventType: v.union(
      v.literal("app_opened"),
      v.literal("item_tapped"),
      v.literal("answer_correct"),
      v.literal("answer_incorrect"),
      v.literal("activity_completed"),
      v.literal("token_added"),
      v.literal("audio_played"),
      v.literal("app_closed")
    ),
    eventPayloadJson: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    eventSource: v.optional(v.union(v.literal("child"), v.literal("slp"))),
  })
    .index("by_appInstanceId", ["appInstanceId"])
    .index("by_patientId", ["patientId"]),

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
      v.literal("home-program-assigned"),
      v.literal("intake-form-signed"),
      v.literal("telehealth-consent-signed"),
      v.literal("evaluation-signed"),
      v.literal("evaluation-unsigned"),
      v.literal("poc-signed"),
      v.literal("poc-amended"),
      v.literal("discharge-signed")
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
    meetingRecordId: v.optional(v.id("meetingRecords")),
    // Group session fields (CPT 92508)
    groupSessionId: v.optional(v.string()),
    groupPatientIds: v.optional(v.array(v.id("patients"))),
    testMetadata: v.optional(testMetadataValidator),
  })
    .index("by_patientId_sessionDate", ["patientId", "sessionDate"])
    .index("by_slpUserId", ["slpUserId"])
    .index("by_groupSessionId", ["groupSessionId"]),

  availability: defineTable({
    slpId: v.string(),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    isRecurring: v.boolean(),
    effectiveDate: v.optional(v.string()),
    timezone: v.string(),
  })
    .index("by_slpId", ["slpId"])
    .index("by_slpId_dayOfWeek", ["slpId", "dayOfWeek"]),

  appointments: defineTable({
    slpId: v.string(),
    patientId: v.id("patients"),
    caregiverId: v.optional(v.string()),
    scheduledAt: v.number(),
    duration: v.number(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no-show"),
    ),
    cancelledBy: v.optional(v.string()),
    livekitRoom: v.optional(v.string()),
    joinLink: v.string(),
    notes: v.optional(v.string()),
    timezone: v.optional(v.string()),
    testMetadata: v.optional(testMetadataValidator),
  })
    .index("by_slpId", ["slpId"])
    .index("by_patientId", ["patientId"])
    .index("by_scheduledAt", ["scheduledAt"])
    .index("by_status", ["status"])
    .index("by_slpId_scheduledAt", ["slpId", "scheduledAt"]),

  meetingRecords: defineTable({
    appointmentId: v.id("appointments"),
    slpId: v.string(),
    patientId: v.id("patients"),
    duration: v.number(),
    audioFileId: v.optional(v.id("_storage")),
    transcript: v.optional(v.string()),
    transcriptFileId: v.optional(v.id("_storage")),
    aiSummary: v.optional(v.string()),
    soapNoteId: v.optional(v.id("sessionNotes")),
    interactionLog: v.optional(v.string()),
    status: v.union(
      v.literal("processing"),
      v.literal("transcribing"),
      v.literal("summarizing"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    testMetadata: v.optional(testMetadataValidator),
  })
    .index("by_appointmentId", ["appointmentId"])
    .index("by_slpId", ["slpId"])
    .index("by_patientId", ["patientId"]),

  notifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("session-booked"),
      v.literal("session-cancelled"),
      v.literal("session-reminder"),
      v.literal("session-starting"),
      v.literal("notes-ready"),
    ),
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    read: v.boolean(),
    appointmentId: v.optional(v.id("appointments")),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_read", ["userId", "read"]),

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
    amendmentLog: v.optional(v.array(v.object({
      previousGoalText: v.string(),
      previousTargetAccuracy: v.number(),
      previousTargetConsecutiveSessions: v.number(),
      previousStatus: v.string(),
      changedAt: v.number(),
      changedBy: v.string(),
      reason: v.optional(v.string()),
    }))),
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
    audience: v.optional(v.union(
      v.literal("clinical"),
      v.literal("parent"),
      v.literal("iep-team")
    )),
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
    type: v.optional(v.union(v.literal("standard"), v.literal("speech-coach"))),
    speechCoachConfig: v.optional(v.object({
      targetSounds: v.array(v.string()),
      ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
      defaultDurationMinutes: v.number(),
      childAge: v.optional(v.number()),
      reducedMotion: v.optional(v.boolean()),
      assignedTemplateId: v.optional(v.id("speechCoachTemplates")),
      lastSyncedTemplateVersion: v.optional(v.number()),
      childOverrides: v.optional(v.object({
        assignedTemplateId: v.optional(v.id("speechCoachTemplates")),
        lastSyncedTemplateVersion: v.optional(v.number()),
        targetSounds: v.array(v.string()),
        ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
        defaultDurationMinutes: v.number(),
        preferredThemes: v.array(v.string()),
        avoidThemes: v.array(v.string()),
        childNotes: v.optional(v.string()),
        promptAddendum: v.optional(v.string()),
      })),
      coachSetup: v.optional(v.object({
        targetPositions: v.array(v.union(
          v.literal("initial"),
          v.literal("medial"),
          v.literal("final"),
          v.literal("blend")
        )),
        sessionGoal: v.union(
          v.literal("drill"),
          v.literal("mixed"),
          v.literal("carryover"),
          v.literal("listening")
        ),
        coachTone: v.union(
          v.literal("playful"),
          v.literal("calm"),
          v.literal("energetic"),
          v.literal("neutral")
        ),
        sessionPace: v.union(
          v.literal("slow"),
          v.literal("steady"),
          v.literal("brisk")
        ),
        promptStyle: v.union(
          v.literal("model-first"),
          v.literal("ask-first"),
          v.literal("choice-based"),
          v.literal("imitation-heavy")
        ),
        correctionStyle: v.union(
          v.literal("recast"),
          v.literal("gentle-direct"),
          v.literal("explicit")
        ),
        maxRetriesPerWord: v.union(v.literal(1), v.literal(2), v.literal(3)),
        frustrationSupport: v.union(
          v.literal("back-off-fast"),
          v.literal("balanced"),
          v.literal("keep-challenge")
        ),
        preferredThemes: v.array(v.string()),
        avoidThemes: v.array(v.string()),
        slpNotes: v.optional(v.string()),
      })),
    })),
    testMetadata: v.optional(testMetadataValidator),
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

  speechCoachSessions: defineTable({
    patientId: v.optional(v.id("patients")),
    homeProgramId: v.optional(v.id("homePrograms")),
    caregiverUserId: v.string(),
    userId: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("standalone"), v.literal("clinical"))),
    agentId: v.string(),
    runtimeProvider: v.optional(v.union(v.literal("livekit"), v.literal("elevenlabs"))),
    conversationId: v.optional(v.string()),
    status: v.union(
      v.literal("configuring"),
      v.literal("active"),
      v.literal("transcript_ready"),
      v.literal("analyzing"),
      v.literal("analyzed"),
      v.literal("review_failed"),
      v.literal("completed"),
      v.literal("failed")
    ),
    analysisAttempts: v.optional(v.number()),
    analysisFailedAt: v.optional(v.number()),
    analysisErrorMessage: v.optional(v.string()),
    config: v.object({
      targetSounds: v.array(v.string()),
      ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
      durationMinutes: v.number(),
      focusArea: v.optional(v.string()),
      runtimeSnapshot: v.optional(v.object({
        templateId: v.optional(v.id("speechCoachTemplates")),
        templateVersion: v.optional(v.number()),
        voiceProvider: v.string(),
        voiceKey: v.string(),
        tools: v.array(v.string()),
        skills: v.array(v.string()),
        knowledgePackIds: v.array(v.string()),
      })),
    }),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    transcriptStorageId: v.optional(v.id("_storage")),
    transcriptCapturedAt: v.optional(v.number()),
    rawAttempts: v.optional(v.array(v.object({
      targetLabel: v.string(),
      outcome: v.union(
        v.literal("correct"),
        v.literal("approximate"),
        v.literal("incorrect"),
        v.literal("no_response")
      ),
      retryCount: v.number(),
      timestampMs: v.number(),
    }))),
    rawTranscriptTurns: v.optional(v.array(
      v.object({
        speaker: v.union(v.literal("coach"), v.literal("child"), v.literal("system")),
        text: v.string(),
        timestampMs: v.number(),
      })
    )),
    errorMessage: v.optional(v.string()),
    testMetadata: v.optional(testMetadataValidator),
  })
    .index("by_patientId_startedAt", ["patientId", "startedAt"])
    .index("by_homeProgramId", ["homeProgramId"])
    .index("by_userId_startedAt", ["userId", "startedAt"])
    .index("by_userId_mode_startedAt", ["userId", "mode", "startedAt"]),

  speechCoachProgress: defineTable({
    sessionId: v.id("speechCoachSessions"),
    patientId: v.optional(v.id("patients")),
    caregiverUserId: v.string(),
    userId: v.optional(v.string()),
    soundsAttempted: v.array(
      v.object({
        sound: v.string(),
        wordsAttempted: v.number(),
        approximateSuccessRate: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        notes: v.string(),
      })
    ),
    overallEngagement: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    recommendedNextFocus: v.array(v.string()),
    summary: v.string(),
    analyzedAt: v.number(),
    transcriptTurns: v.optional(v.array(
      v.object({
        speaker: v.union(v.literal("coach"), v.literal("child"), v.literal("system")),
        text: v.string(),
        targetItemId: v.optional(v.string()),
        targetLabel: v.optional(v.string()),
        targetVisualUrl: v.optional(v.string()),
        attemptOutcome: v.optional(
          v.union(
            v.literal("correct"),
            v.literal("approximate"),
            v.literal("incorrect"),
            v.literal("no_response")
          )
        ),
        retryCount: v.number(),
        timestampMs: v.number(),
      })
    )),
    scoreCards: v.optional(v.object({
      overall: v.number(),
      productionAccuracy: v.number(),
      consistency: v.number(),
      cueingSupport: v.number(),
      engagement: v.number(),
    })),
    insights: v.optional(v.object({
      strengths: v.array(v.string()),
      patterns: v.array(v.string()),
      notableCueingPatterns: v.array(v.string()),
      recommendedNextTargets: v.array(v.string()),
      homePracticeNotes: v.array(v.string()),
    })),
  })
    .index("by_patientId", ["patientId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_userId", ["userId"]),

  childApps: defineTable({
    patientId: v.id("patients"),
    appId: v.id("apps"),
    assignedBy: v.string(),
    assignedByRole: v.union(v.literal("slp"), v.literal("caregiver")),
    label: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_appId", ["appId"]),

  intakeForms: defineTable({
    patientId: v.id("patients"),
    caregiverUserId: v.string(),
    formType: v.union(
      v.literal("hipaa-npp"),
      v.literal("consent-treatment"),
      v.literal("financial-agreement"),
      v.literal("cancellation-policy"),
      v.literal("release-authorization"),
      v.literal("telehealth-consent")
    ),
    signedAt: v.number(),
    signerName: v.string(),
    signerIP: v.optional(v.string()),
    formVersion: v.string(),
    metadata: v.optional(v.object({
      thirdPartyName: v.optional(v.string()),
    })),
  })
    .index("by_patientId", ["patientId"])
    .index("by_caregiverUserId", ["caregiverUserId"])
    .index("by_patientId_formType", ["patientId", "formType"]),

  practiceProfiles: defineTable({
    slpUserId: v.string(),
    practiceName: v.optional(v.string()),
    npiNumber: v.optional(v.string()),
    taxId: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    credentials: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    licenseState: v.optional(v.string()),
    defaultSessionFee: v.optional(v.number()),
  })
    .index("by_slpUserId", ["slpUserId"]),

  evaluations: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    evaluationDate: v.string(),
    referralSource: v.optional(v.string()),
    backgroundHistory: v.string(),
    assessmentTools: v.array(v.object({
      name: v.string(),
      scoresRaw: v.optional(v.string()),
      scoresStandard: v.optional(v.string()),
      percentile: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
    domainFindings: v.object({
      articulation: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
      languageReceptive: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
      languageExpressive: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
      fluency: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
      voice: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
      pragmatics: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
      aac: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
    }),
    behavioralObservations: v.string(),
    clinicalInterpretation: v.string(),
    diagnosisCodes: v.array(v.object({ code: v.string(), description: v.string() })),
    prognosis: v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("guarded")
    ),
    recommendations: v.string(),
    status: v.union(v.literal("draft"), v.literal("complete"), v.literal("signed")),
    signedAt: v.optional(v.number()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_slpUserId", ["slpUserId"]),

  plansOfCare: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    evaluationId: v.optional(v.id("evaluations")),
    diagnosisCodes: v.array(v.object({ code: v.string(), description: v.string() })),
    longTermGoals: v.array(v.string()),
    shortTermGoals: v.array(v.string()),
    frequency: v.string(),
    sessionDuration: v.string(),
    planDuration: v.string(),
    projectedDischargeDate: v.optional(v.string()),
    dischargeCriteria: v.string(),
    physicianName: v.optional(v.string()),
    physicianNPI: v.optional(v.string()),
    physicianSignatureOnFile: v.boolean(),
    physicianSignatureDate: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("amended"),
      v.literal("expired")
    ),
    signedAt: v.optional(v.number()),
    version: v.number(),
    previousVersionId: v.optional(v.id("plansOfCare")),
  })
    .index("by_patientId", ["patientId"])
    .index("by_patientId_status", ["patientId", "status"])
    .index("by_slpUserId", ["slpUserId"]),

  dischargeSummaries: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    serviceStartDate: v.string(),
    serviceEndDate: v.string(),
    presentingDiagnosis: v.string(),
    goalsAchieved: v.array(v.object({
      goalId: v.string(),
      shortDescription: v.string(),
      finalAccuracy: v.number(),
    })),
    goalsNotMet: v.array(v.object({
      goalId: v.string(),
      shortDescription: v.string(),
      finalAccuracy: v.number(),
      reason: v.string(),
    })),
    dischargeReason: v.union(
      v.literal("goals-met"),
      v.literal("plateau"),
      v.literal("family-request"),
      v.literal("insurance-exhausted"),
      v.literal("transition"),
      v.literal("other")
    ),
    dischargeReasonOther: v.optional(v.string()),
    narrative: v.string(),
    recommendations: v.string(),
    returnCriteria: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("signed")),
    signedAt: v.optional(v.number()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_slpUserId", ["slpUserId"]),

  billingRecords: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    sessionNoteId: v.optional(v.id("sessionNotes")),
    dateOfService: v.string(),
    cptCode: v.string(),
    cptDescription: v.string(),
    modifiers: v.array(v.string()),
    diagnosisCodes: v.array(v.object({
      code: v.string(),
      description: v.string(),
    })),
    placeOfService: v.string(),
    units: v.number(),
    fee: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("finalized"),
      v.literal("billed")
    ),
    billedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    testMetadata: v.optional(testMetadataValidator),
  })
    .index("by_patientId", ["patientId"])
    .index("by_slpUserId", ["slpUserId"])
    .index("by_slpUserId_status", ["slpUserId", "status"])
    .index("by_sessionNoteId", ["sessionNoteId"])
    .index("by_dateOfService", ["dateOfService"]),

  sessionTrials: defineTable({
    sessionNoteId: v.optional(v.id("sessionNotes")),
    patientId: v.id("patients"),
    slpUserId: v.string(),
    goalId: v.id("goals"),
    targetDescription: v.string(),
    trials: v.array(v.object({
      correct: v.boolean(),
      cueLevel: v.union(
        v.literal("independent"),
        v.literal("min-cue"),
        v.literal("mod-cue"),
        v.literal("max-cue")
      ),
      timestamp: v.number(),
    })),
    sessionDate: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_patientId_sessionDate", ["patientId", "sessionDate"])
    .index("by_sessionNoteId", ["sessionNoteId"])
    .index("by_goalId", ["goalId"]),

  goalBank: defineTable({
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
    ageRange: v.union(
      v.literal("0-3"),
      v.literal("3-5"),
      v.literal("5-8"),
      v.literal("8-12"),
      v.literal("12-18"),
      v.literal("adult")
    ),
    skillLevel: v.string(),
    shortDescription: v.string(),
    fullGoalText: v.string(),
    defaultTargetAccuracy: v.number(),
    defaultConsecutiveSessions: v.number(),
    exampleBaseline: v.optional(v.string()),
    typicalCriterion: v.optional(v.string()),
    isCustom: v.boolean(),
    createdBy: v.optional(v.string()),
  })
    .index("by_domain", ["domain"])
    .index("by_domain_ageRange", ["domain", "ageRange"])
    .index("by_domain_skillLevel", ["domain", "skillLevel"])
    .index("by_createdBy", ["createdBy"]),

  speechCoachTemplates: defineTable({
    slpUserId: v.string(),
    ...speechCoachTemplateValidator.fields,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slpUserId_status", ["slpUserId", "status"])
    .index("by_slpUserId_updatedAt", ["slpUserId", "updatedAt"]),
});

/** Active session states used by current code. Legacy states are read-only. */
export type SessionState = "idle" | "generating" | "live" | "failed";
