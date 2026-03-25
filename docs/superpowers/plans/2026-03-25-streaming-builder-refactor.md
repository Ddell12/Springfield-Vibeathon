# Streaming Builder Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 8-phase sequential pipeline (17-47 min) with a streaming-first builder achieving 4-8s first preview and 3-6s iterations.

**Architecture:** Next.js API route streams LLM tokens via SSE to the client. As files complete, they're written to an E2B sandbox (created in parallel on submit). Convex persists state reactively. A pre-built component library in the E2B template ensures beautiful output.

**Tech Stack:** Next.js 16 API routes, `@anthropic-ai/sdk` streaming, E2B sandbox SDK, Convex mutations, SSE (Server-Sent Events), Vitest

**Spec:** `docs/superpowers/specs/2026-03-25-streaming-builder-refactor-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/app/api/generate/route.ts` | Streaming LLM → SSE. Parses tool_use blocks, writes to E2B, emits events |
| `src/app/api/sandbox/route.ts` | Sandbox create/connect/write_files API |
| `src/features/builder/hooks/use-streaming.ts` | Client SSE hook — connects, parses events, manages streaming state |
| `src/features/builder/lib/agent-prompt.ts` | System prompt construction — frontend-design skill + therapy domain + template component reference |
| `src/features/builder/lib/sse-types.ts` | Shared SSE event type definitions |
| `e2b-templates/vite-therapy-v2/src/components/TherapyCard.tsx` | Base card component |
| `e2b-templates/vite-therapy-v2/src/components/TokenBoard.tsx` | Token economy component |
| `e2b-templates/vite-therapy-v2/src/components/VisualSchedule.tsx` | Step-by-step schedule |
| `e2b-templates/vite-therapy-v2/src/components/CommunicationBoard.tsx` | AAC picture grid |
| `e2b-templates/vite-therapy-v2/src/components/DataTracker.tsx` | Trial/frequency data collection |
| `e2b-templates/vite-therapy-v2/src/components/CelebrationOverlay.tsx` | Reward animation overlay |
| `e2b-templates/vite-therapy-v2/src/components/ChoiceGrid.tsx` | Multiple choice selection |
| `e2b-templates/vite-therapy-v2/src/components/TimerBar.tsx` | Visual countdown/count-up |
| `e2b-templates/vite-therapy-v2/src/components/PromptCard.tsx` | Instruction display |
| `e2b-templates/vite-therapy-v2/src/hooks/useSound.ts` | Audio playback with iOS handling |
| `e2b-templates/vite-therapy-v2/src/hooks/useAnimation.ts` | Celebration/feedback triggers |
| `e2b-templates/vite-therapy-v2/src/hooks/useDataCollection.ts` | ABA data recording |
| `e2b-templates/vite-therapy-v2/src/styles/design-system.css` | Upgraded design system CSS |

### Modified Files
| File | Changes |
|------|---------|
| `convex/schema.ts:4-174` | Remove 4 tables (phases, agentContext, versions, blueprints). Simplify sessions. Modify files table |
| `convex/sessions.ts:1-195` | Rewrite: 4-state machine (idle/generating/live/failed). Remove phase/template/blueprint mutations |
| `convex/generated_files.ts:1-83` | Remove phaseId, add version. Remove listByPhase query |
| `convex/e2b.ts:1-157` | Simplify: keep create/connect/writeFiles. Remove getRuntimeErrors, connectOrRecreate |
| `src/features/builder/components/builder-page.tsx:1-90` | Remove PhaseTimeline, useSessionPhases. Add streaming state management |
| `src/features/builder/components/chat-panel.tsx` | Add streaming status, remove phase messages. Blueprint as info card |
| `src/features/builder/components/preview-panel.tsx` | Remove URL probing/retry. Direct iframe from sandbox URL |
| `src/features/builder/components/code-panel.tsx` | Add streaming code display with live syntax highlighting |
| `src/features/builder/hooks/use-session.ts:1-27` | Remove useSessionPhases, useBlueprint. Simplify |

### Deleted Files
| File | Reason |
|------|--------|
| `convex/pipeline.ts` (842 lines) | Replaced by `app/api/generate/route.ts` |
| `convex/pipeline_prompts.ts` (113 lines) | Merged into `agent-prompt.ts` |
| `convex/pipeline_tools.ts` (71 lines) | write_file tool defined inline in API route |
| `convex/blueprints.ts` (81 lines) | Blueprint data inlined on sessions table |
| `convex/phases.ts` (91 lines) | No more multi-phase pipeline |
| `src/features/builder/components/phase-timeline.tsx` | No more phases |
| `src/features/builder/components/__tests__/phase-timeline.test.tsx` | Dead test |
| `src/features/builder/components/__tests__/blueprint-card.test.tsx` | Rewritten with component |
| `src/app/api/agent/build/route.ts` | Replaced by `/api/generate` |
| `src/app/api/agent/approve/route.ts` | No approval gate |
| `src/app/api/agent/message/route.ts` | Follow-ups go through `/api/generate` |

---

## Task 1: Convex Schema — Simplify to 4-State Model

**Files:**
- Modify: `convex/schema.ts:4-174`
- Test: `convex/__tests__/schema.test.ts` (new)

- [ ] **Step 1: Write test for simplified schema**

```typescript
// convex/__tests__/schema.test.ts
import { describe, expect, it } from "vitest";
import schema from "../schema";

describe("schema", () => {
  it("sessions table has simplified state union", () => {
    const sessionFields = schema.tables.sessions.validator;
    expect(sessionFields).toBeDefined();
  });

  it("does not have phases table", () => {
    expect(schema.tables).not.toHaveProperty("phases");
  });

  it("does not have agentContext table", () => {
    expect(schema.tables).not.toHaveProperty("agentContext");
  });

  it("does not have versions table", () => {
    expect(schema.tables).not.toHaveProperty("versions");
  });

  it("does not have blueprints table", () => {
    expect(schema.tables).not.toHaveProperty("blueprints");
  });

  it("files table has version field and no phaseId", () => {
    const fileFields = schema.tables.files.validator;
    expect(fileFields).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/schema.test.ts`
