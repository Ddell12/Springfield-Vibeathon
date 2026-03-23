# Data Models — Bridges

## Convex Schema

```typescript
// convex/schema.ts
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
    threadId: v.optional(v.string()),  // Convex Agent thread ID (agent manages threads internally)
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

  // NOTE: Conversations/messages are managed by the Convex Agent component (@convex-dev/agent).
  // It creates its own internal tables for threads and messages. No custom conversations table needed.
  // Tools link to agent threads via the `threadId` field on the tools table.

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
      dimensions: 768,  // MRL-compatible: works with both gemini-embedding-001 and future v2
      filterFields: ["category"],
    }),

  ttsCache: defineTable({
    text: v.string(),
    voiceId: v.string(),
    audioStorageId: v.id("_storage"),
    createdAt: v.number(),
  })
    .index("by_text_voice", ["text", "voiceId"]),
});
```

## Tool Config Types

```typescript
// src/features/therapy-tools/types/tool-configs.ts

interface VisualScheduleConfig {
  type: "visual-schedule";
  title: string;
  steps: Array<{ id: string; label: string; icon: string; completed: boolean }>;
  orientation: "vertical" | "horizontal";
  showCheckmarks: boolean;
  theme: string;
}

interface TokenBoardConfig {
  type: "token-board";
  title: string;
  totalTokens: number;
  earnedTokens: number;
  tokenIcon: string;
  reinforcers: Array<{ id: string; label: string; icon: string }>;
  celebrationAnimation: boolean;
}

interface CommunicationBoardConfig {
  type: "communication-board";
  title: string;
  sentenceStarter: string;
  cards: Array<{ id: string; label: string; icon: string; category: string }>;
  enableTTS: boolean;
  voiceId: string;
  columns: number;
}

interface ChoiceBoardConfig {
  type: "choice-board";
  title: string;
  prompt: string;
  choices: Array<{ id: string; label: string; icon: string }>;
  maxSelections: number;
  showConfirmButton: boolean;
}

interface FirstThenBoardConfig {
  type: "first-then-board";
  title: string;
  firstTask: { label: string; icon: string; completed: boolean };
  thenReward: { label: string; icon: string };
  showTimer: boolean;
  timerMinutes: number;
}

type ToolConfig =
  | VisualScheduleConfig
  | TokenBoardConfig
  | CommunicationBoardConfig
  | ChoiceBoardConfig
  | FirstThenBoardConfig;
```

## Relationships

| Relationship | Type | Link |
|-------------|------|------|
| Tool → Agent Thread | N:1 | `tools.threadId` → Convex Agent internal thread |
| TTS Cache → Storage | 1:1 | `ttsCache.audioStorageId` → `_storage._id` |

> **Note:** Conversation/message relationships are managed internally by `@convex-dev/agent`. The agent component creates its own `threads` and `messages` tables. Access them via the agent's React hooks (`useUIMessages`, `useSmoothText`) and server APIs.

## Indexes

| Table | Index | Fields | Purpose |
|-------|-------|--------|---------|
| tools | by_thread | threadId | Find tool for an agent thread |
| tools | by_share_slug | shareSlug | Look up tool by URL slug |
| tools | by_template | isTemplate, templateCategory | Template gallery queries |
| tools | by_created | createdAt | Sort by recency |
| knowledgeBase | by_embedding | embedding (768-dim vector) | RAG semantic search |
| ttsCache | by_text_voice | text, voiceId | Deduplicate TTS requests |
