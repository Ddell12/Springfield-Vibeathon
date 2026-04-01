# Config-Driven Template Engine — Phase 1 + AI Assist

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the WAB/code-gen builder with a config-driven template engine: SLPs pick a template, optionally ask Claude to generate a structured config from plain-language input, edit the pre-filled form with live preview, and publish to a public share link at `/apps/[shareToken]`.

**Architecture:** Template types are self-contained modules (Zod schema + Editor form + Runtime renderer) registered in a central registry. Configs are JSON strings stored in Convex. The runtime page renders from config directly — no bundling, no iframes. AI assist fills config fields (not code) via a Convex action using Claude Haiku with structured output validated against the template's Zod schema.

**Tech Stack:** Next.js 16 App Router, Convex, Zod, nanoid, Vitest + convex-test, ElevenLabs TTS (reused from existing `convex/aiActions.ts`), Anthropic SDK

---

**Scope:** Phase 1 foundation + Phase 2 AI assist. This plan produces a working end-to-end flow: build → publish → share → render. Phase 3 (remaining 4 templates, `tool_events` analytics, parent portal wiring, tool duplication) is a separate follow-on plan. The 4 remaining templates (First/Then Board, Token Board, Visual Schedule, Matching Game) each follow the same 3-file pattern as the AAC Board in Tasks 3/5/6 — create schema.ts + editor.tsx + runtime.tsx and add to registry.

---

## File Map

**New files:**
- `convex/tools.ts` — CRUD for app_instances: create, update, publish, get, list, logEvent
- `convex/tools_ai.ts` — AI config generation action ("use node", calls Claude Haiku)
- `convex/lib/template_schema_descriptions.ts` — plain-text schema descriptions for AI prompting
- `convex/__tests__/tools.test.ts` — convex-test coverage
- `src/features/tools/lib/registry.ts` — templateType → { schema, Editor, Runtime, meta } map
- `src/features/tools/lib/templates/aac-board/schema.ts` — Zod config schema
- `src/features/tools/lib/templates/aac-board/editor.tsx` — SLP-facing form
- `src/features/tools/lib/templates/aac-board/runtime.tsx` — child-facing app
- `src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts`
- `src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx`
- `src/features/tools/lib/templates/aac-board/__tests__/editor.test.tsx`
- `src/features/tools/hooks/use-tool-builder.ts` — wizard state, draft autosave, publish
- `src/features/tools/hooks/use-ai-config-assist.ts` — AI assist call + loading/error state
- `src/features/tools/hooks/__tests__/use-tool-builder.test.ts`
- `src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts`
- `src/features/tools/components/builder/template-picker.tsx`
- `src/features/tools/components/builder/config-editor.tsx`
- `src/features/tools/components/builder/preview-panel.tsx`
- `src/features/tools/components/builder/ai-assist-panel.tsx`
- `src/features/tools/components/builder/publish-panel.tsx`
- `src/features/tools/components/builder/__tests__/template-picker.test.tsx`
- `src/features/tools/components/runtime/tool-runtime-page.tsx`
- `src/app/(app)/tools/new/page.tsx` — builder wizard entry
- `src/app/apps/[shareToken]/page.tsx` — public runtime (no auth required)

**Modified files:**
- `convex/schema.ts` — add 3 new tables
- `src/proxy.ts` — add `/apps/(.*)` to public route exclusion
- `src/app/(app)/builder/page.tsx` — redirect to /tools/new
- `src/features/dashboard/components/dashboard-sidebar.tsx` — update `/builder` → `/tools/new`
- `vitest.config.ts` — add new AI exclusions, remove stale builder/publish exclusions

**Deleted files:**
- `src/app/api/generate/` (entire directory)
- `src/features/builder/` (entire directory)
- `convex/publish.ts`

---

## Task 1: Add Convex tables to schema

**Files:**
- Modify: `convex/schema.ts`

No unit test needed — schema changes are declarative; downstream tests in Task 2 exercise the tables.

- [ ] **Step 1: Add three new tables to convex/schema.ts**

Open `convex/schema.ts`. After the `caregiverLinks` table definition, add:

```ts
  app_instances: defineTable({
    templateType: v.string(),
    title: v.string(),
    patientId: v.id("patients"),
    slpUserId: v.string(),
    configJson: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    version: v.number(),
    shareToken: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
  })
    .index("by_slpUserId", ["slpUserId"])
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
    patientId: v.id("patients"),
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
  })
    .index("by_appInstanceId", ["appInstanceId"])
    .index("by_patientId", ["patientId"]),
```

- [ ] **Step 2: Verify schema compiles**

```bash
npx convex dev --once 2>&1 | tail -5
```
Expected: exits cleanly, no schema errors.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(tools): add app_instances, published_app_versions, tool_events tables"
```

---

## Task 2: convex/tools.ts — CRUD mutations and queries

**Files:**
- Create: `convex/tools.ts`
- Create: `convex/__tests__/tools.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `convex/__tests__/tools.test.ts`:

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };

const PATIENT_FIELDS = {
  slpUserId: "slp-user-123",
  firstName: "Liam",
  lastName: "Smith",
  dateOfBirth: "2018-01-01",
  diagnosis: "aac-complex" as const,
  status: "active" as const,
};

const SAMPLE_CONFIG = JSON.stringify({
  title: "Snack Requests",
  gridCols: 3,
  gridRows: 2,
  buttons: [{ id: "1", label: "Crackers", speakText: "I want crackers" }],
  showTextLabels: true,
  autoSpeak: true,
  voice: "child-friendly",
  highContrast: false,
});

async function createPatient(t: ReturnType<typeof convexTest>) {
  return t.mutation(api.patients.create, PATIENT_FIELDS);
}