Expected: FAIL — phases, agentContext, versions, blueprints tables still exist

- [ ] **Step 3: Rewrite schema.ts**

Replace `convex/schema.ts` contents. Key changes:
- Sessions: state union → `idle | generating | live | failed`. Remove `currentPhaseIndex`, `phasesRemaining`, `mvpGenerated`, `templateName`, `blueprintId`. Add `blueprint: v.optional(v.any())`, `error: v.optional(v.string())`
- Files: Remove `phaseId: v.id("phases")`. Add `version: v.number()`. Remove `by_phase` index
- Delete tables: `phases`, `agentContext`, `versions`, `blueprints`
- Keep unchanged: `messages`, `apps`, `appState`, `knowledgeBase`, `ttsCache`, `therapyTemplates`

```typescript
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
      v.literal("failed")
    ),
    stateMessage: v.optional(v.string()),
    error: v.optional(v.string()),
    blueprint: v.optional(v.any()),
    sandboxId: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
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
    version: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_session_path", ["sessionId", "path"]),

  // === Unchanged tables ===
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
    exampleFragment: v.optional(v.any()),
    sortOrder: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_sortOrder", ["sortOrder"]),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/__tests__/schema.test.ts
git commit -m "refactor: simplify schema — remove phases/agentContext/versions/blueprints, 4-state sessions"
```

---

## Task 2: Convex Sessions — 4-State Mutations

**Files:**
- Rewrite: `convex/sessions.ts:1-195`
- Test: `convex/__tests__/sessions.test.ts` (new)

- [ ] **Step 1: Write tests for new session mutations**

```typescript
// convex/__tests__/sessions.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";

describe("sessions", () => {
  it("create returns session in idle state", async () => {
    const t = convexTest(schema);
    const id = await t.mutation(api.sessions.create, {
      title: "Test", query: "Build a token board",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("idle");
    expect(session?.query).toBe("Build a token board");
  });

  it("startGeneration transitions to generating", async () => {
    const t = convexTest(schema);
    const id = await t.mutation(api.sessions.create, {
      title: "Test", query: "Build a token board",
    });
    await t.mutation(api.sessions.startGeneration, { sessionId: id });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("generating");
  });

  it("setLive transitions to live with sandbox info", async () => {
    const t = convexTest(schema);
    const id = await t.mutation(api.sessions.create, {
      title: "Test", query: "test",
    });
    await t.mutation(api.sessions.setLive, {
      sessionId: id,
      sandboxId: "sbx-123",
      previewUrl: "https://sbx-123.e2b.app",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("live");
    expect(session?.sandboxId).toBe("sbx-123");
    expect(session?.previewUrl).toBe("https://sbx-123.e2b.app");
  });

  it("setFailed transitions to failed with error", async () => {
    const t = convexTest(schema);
    const id = await t.mutation(api.sessions.create, {
      title: "Test", query: "test",
    });
    await t.mutation(api.sessions.setFailed, {
      sessionId: id, error: "LLM timeout",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("failed");
    expect(session?.error).toBe("LLM timeout");
  });

  it("setBlueprint stores blueprint data", async () => {
    const t = convexTest(schema);
    const id = await t.mutation(api.sessions.create, {
      title: "Test", query: "test",
    });
    const blueprint = { title: "Token Board", therapyGoal: "Counting" };
    await t.mutation(api.sessions.setBlueprint, {
      sessionId: id, blueprint,
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.blueprint).toEqual(blueprint);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/sessions.test.ts`
Expected: FAIL — startGeneration, setLive, setBlueprint don't exist yet

- [ ] **Step 3: Rewrite sessions.ts**

```typescript
// convex/sessions.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    title: v.string(),
    query: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      userId: args.userId,
      title: args.title,
      query: args.query,
      state: "idle",
    });
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_user")
      .order("desc")
      .take(50);
  },
});

export const startGeneration = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      state: "generating",
      stateMessage: "Generating your app...",
    });
  },
});

export const setLive = mutation({
  args: {
    sessionId: v.id("sessions"),
    sandboxId: v.string(),
    previewUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      state: "live",
      stateMessage: "Live",
      sandboxId: args.sandboxId,
      previewUrl: args.previewUrl,
    });
  },
});

export const setFailed = mutation({
  args: {
    sessionId: v.id("sessions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      state: "failed",
      error: args.error,
    });
  },
});

export const setBlueprint = mutation({
  args: {
    sessionId: v.id("sessions"),
    blueprint: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      blueprint: args.blueprint,
    });
  },
});

export const setSandbox = mutation({
  args: {
    sessionId: v.id("sessions"),
    sandboxId: v.string(),
    previewUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      sandboxId: args.sandboxId,
      previewUrl: args.previewUrl,
    });
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/sessions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add convex/sessions.ts convex/__tests__/sessions.test.ts
git commit -m "refactor: rewrite sessions.ts — 4-state model, remove pipeline mutations"
```

---

## Task 3: Convex Generated Files — Remove Phase Coupling

**Files:**
- Rewrite: `convex/generated_files.ts:1-83`
- Test: `convex/__tests__/generated_files.test.ts` (new)

- [ ] **Step 1: Write tests for simplified file operations**

```typescript
// convex/__tests__/generated_files.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

describe("generated_files", () => {
  it("upsert creates a new file with version", async () => {
    const t = convexTest(schema);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test", query: "test",
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId, path: "src/App.tsx", contents: "export default function App() {}", version: 1,
    });
    const files = await t.query(api.generated_files.list, { sessionId });
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("src/App.tsx");
    expect(files[0].version).toBe(1);
  });

  it("upsert updates existing file and increments version", async () => {
    const t = convexTest(schema);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test", query: "test",
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId, path: "src/App.tsx", contents: "v1", version: 1,
    });
    await t.mutation(api.generated_files.upsert, {
      sessionId, path: "src/App.tsx", contents: "v2", version: 2,
    });
    const files = await t.query(api.generated_files.list, { sessionId });
    expect(files).toHaveLength(1);
    expect(files[0].contents).toBe("v2");
    expect(files[0].version).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/generated_files.test.ts`
Expected: FAIL — upsert still requires phaseId

- [ ] **Step 3: Rewrite generated_files.ts**

```typescript
// convex/generated_files.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const upsert = mutation({
  args: {
    sessionId: v.id("sessions"),
    path: v.string(),
    contents: v.string(),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", args.sessionId).eq("path", args.path)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        contents: args.contents,
        version: args.version,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("files", {
        sessionId: args.sessionId,
        path: args.path,
        contents: args.contents,
        version: args.version,
      });
    }
  },
});

export const list = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const getByPath = query({
  args: { sessionId: v.id("sessions"), path: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", args.sessionId).eq("path", args.path)
      )
      .first();
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/generated_files.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add convex/generated_files.ts convex/__tests__/generated_files.test.ts
git commit -m "refactor: simplify generated_files — remove phaseId, add version tracking"
```

---

## Task 4: Delete Old Pipeline Files

**Files:**
- Delete: `convex/pipeline.ts`, `convex/pipeline_prompts.ts`, `convex/pipeline_tools.ts`, `convex/blueprints.ts`, `convex/phases.ts`
- Delete: `src/app/api/agent/build/route.ts`, `src/app/api/agent/approve/route.ts`, `src/app/api/agent/message/route.ts`
- Delete: `src/features/builder/components/phase-timeline.tsx`, `src/features/builder/components/__tests__/phase-timeline.test.tsx`, `src/features/builder/components/__tests__/blueprint-card.test.tsx`

- [ ] **Step 1: Verify no other files import the deleted modules**

Run: `grep -r "from.*pipeline\|from.*blueprints\|from.*phases\|from.*pipeline_prompts\|from.*pipeline_tools" convex/ src/ --include="*.ts" --include="*.tsx" -l`

Check the output — any file importing these modules must also be updated (should only be `builder-page.tsx`, `use-session.ts`, and the old API routes, all of which are being modified in later tasks).

- [ ] **Step 2: Delete old pipeline and phase files**

```bash
rm convex/pipeline.ts convex/pipeline_prompts.ts convex/pipeline_tools.ts convex/blueprints.ts convex/phases.ts
rm -rf src/app/api/agent/
rm src/features/builder/components/phase-timeline.tsx
rm src/features/builder/components/__tests__/phase-timeline.test.tsx
rm src/features/builder/components/__tests__/blueprint-card.test.tsx
```

- [ ] **Step 3: Verify Convex codegen still works**

Run: `npx convex dev --once` (or check that `convex/_generated/api.ts` regenerates without errors)
Expected: No errors referencing deleted modules. `api.pipeline`, `api.blueprints`, `api.phases` should no longer appear in generated types.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: delete old pipeline, blueprints, phases — 1198 lines removed"
```

---

## Task 5: Simplify E2B Module

**Files:**
- Rewrite: `convex/e2b.ts:1-157`
- Test: Manual (E2B requires API key, not unit-testable)

- [ ] **Step 1: Rewrite e2b.ts to three focused functions**

```typescript
// convex/e2b.ts — Simplified E2B sandbox operations
"use node";
import { Sandbox, SandboxNotFoundError } from "e2b";

const TEMPLATE = "vite-therapy";
const SANDBOX_TIMEOUT_MS = 1_800_000; // 30 min

export async function createSandbox(): Promise<{ sandboxId: string; previewUrl: string }> {
  const sandbox = await Sandbox.create(TEMPLATE, {
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: SANDBOX_TIMEOUT_MS,
  });
  return {
    sandboxId: sandbox.sandboxId,
    previewUrl: `https://${sandbox.getHost(5173)}`,
  };
}

export async function writeFiles(
  sandboxId: string,
  files: { path: string; contents: string }[],
): Promise<void> {
  let sandbox: Sandbox;
  try {
    sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });
  } catch (error) {
    if (error instanceof SandboxNotFoundError) {
      throw new Error("Sandbox expired — recreate required");
    }
    throw error;
  }
  for (const file of files) {
    await sandbox.files.write(`/home/user/app/${file.path}`, file.contents);
  }
}

export async function killSandbox(sandboxId: string): Promise<void> {
  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });
    await sandbox.kill();
  } catch {
    // Already gone — ignore
  }
}
```

Note: Template name stays `vite-therapy` until Task 8 builds and registers `vite-therapy-v2`. We'll update the constant then.

- [ ] **Step 2: Verify no broken imports**

Run: `grep -r "from.*e2b\|connectOrRecreate\|updateSandboxFiles\|getRuntimeErrors\|createAndDeploySandbox" convex/ src/ --include="*.ts" --include="*.tsx" -l`

All references should be in deleted files or files being rewritten in this plan.

- [ ] **Step 3: Commit**

```bash
git add convex/e2b.ts
git commit -m "refactor: simplify e2b.ts — three functions: create, writeFiles, kill"
```

---

## Task 6: SSE Types + Agent Prompt

**Files:**
- Create: `src/features/builder/lib/sse-types.ts`
- Create: `src/features/builder/lib/agent-prompt.ts`
- Test: `src/features/builder/lib/__tests__/agent-prompt.test.ts`

- [ ] **Step 1: Create shared SSE event types**

```typescript
// src/features/builder/lib/sse-types.ts
export type SSEEvent =
  | { type: "file_delta"; path: string; partial: string }
  | { type: "file_complete"; path: string; contents: string }
  | { type: "blueprint"; data: Record<string, unknown> }
  | { type: "status"; status: "generating" | "deploying" | "live" }
  | { type: "error"; message: string; recoverable: boolean }
  | { type: "done"; files: { path: string; contents: string }[]; sandboxId: string; previewUrl: string };