describe("tools", () => {
  it("creates a draft app instance", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);

    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });

    const instance = await t.query(api.tools.get, { id });
    expect(instance).not.toBeNull();
    expect(instance?.title).toBe("Snack Board");
    expect(instance?.status).toBe("draft");
    expect(instance?.version).toBe(1);
    expect(instance?.slpUserId).toBe("slp-user-123");
  });

  it("updates configJson", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    const updated = JSON.stringify({ ...JSON.parse(SAMPLE_CONFIG), title: "Drink Board" });
    await t.mutation(api.tools.update, { id, configJson: updated });
    const instance = await t.query(api.tools.get, { id });
    expect(instance?.configJson).toBe(updated);
  });

  it("publish creates version snapshot and sets shareToken", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    const { shareToken } = await t.mutation(api.tools.publish, { id });
    expect(typeof shareToken).toBe("string");
    expect(shareToken.length).toBeGreaterThan(10);
    const instance = await t.query(api.tools.get, { id });
    expect(instance?.status).toBe("published");
    expect(instance?.shareToken).toBe(shareToken);
  });

  it("getByShareToken returns instance and configJson from published snapshot", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Snack Board",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    const { shareToken } = await t.mutation(api.tools.publish, { id });
    const result = await t.query(api.tools.getByShareToken, { shareToken });
    expect(result).not.toBeNull();
    expect(result?.instance.title).toBe("Snack Board");
    expect(result?.configJson).toBe(SAMPLE_CONFIG);
  });

  it("getByShareToken returns null for unknown token", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const result = await t.query(api.tools.getByShareToken, { shareToken: "bogus-token" });
    expect(result).toBeNull();
  });

  it("listBySLP returns only the authenticated user's instances", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Board A",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    const list = await t.query(api.tools.listBySLP, {});
    expect(list.length).toBe(1);
    expect(list[0].slpUserId).toBe("slp-user-123");
  });

  it("listByPatient returns instances for that patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatient(t);
    await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Board A",
      patientId,
      configJson: SAMPLE_CONFIG,
    });
    const list = await t.query(api.tools.listByPatient, { patientId });
    expect(list.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx vitest run convex/__tests__/tools.test.ts 2>&1 | tail -10
```
Expected: FAIL — `api.tools` not defined.

- [ ] **Step 3: Implement convex/tools.ts**

Create `convex/tools.ts`:

```ts
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    templateType: v.string(),
    title: v.string(),
    patientId: v.id("patients"),
    configJson: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    return ctx.db.insert("app_instances", {
      templateType: args.templateType,
      title: args.title,
      patientId: args.patientId,
      slpUserId: identity.subject,
      configJson: args.configJson,
      status: "draft",
      version: 1,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("app_instances"),
    configJson: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const instance = await ctx.db.get(args.id);
    if (!instance) throw new Error("Not found");
    if (instance.slpUserId !== identity.subject) throw new Error("Forbidden");

    await ctx.db.patch(args.id, {
      configJson: args.configJson,
      ...(args.title !== undefined ? { title: args.title } : {}),
    });
  },
});

export const publish = mutation({
  args: { id: v.id("app_instances") },
  handler: async (ctx, args): Promise<{ shareToken: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const instance = await ctx.db.get(args.id);
    if (!instance) throw new Error("Not found");
    if (instance.slpUserId !== identity.subject) throw new Error("Forbidden");

    const shareToken = crypto.randomUUID();
    const now = Date.now();

    await ctx.db.insert("published_app_versions", {
      appInstanceId: args.id,
      version: instance.version,
      configJson: instance.configJson,
      publishedAt: now,
    });

    await ctx.db.patch(args.id, {
      status: "published",
      shareToken,
      publishedAt: now,
      version: instance.version + 1,
    });

    return { shareToken };
  },
});

export const get = query({
  args: { id: v.id("app_instances") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const getByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const instance = await ctx.db
      .query("app_instances")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
      .first();
    if (!instance) return null;

    const published = await ctx.db
      .query("published_app_versions")
      .withIndex("by_appInstanceId", (q) => q.eq("appInstanceId", instance._id))
      .order("desc")
      .first();
    if (!published) return null;

    return { instance, configJson: published.configJson };
  },
});

export const listBySLP = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("app_instances")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", identity.subject))
      .collect();
  },
});

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) =>
    ctx.db
      .query("app_instances")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect(),
});

export const logEvent = mutation({
  args: {
    shareToken: v.string(),
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
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db
      .query("app_instances")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
      .first();
    if (!instance) return; // silently ignore invalid share tokens

    await ctx.db.insert("tool_events", {
      appInstanceId: instance._id,
      patientId: instance.patientId,
      eventType: args.eventType,
      eventPayloadJson: args.eventPayloadJson,
    });
  },
});
```

- [ ] **Step 4: Run — verify passes**

```bash
npx vitest run convex/__tests__/tools.test.ts 2>&1 | tail -15
```
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/tools.ts convex/__tests__/tools.test.ts
git commit -m "feat(tools): app_instances CRUD — create, update, publish, listBySLP, listByPatient, logEvent"
```

---

## Task 3: AAC Board Zod schema

**Files:**
- Create: `src/features/tools/lib/templates/aac-board/schema.ts`
- Create: `src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { AACBoardConfigSchema } from "../schema";

const validConfig = {
  title: "Snack Requests",
  gridCols: 3,
  gridRows: 2,
  buttons: [
    { id: "1", label: "Crackers", speakText: "I want crackers" },
    { id: "2", label: "Drink", speakText: "I want a drink" },
  ],
  showTextLabels: true,
  autoSpeak: true,
  voice: "child-friendly" as const,
  highContrast: false,
};

describe("AACBoardConfigSchema", () => {
  it("accepts a valid config", () => {
    expect(AACBoardConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it("rejects empty buttons array", () => {
    expect(
      AACBoardConfigSchema.safeParse({ ...validConfig, buttons: [] }).success
    ).toBe(false);
  });

  it("rejects gridCols above 6", () => {
    expect(
      AACBoardConfigSchema.safeParse({ ...validConfig, gridCols: 7 }).success
    ).toBe(false);
  });

  it("rejects a button with empty label", () => {
    expect(
      AACBoardConfigSchema.safeParse({
        ...validConfig,
        buttons: [{ id: "1", label: "", speakText: "say something" }],
      }).success
    ).toBe(false);
  });

  it("strips unknown top-level fields", () => {
    const result = AACBoardConfigSchema.safeParse({
      ...validConfig,
      unknownField: "should be stripped",
    });
    expect(result.success).toBe(true);
    if (result.success) expect("unknownField" in result.data).toBe(false);
  });

  it("applies defaults when optional fields are omitted", () => {
    const minimal = {
      title: "Board",
      buttons: [{ id: "1", label: "Yes", speakText: "Yes" }],
    };
    const result = AACBoardConfigSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gridCols).toBe(3);
      expect(result.data.voice).toBe("child-friendly");
      expect(result.data.showTextLabels).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts 2>&1 | tail -5
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the schema**

Create `src/features/tools/lib/templates/aac-board/schema.ts`:

```ts
import { z } from "zod";

export const AACButtonSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(50),
  speakText: z.string().min(1).max(200),
  imageUrl: z.string().url().optional(),
  backgroundColor: z.string().optional(),
});

export const AACBoardConfigSchema = z.object({
  title: z.string().min(1).max(100),
  gridCols: z.number().int().min(2).max(6).default(3),
  gridRows: z.number().int().min(1).max(4).default(2),
  buttons: z.array(AACButtonSchema).min(1).max(24),
  showTextLabels: z.boolean().default(true),
  autoSpeak: z.boolean().default(true),
  voice: z.enum(["child-friendly", "warm-female", "calm-male"]).default("child-friendly"),
  highContrast: z.boolean().default(false),
});

export type AACBoardConfig = z.infer<typeof AACBoardConfigSchema>;
export type AACButton = z.infer<typeof AACButtonSchema>;
```

- [ ] **Step 4: Run — verify passes**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts 2>&1 | tail -5
```
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/lib/templates/aac-board/schema.ts src/features/tools/lib/templates/aac-board/__tests__/schema.test.ts
git commit -m "feat(tools): AAC board Zod config schema"
```

---

## Task 4: Template registry

**Files:**
- Create: `src/features/tools/lib/registry.ts`

No standalone test — the registry is a pure type mapping verified by TypeScript. Tests for Editor/Runtime are in Tasks 5–6.

- [ ] **Step 1: Create the registry**

Create `src/features/tools/lib/registry.ts`:

```ts
import type { ComponentType } from "react";

import { AACBoardEditor } from "./templates/aac-board/editor";
import { AACBoardRuntime } from "./templates/aac-board/runtime";
import { AACBoardConfigSchema, type AACBoardConfig } from "./templates/aac-board/schema";

export interface RuntimeProps<TConfig = unknown> {
  config: TConfig;
  shareToken: string;
  onEvent: (type: string, payloadJson?: string) => void;
}

export interface EditorProps<TConfig = unknown> {
  config: TConfig;
  onChange: (config: TConfig) => void;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  intendedFor: string;
  estimatedSetupMinutes: number;
}

export interface TemplateRegistration {
  meta: TemplateMeta;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Editor: ComponentType<EditorProps<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Runtime: ComponentType<RuntimeProps<any>>;
  defaultConfig: unknown;
  parseConfig: (json: string) => unknown;
}

const DEFAULT_AAC_CONFIG: AACBoardConfig = {
  title: "New Communication Board",
  gridCols: 3,
  gridRows: 2,
  buttons: [
    { id: "1", label: "Yes", speakText: "Yes" },
    { id: "2", label: "No", speakText: "No" },
    { id: "3", label: "Help", speakText: "I need help" },
    { id: "4", label: "More", speakText: "More please" },
    { id: "5", label: "Done", speakText: "I am done" },
    { id: "6", label: "Break", speakText: "I need a break" },
  ],
  showTextLabels: true,
  autoSpeak: true,
  voice: "child-friendly",
  highContrast: false,
};

export const templateRegistry: Record<string, TemplateRegistration> = {
  aac_board: {
    meta: {
      id: "aac_board",
      name: "AAC Communication Board",
      description: "Tappable picture-and-word buttons that speak aloud when pressed.",
      intendedFor: "Children using AAC or building functional communication",
      estimatedSetupMinutes: 5,
    },
    Editor: AACBoardEditor,
    Runtime: AACBoardRuntime,
    defaultConfig: DEFAULT_AAC_CONFIG,
    parseConfig: (json: string) => AACBoardConfigSchema.parse(JSON.parse(json)),
  },
};
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "registry\|features/tools" | head -10
```
Expected: no errors (Editor/Runtime stubs come in Tasks 5–6; if they don't exist yet, create empty barrel exports temporarily).

- [ ] **Step 3: Commit after Tasks 5 and 6** — registry, editor, runtime all committed together in Task 6 Step 5.

---

## Task 5: AAC Board runtime component

**Files:**
- Create: `src/features/tools/lib/templates/aac-board/runtime.tsx`
- Create: `src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock Convex useMutation — runtime calls logEvent but tests verify UI only
vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
vi.mock("@convex/_generated/api", () => ({ api: { tools: { logEvent: "tools:logEvent" } } }));

import { AACBoardRuntime } from "../runtime";
import type { AACBoardConfig } from "../schema";

const mockOnEvent = vi.fn();

const mockConfig: AACBoardConfig = {
  title: "Snack Board",
  gridCols: 3,
  gridRows: 2,
  buttons: [
    { id: "1", label: "Crackers", speakText: "I want crackers" },
    { id: "2", label: "Drink", speakText: "I want a drink" },
  ],
  showTextLabels: true,
  autoSpeak: false, // disable in tests — avoids speechSynthesis calls
  voice: "child-friendly",
  highContrast: false,
};