```

- [ ] **Step 2: Write test for agent prompt construction**

```typescript
// src/features/builder/lib/__tests__/agent-prompt.test.ts
import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../agent-prompt";

describe("buildSystemPrompt", () => {
  it("includes frontend-design principles", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("design");
    expect(prompt).toContain("spacing");
    expect(prompt).toContain("animation");
  });

  it("includes therapy domain context", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("ABA");
    expect(prompt).toContain("speech therapy");
    expect(prompt).toContain("44px");
  });

  it("includes template component reference", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("TherapyCard");
    expect(prompt).toContain("TokenBoard");
    expect(prompt).toContain("CelebrationOverlay");
  });

  it("includes write_file tool instruction", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("write_file");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/builder/lib/__tests__/agent-prompt.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Create agent-prompt.ts**

Build the system prompt in layers. This is where the frontend-design skill knowledge, therapy domain expertise, and template component reference all come together. The prompt should be ~2000-3000 tokens — rich but not bloated.

```typescript
// src/features/builder/lib/agent-prompt.ts

const FRONTEND_DESIGN_LAYER = `## Design Excellence

You create beautiful, polished therapy apps. Every app must feel intentional and crafted — never generic.

COLOR: Use CSS custom properties (--primary, --accent, --surface-*). Gradients for primary CTAs (135deg, primary → primary-light). Tonal background shifts for depth — never flat gray boxes.

TYPOGRAPHY: Nunito for headings (700 weight, rounded, friendly). Inter for body text (400-500 weight). Size scale: titles 1.75rem, headings 1.25rem, body 1rem, captions 0.875rem.

SPACING: 4px base unit. Cards get 1-1.5rem padding. Grid gaps 1rem minimum. Never cramped layouts.

ANIMATION: Every interaction gets visual feedback:
- Buttons: scale(0.95) on :active, 200ms ease
- Cards: translateY(-2px) + shadow on hover, 200ms ease
- Celebrations: scale + opacity keyframes, 300-600ms
- Use cubic-bezier(0.4, 0, 0.2, 1) for all transitions
- Support prefers-reduced-motion

LAYOUT: Card-based compositions. Mobile-first (max-width: 32rem container). Centered content. Generous whitespace. Grid for multi-item displays.

ANTI-PATTERNS (never do these):
- Flat unstyled containers with no shadows or backgrounds
- Gray text on gray backgrounds
- Missing hover/active states on interactive elements
- Cramped spacing with no breathing room
- Generic placeholder aesthetics`;

const THERAPY_DOMAIN_LAYER = `## Therapy Domain Expertise

You build apps for ABA therapists, speech therapists, and parents of autistic children.

THERAPY TYPES:
- ABA: discrete trial training, token economies, reinforcement schedules, prompt hierarchies
- Speech: AAC boards, PECS, communication boards, sentence strips
- Visual supports: visual schedules, first-then boards, choice boards, social stories
- Data collection: trial counts, accuracy percentages, duration tracking

DESIGN FOR THERAPY:
- Touch-first: minimum 44px touch targets (64px preferred), designed for iPad
- Child-friendly: bright, warm colors. Rounded corners. Clear icons.
- Reinforcement: EVERY app needs meaningful feedback (animations, sounds, tokens, celebrations)
- Accessibility: high contrast support, reduced motion support, clear visual hierarchy
- Simple navigation: therapists use these during sessions, can't fiddle with complex UIs`;

const TEMPLATE_COMPONENT_LAYER = `## Available Components

The sandbox template provides pre-built React components. IMPORT AND USE THESE instead of building from scratch:

COMPONENTS (import from './components/'):
- <TherapyCard variant="elevated|flat|interactive"> — Base card with tonal surfaces, hover lift, touch feedback
- <TokenBoard goal={number} earned={number} onEarn={() => void}> — Star/sticker reward grid with celebration at goal
- <VisualSchedule steps={[{label, icon?, done}]} onToggle={(i) => void}> — Step-by-step with checkmarks
- <CommunicationBoard items={[{label, image?, sound?}]} onSelect={(item) => void}> — AAC picture grid with TTS
- <DataTracker config={{type: "trial"|"frequency"|"duration", targetCount?}} onRecord={(data) => void}> — ABA data collection
- <CelebrationOverlay variant="confetti|stars|fireworks" trigger={boolean}> — Reward overlay animation
- <ChoiceGrid options={[{label, image?, correct?}]} onSelect={(option) => void}> — Multiple choice with feedback
- <TimerBar duration={seconds} onComplete={() => void} running={boolean}> — Visual countdown
- <PromptCard icon={string} title={string} instruction={string}> — Instruction display card

HOOKS (import from './hooks/'):
- useLocalStorage(key, defaultValue) — Persistent state across sessions
- useSound(src) — Audio playback (handles iOS Safari autoplay)
- useAnimation(trigger) — Returns className for celebration animations
- useDataCollection(config) — ABA data recording (trials, frequency, duration)

CSS CLASSES (from therapy-ui.css, always available):
- .tool-container, .tool-grid, .tool-title, .tool-instruction
- .card-interactive, .tap-target, .token-star, .schedule-step, .board-cell
- .btn-primary, .btn-secondary, .celebration-burst

CRITICAL: For most apps, write ONLY src/App.tsx. The template provides everything else (main.tsx, styles, components, hooks). Only create additional files for truly custom logic.`;

export function buildSystemPrompt(): string {
  return [
    "You are Bridges, an expert therapy app builder. You create beautiful, interactive therapy tools from plain-language descriptions.",
    "",
    FRONTEND_DESIGN_LAYER,
    "",
    THERAPY_DOMAIN_LAYER,
    "",
    TEMPLATE_COMPONENT_LAYER,
    "",
    "## Output Rules",
    "- Use the write_file tool to output each file",
    "- For most apps: write ONLY src/App.tsx",
    "- Write complete file contents, never diffs or partial code",
    "- Import components from './components/' and hooks from './hooks/'",
    "- Use Tailwind v4 utilities + therapy-ui.css classes",
    "- Mobile-first responsive design",
    "- ALSO output a blueprint JSON object (not via tool) with: title, description, therapyGoal, targetSkill, ageRange, interactionModel",
  ].join("\n");
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/builder/lib/__tests__/agent-prompt.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/builder/lib/sse-types.ts src/features/builder/lib/agent-prompt.ts src/features/builder/lib/__tests__/agent-prompt.test.ts
git commit -m "feat: add SSE types and agent prompt with frontend-design + therapy layers"
```

---

## Task 7: Streaming API Routes

**Files:**
- Create: `src/app/api/generate/route.ts`
- Create: `src/app/api/sandbox/route.ts`
- Test: `src/app/api/__tests__/generate.test.ts`

- [ ] **Step 1: Write test for generate route**

```typescript
// src/app/api/__tests__/generate.test.ts
import { describe, expect, it, vi } from "vitest";

// Test the SSE encoding helper separately (route handler needs real Anthropic SDK)
describe("SSE encoding", () => {
  it("formats event correctly", () => {
    const event = { type: "status", status: "generating" };
    const encoded = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    expect(encoded).toContain("event: status");
    expect(encoded).toContain('"generating"');
  });

  it("formats file_complete event", () => {
    const event = { type: "file_complete", path: "src/App.tsx", contents: "code" };
    const encoded = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    expect(encoded).toContain("event: file_complete");
    expect(encoded).toContain("src/App.tsx");
  });
});
```

- [ ] **Step 2: Run test to verify it passes** (these are pure encoding tests)

Run: `npx vitest run src/app/api/__tests__/generate.test.ts`
Expected: PASS

- [ ] **Step 3: Create sandbox route**

```typescript
// src/app/api/sandbox/route.ts
import { Sandbox, SandboxNotFoundError } from "e2b";

const TEMPLATE = "vite-therapy";
const TIMEOUT_MS = 1_800_000;

export async function POST(req: Request) {
  const { action, sandboxId, files } = await req.json();

  if (action === "create") {
    const sandbox = await Sandbox.create(TEMPLATE, {
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: TIMEOUT_MS,
    });
    return Response.json({
      sandboxId: sandbox.sandboxId,
      previewUrl: `https://${sandbox.getHost(5173)}`,
    });
  }

  if (action === "write_files" && sandboxId && files) {
    try {
      const sandbox = await Sandbox.connect(sandboxId, {
        apiKey: process.env.E2B_API_KEY,
      });
      for (const file of files as { path: string; contents: string }[]) {
        await sandbox.files.write(`/home/user/app/${file.path}`, file.contents);
      }
      return Response.json({ ok: true });
    } catch (error) {
      if (error instanceof SandboxNotFoundError) {
        return Response.json({ error: "sandbox_expired" }, { status: 410 });
      }
      throw error;
    }
  }

  return Response.json({ error: "invalid action" }, { status: 400 });
}
```

- [ ] **Step 4: Create generate route (core streaming pipeline)**

```typescript
// src/app/api/generate/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { ConvexHttpClient } from "convex/browser";

import { api } from "../../../../convex/_generated/api";
import { buildSystemPrompt } from "../../../features/builder/lib/agent-prompt";

const anthropic = new Anthropic();
const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud"
);

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const { sessionId, prompt, currentFiles, sandboxId, previewUrl } = await req.json();

  if (!sessionId || !prompt) {
    return Response.json({ error: "sessionId and prompt required" }, { status: 400 });
  }

  // Mark session as generating
  await convex.mutation(api.sessions.startGeneration, { sessionId });

  // Add user message to chat
  await convex.mutation(api.messages.create, {
    sessionId,
    role: "user",
    content: prompt,
    timestamp: Date.now(),
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(sseEncode("status", { status: "generating" })));

        // Build messages array
        const messages: Anthropic.MessageParam[] = [];
        if (currentFiles && currentFiles.length > 0) {
          const fileContext = currentFiles
            .map((f: { path: string; contents: string }) => `--- ${f.path} ---\n${f.contents}`)
            .join("\n\n");
          messages.push({
            role: "user",
            content: `Here are the current files:\n\n${fileContext}\n\nUser request: ${prompt}`,
          });
        } else {
          messages.push({ role: "user", content: prompt });
        }

        // Stream LLM response
        const response = await anthropic.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 16384,
          system: buildSystemPrompt(),
          messages,
          tools: [
            {
              name: "write_file",
              description: "Write a complete file to the sandbox",
              input_schema: {
                type: "object" as const,
                properties: {
                  filePath: { type: "string", description: "Relative path e.g. src/App.tsx" },
                  contents: { type: "string", description: "Complete file source code" },
                },
                required: ["filePath", "contents"],
              },
            },
          ],
        });

        // Create sandbox in parallel with LLM call if not provided
        let resolvedSandboxId = sandboxId;
        let resolvedPreviewUrl = previewUrl;
        const sandboxPromise = sandboxId
          ? Promise.resolve({ sandboxId, previewUrl })
          : fetch(new URL("/api/sandbox", req.url).origin + "/api/sandbox", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "create" }),
            }).then((r) => r.json() as Promise<{ sandboxId: string; previewUrl: string }>);

        const collectedFiles: { path: string; contents: string }[] = [];
        let version = 1;
        let textAccumulator = "";

        // Stream events — emit file_delta for live code display
        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "input_json_delta"
          ) {
            // Tool input streaming — emit file_delta for live typing effect
            controller.enqueue(
              encoder.encode(sseEncode("file_delta", { partial: event.delta.partial_json }))
            );
          }

          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            textAccumulator += event.delta.text;
          }
        }

        // Ensure sandbox is ready before writing files
        const sbx = await sandboxPromise;
        resolvedSandboxId = sbx.sandboxId;
        resolvedPreviewUrl = sbx.previewUrl;

        // Process final message — write completed files to sandbox
        const finalMessage = await response.finalMessage();

        for (const block of finalMessage.content) {
          if (block.type === "tool_use" && block.name === "write_file") {
            const input = block.input as { filePath: string; contents: string };
            const file = { path: input.filePath, contents: input.contents };
            collectedFiles.push(file);

            // Write to sandbox
            try {
              const sbxRes = await fetch(new URL("/api/sandbox", req.url).origin + "/api/sandbox", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "write_files",
                  sandboxId: resolvedSandboxId,
                  files: [file],
                }),
              });
              if (!sbxRes.ok) {
                console.warn("Sandbox write failed:", await sbxRes.text());
              }
            } catch (e) {
              console.warn("Sandbox write error:", e);
            }

            // Persist to Convex
            await convex.mutation(api.generated_files.upsert, {
              sessionId,
              path: file.path,
              contents: file.contents,
              version,
            });

            controller.enqueue(encoder.encode(sseEncode("file_complete", file)));
            version++;
          }

          if (block.type === "text") {
            // Try to extract blueprint JSON from text
            try {
              const jsonMatch = block.text.match(/\{[\s\S]*"title"[\s\S]*"therapyGoal"[\s\S]*\}/);
              if (jsonMatch) {
                const blueprint = JSON.parse(jsonMatch[0]);
                await convex.mutation(api.sessions.setBlueprint, { sessionId, blueprint });
                controller.enqueue(encoder.encode(sseEncode("blueprint", { data: blueprint })));
              }
            } catch {
              // Not valid blueprint JSON — that's fine, it's optional
            }

            // Add assistant message to chat
            await convex.mutation(api.messages.create, {
              sessionId,
              role: "assistant",
              content: block.text,
              timestamp: Date.now(),
            });
          }
        }

        // Mark session as live
        await convex.mutation(api.sessions.setLive, {
          sessionId,
          sandboxId: resolvedSandboxId,
          previewUrl: resolvedPreviewUrl,
        });

        controller.enqueue(encoder.encode(sseEncode("status", { status: "live" })));
        controller.enqueue(encoder.encode(sseEncode("done", {
          files: collectedFiles,
          sandboxId: resolvedSandboxId,
          previewUrl: resolvedPreviewUrl,
        })));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await convex.mutation(api.sessions.setFailed, { sessionId, error: message });
        controller.enqueue(encoder.encode(sseEncode("error", { message, recoverable: false })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 5: Change messages.create from internalMutation to public mutation**

The existing `convex/messages.ts` exports `create` as `internalMutation`. The generate route calls it via `ConvexHttpClient` which can only access public `mutation`s. Change line 5 of `convex/messages.ts` from `internalMutation` to `mutation`:

```typescript
// convex/messages.ts — change this:
export const create = internalMutation({
// to this:
export const create = mutation({
```

Also ensure the import at line 3 includes `mutation` (it already does: `import { internalMutation, mutation, query } from "./_generated/server"`).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/generate/route.ts src/app/api/sandbox/route.ts src/app/api/__tests__/generate.test.ts
git commit -m "feat: add streaming generate + sandbox API routes"
```

---

## Task 8: E2B Template V2 — Component Library

**Files:**
- Create: Full `e2b-templates/vite-therapy-v2/` directory (copy from vite-therapy, then add components)
- Test: Visual (build template, create sandbox, verify components render)

- [ ] **Step 1: Copy existing template as base**

```bash
cp -r e2b-templates/vite-therapy e2b-templates/vite-therapy-v2
rm -rf e2b-templates/vite-therapy-v2/node_modules
```

- [ ] **Step 2: Create component files**

Create all 9 components listed in the spec under `e2b-templates/vite-therapy-v2/src/components/`. Each component should be a self-contained React component using therapy-ui.css classes and Tailwind v4 utilities. Components should accept props for customization but have beautiful defaults.

Key component: `TherapyCard.tsx` — used as the base for most other components:

```tsx
// e2b-templates/vite-therapy-v2/src/components/TherapyCard.tsx
import { type ReactNode } from "react";

interface TherapyCardProps {
  variant?: "elevated" | "flat" | "interactive";
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TherapyCard({ variant = "elevated", children, className = "", onClick }: TherapyCardProps) {
  const base = "rounded-[var(--radius-lg)] p-4 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]";
  const variants = {
    elevated: "bg-[var(--color-surface-raised)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
    flat: "bg-[var(--color-surface)]",
    interactive: "bg-[var(--color-surface-raised)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:scale-95",
  };
  return (
    <div className={`${base} ${variants[variant]} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
```

Create similar components for: `TokenBoard`, `VisualSchedule`, `CommunicationBoard`, `DataTracker`, `CelebrationOverlay`, `ChoiceGrid`, `TimerBar`, `PromptCard`.

- [ ] **Step 3: Create hook files**

Create `useSound.ts`, `useAnimation.ts`, `useDataCollection.ts` under `e2b-templates/vite-therapy-v2/src/hooks/`.

- [ ] **Step 4: Upgrade design system CSS**

Replace `therapy-ui.css` with enhanced `design-system.css` in `e2b-templates/vite-therapy-v2/src/styles/`. Add dark mode, elevation system, gradient presets, animation presets.

- [ ] **Step 5: Update template's App.tsx to demonstrate components**

Replace the default App.tsx with a showcase of all available components so the LLM can see what's possible.

- [ ] **Step 6: Build and register template**

```bash
cd e2b-templates/vite-therapy-v2 && npm install && npx tsx build.prod.ts
```

Note the new template ID and update `TEMPLATE` constant in `src/app/api/sandbox/route.ts`.

- [ ] **Step 7: Commit**

```bash
git add e2b-templates/vite-therapy-v2/
git commit -m "feat: add vite-therapy-v2 template with 9 pre-built therapy components"
```

---

## Task 9: Client Streaming Hook

**Files:**
- Create: `src/features/builder/hooks/use-streaming.ts`
- Test: `src/features/builder/hooks/__tests__/use-streaming.test.ts`

- [ ] **Step 1: Write test for streaming hook**

```typescript
// src/features/builder/hooks/__tests__/use-streaming.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useStreaming, type StreamingState } from "../use-streaming";

describe("useStreaming", () => {
  it("initializes in idle state", () => {
    const { result } = renderHook(() => useStreaming());
    expect(result.current.state).toBe("idle");
    expect(result.current.files).toEqual([]);
  });

  it("exposes generate function", () => {
    const { result } = renderHook(() => useStreaming());
    expect(typeof result.current.generate).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/builder/hooks/__tests__/use-streaming.test.ts`
Expected: FAIL

- [ ] **Step 3: Create use-streaming.ts**

```typescript
// src/features/builder/hooks/use-streaming.ts
"use client";
import { useCallback, useRef, useState } from "react";
import type { SSEEvent } from "../lib/sse-types";

export type StreamingState = "idle" | "generating" | "live" | "error";

interface StreamFile {
  path: string;
  contents: string;
  partial?: string;
}

interface UseStreamingReturn {
  state: StreamingState;
  files: StreamFile[];
  blueprint: Record<string, unknown> | null;
  error: string | null;
  generate: (params: {
    sessionId: string;
    prompt: string;
    currentFiles?: { path: string; contents: string }[];
    sandboxId?: string;
    previewUrl?: string;
  }) => void;
}

export function useStreaming(): UseStreamingReturn {
  const [state, setState] = useState<StreamingState>("idle");
  const [files, setFiles] = useState<StreamFile[]>([]);
  const [blueprint, setBlueprint] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback((params: {
    sessionId: string;
    prompt: string;
    currentFiles?: { path: string; contents: string }[];
    sandboxId?: string;
    previewUrl?: string;
  }) => {
    // Abort any existing stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState("generating");
    setError(null);

    (async () => {
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Generation failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6));
                handleEvent(eventType, data);
              } catch {
                // Malformed JSON — skip
              }
              eventType = "";
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setState("error");
          setError((err as Error).message);
        }
      }
    })();

    function handleEvent(type: string, data: any) {
      switch (type) {
        case "file_complete":
          setFiles((prev) => {
            const idx = prev.findIndex((f) => f.path === data.path);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { path: data.path, contents: data.contents };
              return updated;
            }
            return [...prev, { path: data.path, contents: data.contents }];
          });
          break;
        case "file_delta":
          setFiles((prev) => {
            const idx = prev.findIndex((f) => f.path === data.path);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], partial: data.partial };
              return updated;
            }
            return [...prev, { path: data.path, contents: "", partial: data.partial }];
          });
          break;
        case "blueprint":
          setBlueprint(data.data);
          break;
        case "status":
          if (data.status === "live") setState("live");
          break;
        case "error":
          setState("error");
          setError(data.message);
          break;
        case "done":
          setState("live");
          break;
      }
    }
  }, []);

  return { state, files, blueprint, error, generate };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/builder/hooks/__tests__/use-streaming.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/hooks/use-streaming.ts src/features/builder/hooks/__tests__/use-streaming.test.ts
git commit -m "feat: add useStreaming hook — SSE client for generate API"
```

---

## Task 10: Rewrite Builder Page — Streaming Integration

**Files:**
- Rewrite: `src/features/builder/components/builder-page.tsx:1-90`
- Rewrite: `src/features/builder/hooks/use-session.ts:1-27`
- Test: Update `src/features/builder/components/__tests__/builder-page.test.tsx`

- [ ] **Step 1: Simplify use-session.ts**

Remove `useSessionPhases` and `useBlueprint` (tables deleted). Keep `useSession`, `useSessionMessages`, `useSessionFiles`.

```typescript
// src/features/builder/hooks/use-session.ts
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export function useSession(sessionId: Id<"sessions"> | null) {
  return useQuery(api.sessions.get, sessionId ? { sessionId } : "skip");
}

export function useSessionMessages(sessionId: Id<"sessions"> | null) {
  return useQuery(api.messages.list, sessionId ? { sessionId } : "skip");
}

export function useSessionFiles(sessionId: Id<"sessions"> | null) {
  return useQuery(api.generated_files.list, sessionId ? { sessionId } : "skip");
}
```

- [ ] **Step 2: Rewrite builder-page.tsx**

Remove PhaseTimeline import/usage. Add useStreaming hook. Sandbox creation is handled server-side by the generate route (it creates the sandbox in parallel with the LLM call if no sandboxId is provided). The client just sends the request and listens for SSE events.

```tsx
"use client";
import { useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSession, useSessionFiles } from "../hooks/use-session";
import { useStreaming } from "../hooks/use-streaming";
import { ChatPanel } from "./chat-panel";
import { CodePanel } from "./code-panel";
import { PreviewPanel } from "./preview-panel";

function BuilderPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSessionId = searchParams.get("session") as Id<"sessions"> | null;
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(initialSessionId);
  const session = useSession(sessionId);
  const persistedFiles = useSessionFiles(sessionId);
  const createSession = useMutation(api.sessions.create);
  const streaming = useStreaming();

  const handleSubmit = useCallback(async (prompt: string) => {
    // Create session if new
    let sid = sessionId;
    if (!sid) {
      sid = await createSession({ title: "New App", query: prompt });
      setSessionId(sid);
      router.replace(`/builder?session=${sid}`);
    }

    const currentFiles = persistedFiles?.map((f) => ({ path: f.path, contents: f.contents })) ?? [];

    // Generate route handles sandbox creation server-side if sandboxId is not provided
    // On iterations, session.sandboxId is already set from the first generation
    streaming.generate({
      sessionId: sid,
      prompt,
      currentFiles,
      sandboxId: session?.sandboxId ?? undefined,
      previewUrl: session?.previewUrl ?? undefined,
    });
  }, [sessionId, session, persistedFiles, createSession, router, streaming]);

  // previewUrl comes from Convex (set by generate route's setLive mutation)
  const previewUrl = session?.previewUrl ?? null;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-surface">
      <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
        <ResizablePanel defaultSize={30} minSize={20}>
          <ChatPanel
            sessionId={sessionId}
            session={session}
            streamingState={streaming.state}
            blueprint={streaming.blueprint}
            onSubmit={handleSubmit}
          />
        </ResizablePanel>
        <ResizableHandle className="w-px bg-outline-variant/20" />
        <ResizablePanel defaultSize={35} minSize={20}>
          <CodePanel
            files={streaming.files}
            persistedFiles={persistedFiles ?? []}
            streamingState={streaming.state}
          />
        </ResizablePanel>
        <ResizableHandle className="w-px bg-outline-variant/20" />
        <ResizablePanel defaultSize={35} minSize={20}>
          <PreviewPanel previewUrl={previewUrl} streamingState={streaming.state} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export function BuilderPage() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-64px)] items-center justify-center bg-surface">Loading...</div>}>
      <BuilderPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: Update builder-page test**

Update `src/features/builder/components/__tests__/builder-page.test.tsx` to remove PhaseTimeline assertions and add streaming state tests.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/builder/`
Expected: All builder tests pass

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/
git commit -m "feat: rewrite builder page with streaming integration — no phases, no approval gate"
```

---

## Task 11: Rewrite Preview Panel — Direct Iframe

**Files:**
- Rewrite: `src/features/builder/components/preview-panel.tsx`
- Test: Update `src/features/builder/components/__tests__/preview-panel.test.tsx`

- [ ] **Step 1: Rewrite preview-panel.tsx**

Remove the entire URL probing/retry mechanism. Replace with direct iframe that renders when `previewUrl` is available. Keep the device toggle.

Key changes:
- Remove `testAvailability`, `loadWithRetry`, `getRetryDelay`, `MAX_RETRIES`
- Remove `LoadStatus` type — just use `streamingState` prop
- Render iframe directly with `src={previewUrl}` when available
- Show generating spinner when `streamingState === "generating"`
- Show empty state when no previewUrl and idle

- [ ] **Step 2: Update preview-panel test**

Remove retry-related test cases. Add tests for direct iframe rendering.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/builder/components/__tests__/preview-panel.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/components/preview-panel.tsx src/features/builder/components/__tests__/preview-panel.test.tsx
git commit -m "feat: simplify preview panel — direct iframe, no URL probing"
```

---

## Task 12: Rewrite Chat Panel — Streaming Status + Blueprint Info Card

**Files:**
- Rewrite: `src/features/builder/components/chat-panel.tsx`
- Rewrite: `src/features/builder/components/blueprint-card.tsx`
- Test: Update chat panel tests

- [ ] **Step 1: Rewrite blueprint-card.tsx as informational (no approval buttons)**

The blueprint card now displays therapy context (goal, target skill, age range, interaction model) without "Looks Good" / "Request Changes" buttons.

- [ ] **Step 2: Update chat-panel.tsx**

- Accept new props: `streamingState`, `blueprint`
- Remove phase-based progress messages
- Show simple status: "Generating..." → "Writing App.tsx..." → "Live"
- Show blueprint card inline in chat when `blueprint` prop arrives
- Keep chat input for follow-up iterations

- [ ] **Step 3: Update chat-panel test**

Run: `npx vitest run src/features/builder/components/__tests__/chat-panel.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/components/chat-panel.tsx src/features/builder/components/blueprint-card.tsx src/features/builder/components/__tests__/chat-panel.test.tsx
git commit -m "feat: streaming status in chat panel, blueprint as info card"
```

---

## Task 13: Rewrite Code Panel — Live Streaming Display

**Files:**
- Rewrite: `src/features/builder/components/code-panel.tsx`
- Test: Update code panel tests

- [ ] **Step 1: Rewrite code-panel.tsx**

- Accept new props: `files` (from streaming), `persistedFiles` (from Convex), `streamingState`
- Show file tabs (one per file path)
- Display code with syntax highlighting (use existing or add a lightweight highlighter)
- During streaming: show live code as it arrives via `partial` field
- After streaming: show complete code from `contents` field

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/features/builder/components/__tests__/code-panel.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/builder/components/code-panel.tsx src/features/builder/components/__tests__/code-panel.test.tsx
git commit -m "feat: live streaming code display in code panel"
```

---

## Task 14: Integration Test — Full Flow Smoke Test

**Files:**
- Test: `src/features/builder/__tests__/integration.test.ts` (new)

- [ ] **Step 1: Write integration smoke test**

Test the full flow with mocked Anthropic SDK and E2B:
1. Create session via Convex mutation
2. POST to /api/generate with mock
3. Verify SSE events received
4. Verify files persisted to Convex
5. Verify session state transitions: idle → generating → live

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass. Any failures from old pipeline references should have been caught in earlier tasks.

- [ ] **Step 3: Run Convex deploy check**

Run: `npx convex dev --once`
Expected: Schema deploys successfully with no errors about missing tables or broken function references.

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/__tests__/integration.test.ts
git commit -m "test: add integration smoke test for streaming builder flow"
```

---

## Task 15: Final Cleanup + Verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 2: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: No type errors

- [ ] **Step 3: Verify Convex functions deploy**

```bash
npx convex dev --once
```

Expected: Clean deployment

- [ ] **Step 4: Manual E2E verification**

Start the dev server (`npm run dev`) and test:
1. Navigate to /builder
2. Type a prompt: "Token board for counting to 10 with star stickers"
3. Verify: code starts streaming in <2s
4. Verify: preview appears in <8s
5. Verify: blueprint card appears in chat
6. Type a follow-up: "Make the stars golden"
7. Verify: preview updates in <6s

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "refactor: streaming builder complete — 100X faster generation pipeline"
```