describe("AACBoardRuntime", () => {
  it("renders all button labels", () => {
    render(
      <AACBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByText("Crackers")).toBeInTheDocument();
    expect(screen.getByText("Drink")).toBeInTheDocument();
  });

  it("fires item_tapped event when a button is pressed", () => {
    mockOnEvent.mockClear();
    render(
      <AACBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getByText("Crackers"));
    expect(mockOnEvent).toHaveBeenCalledWith("item_tapped", expect.any(String));
  });

  it("hides labels when showTextLabels is false", () => {
    render(
      <AACBoardRuntime
        config={{ ...mockConfig, showTextLabels: false }}
        shareToken="tok"
        onEvent={mockOnEvent}
      />
    );
    expect(screen.queryByText("Crackers")).not.toBeInTheDocument();
  });

  it("applies high-contrast class when highContrast is true", () => {
    const { container } = render(
      <AACBoardRuntime
        config={{ ...mockConfig, highContrast: true }}
        shareToken="tok"
        onEvent={mockOnEvent}
      />
    );
    expect(container.firstChild).toHaveClass("high-contrast");
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx 2>&1 | tail -5
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the runtime**

Create `src/features/tools/lib/templates/aac-board/runtime.tsx`:

```tsx
"use client";

import { useMutation } from "convex/react";
import { useCallback, useEffect } from "react";

import { api } from "@convex/_generated/api";
import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import type { AACBoardConfig } from "./schema";

export function AACBoardRuntime({
  config,
  shareToken,
  onEvent,
}: RuntimeProps<AACBoardConfig>) {
  const logEvent = useMutation(api.tools.logEvent);

  useEffect(() => {
    if (shareToken !== "preview") {
      void logEvent({ shareToken, eventType: "app_opened" });
    }
    onEvent("app_opened");
  }, [shareToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleButtonPress = useCallback(
    (buttonId: string, label: string, speakText: string) => {
      const payloadJson = JSON.stringify({ buttonId, label });
      if (shareToken !== "preview") {
        void logEvent({ shareToken, eventType: "item_tapped", eventPayloadJson: payloadJson });
      }
      onEvent("item_tapped", payloadJson);

      if (config.autoSpeak && typeof window !== "undefined") {
        const utterance = new SpeechSynthesisUtterance(speakText);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    },
    [config.autoSpeak, logEvent, shareToken, onEvent]
  );

  return (
    <div
      className={cn(
        "min-h-screen bg-background p-4 flex flex-col gap-4",
        config.highContrast && "high-contrast bg-black"
      )}
    >
      <h1
        className={cn(
          "text-center font-display text-2xl font-semibold",
          config.highContrast ? "text-white" : "text-foreground"
        )}
      >
        {config.title}
      </h1>

      <div
        className="grid gap-3 flex-1"
        style={{ gridTemplateColumns: `repeat(${config.gridCols}, minmax(0, 1fr))` }}
      >
        {config.buttons.map((button) => (
          <button
            key={button.id}
            onClick={() =>
              handleButtonPress(button.id, button.label, button.speakText)
            }
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl p-4",
              "min-h-[120px] touch-manipulation select-none",
              "transition-all duration-150 active:scale-95",
              config.highContrast
                ? "bg-yellow-400 text-black border-4 border-white"
                : "bg-primary/10 hover:bg-primary/20 text-foreground border-2 border-border"
            )}
            style={
              button.backgroundColor ? { backgroundColor: button.backgroundColor } : {}
            }
            aria-label={button.speakText}
          >
            {button.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={button.imageUrl}
                alt={button.label}
                className="w-16 h-16 object-cover rounded-xl"
              />
            )}
            {config.showTextLabels && (
              <span className="text-sm font-medium text-center leading-tight">
                {button.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx 2>&1 | tail -8
```
Expected: 4 tests pass.

---

## Task 6: AAC Board editor component

**Files:**
- Create: `src/features/tools/lib/templates/aac-board/editor.tsx`
- Create: `src/features/tools/lib/templates/aac-board/__tests__/editor.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/tools/lib/templates/aac-board/__tests__/editor.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AACBoardEditor } from "../editor";
import type { AACBoardConfig } from "../schema";

const mockOnChange = vi.fn();

const baseConfig: AACBoardConfig = {
  title: "Snack Board",
  gridCols: 3,
  gridRows: 2,
  buttons: [{ id: "1", label: "Crackers", speakText: "I want crackers" }],
  showTextLabels: true,
  autoSpeak: true,
  voice: "child-friendly",
  highContrast: false,
};

describe("AACBoardEditor", () => {
  it("renders the title input with current value", () => {
    render(<AACBoardEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("Snack Board")).toBeInTheDocument();
  });

  it("calls onChange with updated title when title input changes", () => {
    mockOnChange.mockClear();
    render(<AACBoardEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.change(screen.getByDisplayValue("Snack Board"), {
      target: { value: "Drink Board" },
    });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Drink Board" })
    );
  });

  it("renders existing button label inputs", () => {
    render(<AACBoardEditor config={baseConfig} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("Crackers")).toBeInTheDocument();
  });

  it("calls onChange with new button appended when Add button is clicked", () => {
    mockOnChange.mockClear();
    render(<AACBoardEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add button/i }));
    const call = mockOnChange.mock.calls[0][0] as AACBoardConfig;
    expect(call.buttons.length).toBe(2);
  });

  it("calls onChange with button removed when Remove is clicked", () => {
    mockOnChange.mockClear();
    render(<AACBoardEditor config={baseConfig} onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    const call = mockOnChange.mock.calls[0][0] as AACBoardConfig;
    expect(call.buttons.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/__tests__/editor.test.tsx 2>&1 | tail -5
```

- [ ] **Step 3: Check nanoid is installed**

```bash
grep '"nanoid"' /Users/desha/Springfield-Vibeathon/package.json
```

If not present, install it:
```bash
npm install nanoid
```

- [ ] **Step 4: Implement the editor**

Create `src/features/tools/lib/templates/aac-board/editor.tsx`:

```tsx
"use client";

import { nanoid } from "nanoid";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import type { EditorProps } from "../../registry";
import type { AACBoardConfig, AACButton } from "./schema";

export function AACBoardEditor({ config, onChange }: EditorProps<AACBoardConfig>) {
  const set = <K extends keyof AACBoardConfig>(key: K, value: AACBoardConfig[K]) =>
    onChange({ ...config, [key]: value });

  const updateButton = (id: string, patch: Partial<AACButton>) =>
    onChange({
      ...config,
      buttons: config.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });

  const addButton = () =>
    onChange({
      ...config,
      buttons: [
        ...config.buttons,
        { id: nanoid(), label: "New Button", speakText: "New Button" },
      ],
    });

  const removeButton = (id: string) =>
    onChange({ ...config, buttons: config.buttons.filter((b) => b.id !== id) });

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="board-title">Board title</Label>
        <Input
          id="board-title"
          value={config.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Snack Requests"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grid-cols">Columns</Label>
          <Select
            value={String(config.gridCols)}
            onValueChange={(v) => set("gridCols", Number(v))}
          >
            <SelectTrigger id="grid-cols"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5, 6].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grid-rows">Rows</Label>
          <Select
            value={String(config.gridRows)}
            onValueChange={(v) => set("gridRows", Number(v))}
          >
            <SelectTrigger id="grid-rows"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-labels">Show text labels</Label>
          <Switch id="show-labels" checked={config.showTextLabels}
            onCheckedChange={(v) => set("showTextLabels", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-speak">Speak on tap</Label>
          <Switch id="auto-speak" checked={config.autoSpeak}
            onCheckedChange={(v) => set("autoSpeak", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="high-contrast">High contrast</Label>
          <Switch id="high-contrast" checked={config.highContrast}
            onCheckedChange={(v) => set("highContrast", v)} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Buttons ({config.buttons.length})</Label>
          <Button variant="outline" size="sm" onClick={addButton}>
            Add button
          </Button>
        </div>

        {config.buttons.map((button, i) => (
          <div key={button.id} className="border border-border rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Button {i + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Remove button"
                onClick={() => removeButton(button.id)}
                className="h-6 text-muted-foreground hover:text-destructive"
              >
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={button.label}
                  onChange={(e) => updateButton(button.id, { label: e.target.value })}
                  placeholder="e.g. Crackers"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Spoken phrase</Label>
                <Input
                  value={button.speakText}
                  onChange={(e) => updateButton(button.id, { speakText: e.target.value })}
                  placeholder="e.g. I want crackers"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run — verify passes**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/__tests__/editor.test.tsx 2>&1 | tail -8
```
Expected: 5 tests pass.

- [ ] **Step 6: Commit registry + all AAC Board files**

```bash
git add src/features/tools/
git commit -m "feat(tools): template registry, AAC board schema/editor/runtime with tests"
```

---

## Task 7: Builder wizard hook — use-tool-builder.ts

**Files:**
- Create: `src/features/tools/hooks/use-tool-builder.ts`
- Create: `src/features/tools/hooks/__tests__/use-tool-builder.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/tools/hooks/__tests__/use-tool-builder.test.ts`:

```ts
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue({ id: "inst-1", shareToken: "tok-abc" })),
}));
vi.mock("@convex/_generated/api", () => ({
  api: {
    tools: {
      create: "tools:create",
      update: "tools:update",
      publish: "tools:publish",
    },
  },
}));

import { useToolBuilder } from "../use-tool-builder";

describe("useToolBuilder", () => {
  it("starts on step 1", () => {
    const { result } = renderHook(() => useToolBuilder());
    expect(result.current.step).toBe(1);
  });

  it("advances step when nextStep is called", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.nextStep());
    expect(result.current.step).toBe(2);
  });

  it("cannot advance past step 4", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => { for (let i = 0; i < 10; i++) result.current.nextStep(); });
    expect(result.current.step).toBeLessThanOrEqual(4);
  });

  it("goes back one step when prevStep is called", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.nextStep());
    act(() => result.current.prevStep());
    expect(result.current.step).toBe(1);
  });

  it("stores patientId after selectPatient", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.selectPatient("patient-123" as never));
    expect(result.current.patientId).toBe("patient-123");
  });

  it("stores templateType and default config after selectTemplate", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.selectTemplate("aac_board"));
    expect(result.current.templateType).toBe("aac_board");
    expect(result.current.config).not.toBeNull();
  });

  it("updates config when updateConfig is called", () => {
    const { result } = renderHook(() => useToolBuilder());
    const newConfig = { title: "Updated" };
    act(() => result.current.updateConfig(newConfig));
    expect(result.current.config).toEqual(newConfig);
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx vitest run src/features/tools/hooks/__tests__/use-tool-builder.test.ts 2>&1 | tail -5
```

- [ ] **Step 3: Implement the hook**

Create `src/features/tools/hooks/use-tool-builder.ts`:

```ts
"use client";

import { useMutation } from "convex/react";
import { useCallback, useRef, useState } from "react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

import { templateRegistry } from "../lib/registry";

export type WizardStep = 1 | 2 | 3 | 4;

interface BuilderState {
  step: WizardStep;
  patientId: Id<"patients"> | null;
  templateType: string | null;
  config: unknown;
  instanceId: Id<"app_instances"> | null;
  publishedShareToken: string | null;
  isSaving: boolean;
}

export function useToolBuilder() {
  const [state, setState] = useState<BuilderState>({
    step: 1,
    patientId: null,
    templateType: null,
    config: null,
    instanceId: null,
    publishedShareToken: null,
    isSaving: false,
  });

  const createInstance = useMutation(api.tools.create);
  const updateInstance = useMutation(api.tools.update);
  const publishInstance = useMutation(api.tools.publish);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectPatient = useCallback(
    (patientId: Id<"patients">) => setState((s) => ({ ...s, patientId })),
    []
  );

  const selectTemplate = useCallback((templateType: string) => {
    const reg = templateRegistry[templateType];
    setState((s) => ({
      ...s,
      templateType,
      config: reg?.defaultConfig ?? null,
    }));
  }, []);

  const nextStep = useCallback(
    () => setState((s) => ({ ...s, step: Math.min(4, s.step + 1) as WizardStep })),
    []
  );

  const prevStep = useCallback(
    () => setState((s) => ({ ...s, step: Math.max(1, s.step - 1) as WizardStep })),
    []
  );

  const updateConfig = useCallback(
    (config: unknown) => {
      setState((s) => ({ ...s, config }));

      // Debounced autosave — fires 1.5s after last edit if instance already exists
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setState((s) => {
          if (!s.instanceId) return s;
          void updateInstance({ id: s.instanceId, configJson: JSON.stringify(config) });
          return s;
        });
      }, 1500);
    },
    [updateInstance]
  );

  const saveAndAdvance = useCallback(async () => {
    const { patientId, templateType, config, instanceId } = state;
    if (!patientId || !templateType || !config) return;

    setState((s) => ({ ...s, isSaving: true }));
    try {
      if (!instanceId) {
        const id = await createInstance({
          templateType,
          title: (config as { title?: string }).title ?? "Untitled",
          patientId,
          configJson: JSON.stringify(config),
        });
        setState((s) => ({ ...s, instanceId: id as Id<"app_instances">, isSaving: false }));
      } else {
        await updateInstance({
          id: instanceId,
          configJson: JSON.stringify(config),
          title: (config as { title?: string }).title,
        });
        setState((s) => ({ ...s, isSaving: false }));
      }
    } catch {
      setState((s) => ({ ...s, isSaving: false }));
    }
  }, [state, createInstance, updateInstance]);

  const publish = useCallback(async (): Promise<string | null> => {
    const { instanceId } = state;
    if (!instanceId) return null;

    setState((s) => ({ ...s, isSaving: true }));
    try {
      const { shareToken } = await publishInstance({ id: instanceId });
      setState((s) => ({ ...s, publishedShareToken: shareToken, isSaving: false }));
      return shareToken;
    } catch {
      setState((s) => ({ ...s, isSaving: false }));
      return null;
    }
  }, [state, publishInstance]);

  return { ...state, selectPatient, selectTemplate, nextStep, prevStep, updateConfig, saveAndAdvance, publish };
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npx vitest run src/features/tools/hooks/__tests__/use-tool-builder.test.ts 2>&1 | tail -8
```
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/hooks/
git commit -m "feat(tools): useToolBuilder wizard hook — step navigation, draft autosave, publish"
```

---

## Task 8: Builder UI components — template-picker, config-editor, preview-panel

**Files:**
- Create: `src/features/tools/components/builder/template-picker.tsx`
- Create: `src/features/tools/components/builder/config-editor.tsx`
- Create: `src/features/tools/components/builder/preview-panel.tsx`
- Create: `src/features/tools/components/builder/__tests__/template-picker.test.tsx`

- [ ] **Step 1: Write the template-picker test**

Create `src/features/tools/components/builder/__tests__/template-picker.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TemplatePicker } from "../template-picker";

const mockOnSelect = vi.fn();

describe("TemplatePicker", () => {
  it("renders the AAC board card", () => {
    render(<TemplatePicker onSelect={mockOnSelect} />);
    expect(screen.getByText("AAC Communication Board")).toBeInTheDocument();
  });

  it("calls onSelect with 'aac_board' when the card is clicked", () => {
    mockOnSelect.mockClear();
    render(<TemplatePicker onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByText("AAC Communication Board"));
    expect(mockOnSelect).toHaveBeenCalledWith("aac_board");
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx vitest run src/features/tools/components/builder/__tests__/template-picker.test.tsx 2>&1 | tail -5
```

- [ ] **Step 3: Implement template-picker.tsx**

Create `src/features/tools/components/builder/template-picker.tsx`:

```tsx
"use client";

import { Clock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

import { templateRegistry } from "../../lib/registry";

interface TemplatePickerProps {
  onSelect: (templateType: string) => void;
}

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.values(templateRegistry).map((t) => (
        <Card
          key={t.meta.id}
          onClick={() => onSelect(t.meta.id)}
          className="cursor-pointer hover:border-primary transition-colors duration-200"
        >
          <CardHeader>
            <CardTitle className="text-base">{t.meta.name}</CardTitle>
            <CardDescription>{t.meta.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">{t.meta.intendedFor}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>~{t.meta.estimatedSetupMinutes} min setup</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npx vitest run src/features/tools/components/builder/__tests__/template-picker.test.tsx 2>&1 | tail -5
```
Expected: 2 tests pass.

- [ ] **Step 5: Implement config-editor.tsx**

Create `src/features/tools/components/builder/config-editor.tsx`:

```tsx
"use client";

import { templateRegistry } from "../../lib/registry";

interface ConfigEditorProps {
  templateType: string;
  config: unknown;
  onChange: (config: unknown) => void;
}

export function ConfigEditor({ templateType, config, onChange }: ConfigEditorProps) {
  const registration = templateRegistry[templateType];
  if (!registration) {
    return <p className="p-4 text-sm text-muted-foreground">Unknown template type.</p>;
  }
  const { Editor } = registration;
  return <Editor config={config} onChange={onChange} />;
}
```

- [ ] **Step 6: Implement preview-panel.tsx**

Create `src/features/tools/components/builder/preview-panel.tsx`:

```tsx
"use client";

import { templateRegistry } from "../../lib/registry";

interface PreviewPanelProps {
  templateType: string;
  config: unknown;
}

const noop = () => undefined;

export function PreviewPanel({ templateType, config }: PreviewPanelProps) {
  const registration = templateRegistry[templateType];
  if (!registration) return null;
  const { Runtime } = registration;
  return (
    <div className="h-full overflow-y-auto bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground text-center mb-3 uppercase tracking-wide">
        Preview — child view
      </p>
      <div className="bg-background rounded-xl overflow-hidden shadow-sm max-w-lg mx-auto">
        <Runtime config={config} shareToken="preview" onEvent={noop} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/features/tools/components/builder/
git commit -m "feat(tools): template-picker, config-editor, preview-panel builder components"
```

---

## Task 9: Builder wizard page (steps 1–4 assembled)

**Files:**
- Create: `src/app/(app)/tools/new/page.tsx`
- Create: `src/features/tools/components/builder/publish-panel.tsx`
- Create: `src/features/tools/components/runtime/tool-runtime-page.tsx`
- Create: `src/app/apps/[shareToken]/page.tsx`
- Modify: `src/proxy.ts`

- [ ] **Step 1: Create publish-panel.tsx**

Create `src/features/tools/components/builder/publish-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

interface PublishPanelProps {
  isSaving: boolean;
  publishedShareToken: string | null;
  onPublish: () => Promise<string | null>;
}

export function PublishPanel({ isSaving, publishedShareToken, onPublish }: PublishPanelProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = publishedShareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/apps/${publishedShareToken}`
    : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 max-w-md mx-auto text-center">
      {!publishedShareToken ? (
        <>
          <h2 className="text-2xl font-display font-semibold">Ready to publish?</h2>
          <p className="text-muted-foreground">
            Publishing creates a shareable link for parents and caregivers.
            No login required to use it.
          </p>
          <Button size="lg" disabled={isSaving} onClick={() => void onPublish()}>
            {isSaving ? "Publishing…" : "Publish tool"}
          </Button>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-semibold">Tool published!</h2>
          <p className="text-muted-foreground">Share this link with the parent or caregiver.</p>
          <div className="w-full bg-muted rounded-lg p-3 flex items-center gap-2">
            <span className="flex-1 text-sm truncate font-mono text-left">{shareUrl}</span>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={shareUrl!} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the builder wizard page**

Create `src/app/(app)/tools/new/page.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { useToolBuilder } from "@/features/tools/hooks/use-tool-builder";
import { AIAssistPanel } from "@/features/tools/components/builder/ai-assist-panel";
import { ConfigEditor } from "@/features/tools/components/builder/config-editor";
import { PreviewPanel } from "@/features/tools/components/builder/preview-panel";
import { PublishPanel } from "@/features/tools/components/builder/publish-panel";
import { TemplatePicker } from "@/features/tools/components/builder/template-picker";
import { templateRegistry } from "@/features/tools/lib/registry";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const STEP_LABELS = ["Choose child", "Choose template", "Customize", "Publish"];

export default function NewToolPage() {
  const builder = useToolBuilder();
  const patients = useQuery(api.patients.list, {}) ?? [];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Step indicator */}
      <div className="border-b border-border bg-background px-6 py-3 shrink-0">
        <div className="flex items-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  i + 1 === builder.step
                    ? "bg-primary text-primary-foreground"
                    : i + 1 < builder.step
                    ? "bg-primary/30 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  i + 1 === builder.step ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Choose child */}
      {builder.step === 1 && (
        <div className="flex flex-col gap-6 p-6 max-w-md mx-auto w-full mt-8">
          <div>
            <h1 className="text-2xl font-display font-semibold">Who is this tool for?</h1>
            <p className="text-muted-foreground mt-1">Choose a child from your caseload.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="patient-select">Child</Label>
            <Select
              value={builder.patientId ?? ""}
              onValueChange={(v) => builder.selectPatient(v as never)}
            >
              <SelectTrigger id="patient-select">
                <SelectValue placeholder="Select a child…" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.firstName} {p.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!builder.patientId} onClick={builder.nextStep}>
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: Choose template */}
      {builder.step === 2 && (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full mt-8">
          <div>
            <h1 className="text-2xl font-display font-semibold">Choose a tool type</h1>
            <p className="text-muted-foreground mt-1">
              Each type has a preset layout and interaction style.
            </p>
          </div>
          <TemplatePicker
            onSelect={(type) => {
              builder.selectTemplate(type);
              builder.nextStep();
            }}
          />
          <Button variant="outline" onClick={builder.prevStep}>Back</Button>
        </div>
      )}

      {/* Step 3: Customize */}
      {builder.step === 3 && builder.templateType && (
        <>
          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/2 overflow-y-auto border-r border-border flex flex-col">
              <div className="p-4 border-b border-border shrink-0">
                <AIAssistPanel
                  templateType={builder.templateType}
                  childProfile={{}}
                  onApply={(configJson) => {
                    const reg = templateRegistry[builder.templateType!];
                    if (reg) builder.updateConfig(reg.parseConfig(configJson));
                  }}
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                <ConfigEditor
                  templateType={builder.templateType}
                  config={builder.config}
                  onChange={builder.updateConfig}
                />
              </div>
            </div>
            <div className="w-1/2 overflow-hidden">
              <PreviewPanel
                templateType={builder.templateType}
                config={builder.config}
              />
            </div>
          </div>
          <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-background shrink-0">
            <Button variant="outline" onClick={builder.prevStep}>Back</Button>
            <Button
              onClick={async () => {
                await builder.saveAndAdvance();
                builder.nextStep();
              }}
              disabled={builder.isSaving}
            >
              {builder.isSaving ? "Saving…" : "Save & Publish →"}
            </Button>
          </div>
        </>
      )}

      {/* Step 4: Publish */}
      {builder.step === 4 && (
        <PublishPanel
          isSaving={builder.isSaving}
          publishedShareToken={builder.publishedShareToken}
          onPublish={builder.publish}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create tool-runtime-page.tsx**

Create `src/features/tools/components/runtime/tool-runtime-page.tsx`:

```tsx
"use client";

import { useMutation } from "convex/react";

import { api } from "@convex/_generated/api";
import { templateRegistry } from "../../lib/registry";

interface ToolRuntimePageProps {
  shareToken: string;
  templateType: string;
  configJson: string;
}

export function ToolRuntimePage({ shareToken, templateType, configJson }: ToolRuntimePageProps) {
  const logEvent = useMutation(api.tools.logEvent);

  const registration = templateRegistry[templateType];
  if (!registration) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Unknown tool type.
      </div>
    );
  }

  const config = registration.parseConfig(configJson);
  const { Runtime } = registration;

  const handleEvent = (eventType: string, payloadJson?: string) => {
    void logEvent({
      shareToken,
      eventType: eventType as Parameters<typeof logEvent>[0]["eventType"],
      eventPayloadJson: payloadJson,
    });
  };

  return <Runtime config={config} shareToken={shareToken} onEvent={handleEvent} />;
}
```

- [ ] **Step 4: Create the public runtime route**

Create `src/app/apps/[shareToken]/page.tsx`:

```tsx
import { fetchQuery } from "convex/nextjs";

import { api } from "@convex/_generated/api";
import { ToolRuntimePage } from "@/features/tools/components/runtime/tool-runtime-page";

interface Props {
  params: Promise<{ shareToken: string }>;
}

export default async function AppRuntimePage({ params }: Props) {
  const { shareToken } = await params;
  const result = await fetchQuery(api.tools.getByShareToken, { shareToken });

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground p-8 text-center">
        <div>
          <p className="text-lg font-medium">Tool not found</p>
          <p className="text-sm mt-1">This link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <ToolRuntimePage
      shareToken={shareToken}
      templateType={result.instance.templateType}
      configJson={result.configJson}
    />
  );
}
```

- [ ] **Step 5: Update src/proxy.ts to exclude /apps/(.*)**

Open `src/proxy.ts`. Make two changes:

**Change 1** — rename `isPublicApiRoute` to `isPublicRoute` and add the apps path:

```ts
const isPublicRoute = createRouteMatcher([
  "/api/tool/(.*)",
  "/family/(.*)/play/manifest.json",
  "/apps/(.*)",
]);
```

Update the usage in the handler:
```ts
if (isPublicRoute(req)) return;
```

**Change 2** — update the `config.matcher` to also exclude `/apps/` from Clerk processing:

```ts
export const config = {
  matcher: [
    "/((?!_next|api/tool/|apps/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/tool/))(.*)",
    "/(trpc)(.*)",
  ],
};
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -10
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add \
  src/app/\(app\)/tools/ \
  src/app/apps/ \
  src/features/tools/components/builder/publish-panel.tsx \
  src/features/tools/components/runtime/ \
  src/proxy.ts
git commit -m "feat(tools): builder wizard page (all 4 steps), publish panel, public /apps/[shareToken] route"
```

---

## Task 10: AI content assist — Convex action

**Files:**
- Create: `convex/tools_ai.ts`
- Create: `convex/lib/template_schema_descriptions.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Create schema descriptions for AI prompting**

Create `convex/lib/template_schema_descriptions.ts`:

```ts
// Plain-text schema descriptions sent to Claude for structured output.
// Keep these in sync with the Zod schemas in src/features/tools/lib/templates/*/schema.ts.

export const TEMPLATE_SCHEMA_DESCRIPTIONS: Record<string, string> = {
  aac_board: `
Return a JSON object matching this structure exactly. No markdown, no code block, just raw JSON.
{
  "title": string (1-100 chars),
  "gridCols": integer 2-6,
  "gridRows": integer 1-4,
  "buttons": [
    {
      "id": string (unique short ID, e.g. "1", "2", "3"...),
      "label": string (1-50 chars, what appears on the button),
      "speakText": string (1-200 chars, the phrase spoken aloud when tapped)
    }
  ],
  "showTextLabels": true,
  "autoSpeak": true,
  "voice": "child-friendly",
  "highContrast": false
}
Buttons array: 1-24 items. Keep labels short and child-friendly.
`,
};
```

- [ ] **Step 2: Create the Convex action**

Create `convex/tools_ai.ts`:

```ts
"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";

import { action } from "./_generated/server";
import { TEMPLATE_SCHEMA_DESCRIPTIONS } from "./lib/template_schema_descriptions";

const client = new Anthropic();

export const generateToolConfig = action({
  args: {
    templateType: v.string(),
    description: v.string(),
    childProfile: v.object({
      ageRange: v.optional(v.string()),
      interests: v.optional(v.array(v.string())),
      communicationLevel: v.optional(v.string()),
    }),
  },
  handler: async (_ctx, args): Promise<{ configJson: string; error?: string }> => {
    const schemaDescription = TEMPLATE_SCHEMA_DESCRIPTIONS[args.templateType];
    if (!schemaDescription) {
      return { configJson: "", error: `Unknown template type: ${args.templateType}` };
    }

    const childContext = [
      args.childProfile.ageRange && `Age range: ${args.childProfile.ageRange}`,
      args.childProfile.communicationLevel &&
        `Communication level: ${args.childProfile.communicationLevel}`,
      args.childProfile.interests?.length &&
        `Interests: ${args.childProfile.interests.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `You are helping a speech-language pathologist build a custom therapy tool for a child.

Child profile:
${childContext || "No child profile provided."}

SLP's description: ${args.description}

${schemaDescription}`;

    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const rawText =
        message.content[0].type === "text" ? message.content[0].text.trim() : "";
      const jsonText = rawText.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
      JSON.parse(jsonText); // throws if invalid JSON — caught below
      return { configJson: jsonText };
    } catch (err) {
      console.error("[generateToolConfig]", err);
      return { configJson: "", error: "Failed to generate config. Please try again." };
    }
  },
});
```

- [ ] **Step 3: Add exclusions to vitest.config.ts**

In `vitest.config.ts`, add to the `coverage.exclude` array:

```ts
"convex/tools_ai.ts",
"convex/lib/template_schema_descriptions.ts",
```

Also remove these now-stale entries from `coverage.exclude` (these files are being deleted in Task 13):
- `"convex/publish.ts"`
- `"src/features/builder/lib/sse-types.ts"`
- `"src/features/builder/components/chat/**"`

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "tools_ai\|error TS" | head -10
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add convex/tools_ai.ts convex/lib/template_schema_descriptions.ts vitest.config.ts
git commit -m "feat(tools): AI config generation via Claude Haiku; add coverage exclusions"
```

---

## Task 11: AI assist hook + panel UI

**Files:**
- Create: `src/features/tools/hooks/use-ai-config-assist.ts`
- Create: `src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts`
- Create: `src/features/tools/components/builder/ai-assist-panel.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts`:

```ts
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useAction: vi.fn(() =>
    vi.fn().mockResolvedValue({ configJson: '{"title":"Generated"}', error: undefined })
  ),
}));
vi.mock("@convex/_generated/api", () => ({
  api: { tools_ai: { generateToolConfig: "tools_ai:generateToolConfig" } },
}));

import { useAIConfigAssist } from "../use-ai-config-assist";

describe("useAIConfigAssist", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() =>
      useAIConfigAssist({ templateType: "aac_board", childProfile: {} })
    );
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("transitions to success after generate resolves", async () => {
    const { result } = renderHook(() =>
      useAIConfigAssist({ templateType: "aac_board", childProfile: {} })
    );
    await act(async () => {
      await result.current.generate("Make a snack board for Liam");
    });
    expect(result.current.status).toBe("success");
  });

  it("returns the configJson on success", async () => {
    const { result } = renderHook(() =>
      useAIConfigAssist({ templateType: "aac_board", childProfile: {} })
    );
    let returned: string | null = null;
    await act(async () => {
      returned = await result.current.generate("snack board");
    });
    expect(returned).toBe('{"title":"Generated"}');
  });
});
```

- [ ] **Step 2: Run — verify fails**

```bash
npx vitest run src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts 2>&1 | tail -5
```

- [ ] **Step 3: Implement the hook**

Create `src/features/tools/hooks/use-ai-config-assist.ts`:

```ts
"use client";

import { useAction } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "@convex/_generated/api";

export type AIAssistStatus = "idle" | "loading" | "success" | "error";

interface ChildProfile {
  ageRange?: string;
  interests?: string[];
  communicationLevel?: string;
}

export function useAIConfigAssist({
  templateType,
  childProfile,
}: {
  templateType: string;
  childProfile: ChildProfile;
}) {
  const [status, setStatus] = useState<AIAssistStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const generateAction = useAction(api.tools_ai.generateToolConfig);

  const generate = useCallback(
    async (description: string): Promise<string | null> => {
      setStatus("loading");
      setError(null);
      try {
        const result = await generateAction({ templateType, description, childProfile });
        if (result.error || !result.configJson) {
          setError(result.error ?? "No config returned");
          setStatus("error");
          return null;
        }
        setStatus("success");
        return result.configJson;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStatus("error");
        return null;
      }
    },
    [generateAction, templateType, childProfile]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, generate, reset };
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npx vitest run src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts 2>&1 | tail -8
```
Expected: 3 tests pass.

- [ ] **Step 5: Create ai-assist-panel.tsx**

Create `src/features/tools/components/builder/ai-assist-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

import { useAIConfigAssist } from "../../hooks/use-ai-config-assist";
import { templateRegistry } from "../../lib/registry";

interface AIAssistPanelProps {
  templateType: string;
  childProfile: {
    ageRange?: string;
    interests?: string[];
    communicationLevel?: string;
  };
  onApply: (configJson: string) => void;
}

export function AIAssistPanel({ templateType, childProfile, onApply }: AIAssistPanelProps) {
  const [description, setDescription] = useState("");
  const { status, error, generate } = useAIConfigAssist({ templateType, childProfile });
  const registration = templateRegistry[templateType];

  const handleGenerate = async () => {
    if (!description.trim()) return;
    const configJson = await generate(description);
    if (configJson) onApply(configJson);
  };

  return (
    <div className="border border-border rounded-xl p-4 flex flex-col gap-3 bg-muted/30">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">AI assist</span>
        <span className="text-xs text-muted-foreground">— optional</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Describe what you want for this {registration?.meta.name ?? "tool"} and AI will
        fill in the form for you to review.
      </p>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={`e.g. "Snack request board for Liam. 6 buttons. Simple short phrases."`}
        rows={3}
        className="text-sm resize-none"
        disabled={status === "loading"}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="sm"
        onClick={handleGenerate}
        disabled={!description.trim() || status === "loading"}
        className="self-start"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3 mr-1.5" />
            Generate
          </>
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/hooks/use-ai-config-assist.ts src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts src/features/tools/components/builder/ai-assist-panel.tsx
git commit -m "feat(tools): AI assist hook + panel — generates config from plain-language description"
```

---

## Task 12: Delete WAB pipeline + redirect /builder

**Files:**
- Delete: `src/app/api/generate/` (entire directory)
- Delete: `src/features/builder/` (entire directory)
- Delete: `convex/publish.ts`
- Modify: `src/app/(app)/builder/page.tsx`

- [ ] **Step 1: Delete the retired pipeline files**

```bash
rm -rf /Users/desha/Springfield-Vibeathon/src/app/api/generate
rm -rf /Users/desha/Springfield-Vibeathon/src/features/builder
rm -f /Users/desha/Springfield-Vibeathon/convex/publish.ts
```

- [ ] **Step 2: Replace builder page with a redirect**

Replace the entire contents of `src/app/(app)/builder/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function BuilderPage() {
  redirect("/tools/new");
}
```

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run 2>&1 | tail -20
```
Expected: all tests pass; previously-passing builder tests no longer run (files deleted).

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -15
```
Expected: no errors. If errors mention deleted files, those are resolved by the deletion.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(tools): delete WAB/Parcel pipeline and code-gen builder; redirect /builder → /tools/new"
```

---

## Task 13: Update sidebar navigation

**Files:**
- Modify: `src/features/dashboard/components/dashboard-sidebar.tsx`

- [ ] **Step 1: Update /builder references in the sidebar**

Open `src/features/dashboard/components/dashboard-sidebar.tsx`.

Find and update:
1. Line ~23 — active-route match for `"/builder"` → change to `"/tools/new"`
2. Line ~94 — CTA button `href="/builder?new=1"` → change to `href="/tools/new"`
3. Any button label referencing "Build with AI", "Generate app", or similar → change to "Create tool"

The exact edits:

```tsx
// In the active-route array or check:
"/tools/new",    // was "/builder"

// In the CTA button:
href="/tools/new"    // was "/builder?new=1"
```

- [ ] **Step 2: Run sidebar tests**

```bash
npx vitest run src/features/dashboard/ 2>&1 | tail -10
```
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/components/dashboard-sidebar.tsx
git commit -m "feat(tools): update sidebar nav CTA to /tools/new"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Covered by |
|---|---|
| 3 new Convex tables (app_instances, published_app_versions, tool_events) | Task 1 |
| CRUD mutations and queries for app_instances | Task 2 |
| logEvent public mutation | Task 2 |
| AAC Board Zod schema | Task 3 |
| Template registry with Editor/Runtime per type | Task 4 |
| AAC Board runtime component | Task 5 |
| AAC Board editor component | Task 6 |
| Builder wizard hook (step nav, autosave, publish) | Task 7 |
| Template picker (wizard step 2) | Task 8 |
| Config editor + preview panel (wizard step 3) | Task 8 |
| Builder wizard page (all 4 steps) | Task 9 |
| Publish panel (wizard step 4) | Task 9 |
| Public runtime route /apps/[shareToken] | Task 9 |
| proxy.ts exclusion for /apps/(.*) | Task 9 |
| AI config generation Convex action | Task 10 |
| AI assist hook (loading/error/success) | Task 11 |
| AI assist panel UI | Task 11 |
| Delete WAB/Parcel + redirect /builder | Task 12 |
| shareToken cryptographically random | Task 2 (crypto.randomUUID()) |
| Published versions are immutable snapshots | Task 2 (published_app_versions insert on publish) |
| Sidebar CTA updated | Task 13 |

**Placeholder scan:** All code blocks are complete. No TBDs.

**Type consistency:**
- `RuntimeProps<TConfig>` defined in registry.ts, used in runtime.tsx ✓
- `EditorProps<TConfig>` defined in registry.ts, used in editor.tsx ✓
- `api.tools.logEvent` args shape matches convex/tools.ts `logEvent` mutation ✓
- `api.tools_ai.generateToolConfig` returns `{ configJson, error? }` — matches hook ✓
- `shareToken` used consistently as string across schema, queries, runtime, proxy ✓

**Phase 3 follow-on (not in this plan):**
- Add remaining templates: copy Task 3 + 5 + 6 pattern for First/Then Board, Token Board, Visual Schedule, Matching Game. Register each in `templateRegistry`.
- Wire `tool_events` summaries to the patient progress tab.
- Wire `/family` parent portal to show `app_instances` for the caregiver's linked patient.
- Add tool duplication mutation.
