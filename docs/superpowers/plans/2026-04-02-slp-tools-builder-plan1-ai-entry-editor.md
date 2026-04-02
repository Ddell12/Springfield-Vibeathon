# SLP Tools Builder — Plan 1: AI-First Entry + Editor Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 4-step creation wizard with an AI-first entry prompt, restructure the editor into a clean 40/60 panel layout with AI Refine at top, and convert publish to a sheet instead of a wizard step.

**Architecture:** The `/tools/new` page renders a new `ToolEntryPage` component (AI prompt + quick-start cards). Submitting the prompt calls a new `/api/tools/infer-template` endpoint that infers the template type and generates a full config in two sequential AI calls. The returned data is used to create a Convex `app_instances` record and the user is redirected to `/tools/:id`. The existing `tool-builder-wizard.tsx` becomes a pure editor (no step chrome) with a 40% left panel (AI Refine + Content/Appearance tabs) and 60% live preview.

**Tech Stack:** Next.js App Router, Convex, `@ai-sdk/anthropic`, `ai` (generateText + Output.object), shadcn/ui (Tabs, Sheet), React Testing Library, Vitest

**Spec:** `docs/superpowers/specs/2026-04-02-slp-tools-builder-redesign-design.md` §1 and §2

---

## File Map

**Create:**
- `src/app/api/tools/infer-template/route.ts` — infers templateType + generates config from plain-text description
- `src/app/api/tools/infer-template/__tests__/route.test.ts`
- `src/features/tools/components/entry/tool-entry-page.tsx` — AI-first entry UI
- `src/features/tools/components/entry/quick-start-cards.tsx` — 5 quick-start template cards
- `src/features/tools/components/entry/__tests__/tool-entry-page.test.tsx`
- `src/features/tools/components/builder/publish-sheet.tsx` — sheet replacement for PublishPanel wizard step
- `src/features/tools/components/builder/__tests__/publish-sheet.test.tsx`

**Modify:**
- `convex/schema.ts` — add `originalDescription: v.optional(v.string())` to `app_instances`
- `convex/tools.ts` — accept and store `originalDescription` in `create` mutation
- `src/features/tools/lib/ai/generation-schema.ts` — add `inferTemplateRequestSchema`
- `src/app/(app)/tools/new/page.tsx` — swap wizard for ToolEntryPage
- `src/app/(app)/tools/[id]/page.tsx` — remove `patients` query (no longer needed in editor)
- `src/features/tools/hooks/use-tool-builder.ts` — remove step machine; add `originalDescription`, `isPublishOpen`, `openPublish`, `closePublish`
- `src/features/tools/hooks/__tests__/use-tool-builder.test.ts` — replace step tests with new API
- `src/features/tools/components/builder/tool-builder-wizard.tsx` — full layout rework: no step chrome, Tabs, 40/60 split, inline title, PublishSheet trigger
- `src/features/tools/components/builder/ai-assist-panel.tsx` — add `initialDescription?: string` prop
- `src/features/tools/components/builder/__tests__/ai-assist-panel.test.tsx` — add pre-fill test (new file; existing tests kept)

---

## Task 1: Extend Convex schema — add `originalDescription` to app_instances

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/tools.ts`

- [ ] **Step 1.1: Add the field to the schema**

In `convex/schema.ts`, find the `app_instances` table definition and add one line after `version: v.number()`:

```typescript
// Before
    version: v.number(),
    shareToken: v.optional(v.string()),

// After
    version: v.number(),
    originalDescription: v.optional(v.string()),
    shareToken: v.optional(v.string()),
```

- [ ] **Step 1.2: Accept originalDescription in the create mutation**

In `convex/tools.ts`, update the `create` mutation:

```typescript
export const create = mutation({
  args: {
    templateType: v.string(),
    title: v.string(),
    patientId: v.optional(v.id("patients")),
    configJson: v.string(),
    originalDescription: v.optional(v.string()),   // ← add
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    return ctx.db.insert("app_instances", {
      templateType: args.templateType,
      title: args.title,
      titleLower: normalizeTitle(args.title),
      ...(args.patientId !== undefined ? { patientId: args.patientId } : {}),
      slpUserId: identity.subject,
      configJson: args.configJson,
      originalDescription: args.originalDescription,   // ← add
      status: "draft",
      version: 1,
    });
  },
});
```

- [ ] **Step 1.3: Verify Convex types regenerate cleanly**

```bash
cd /Users/desha/Springfield-Vibeathon
npx convex dev --once 2>&1 | tail -20
```

Expected: no errors, `app_instances` schema validates.

- [ ] **Step 1.4: Commit**

```bash
git add convex/schema.ts convex/tools.ts
git commit -m "feat(schema): add originalDescription to app_instances"
```

---

## Task 2: Add `inferTemplateRequestSchema` to generation-schema.ts

**Files:**
- Modify: `src/features/tools/lib/ai/generation-schema.ts`

- [ ] **Step 2.1: Add the new schema**

```typescript
// src/features/tools/lib/ai/generation-schema.ts
import { z } from "zod";

export const generationProfileSchema = z.object({
  targetSetting: z.enum(["clinic", "home", "both"]).optional(),
  interactionRichness: z.enum(["standard", "high"]).optional(),
  voicePreference: z.literal("elevenlabs-first").optional(),
  sensoryMode: z.enum(["calm", "energetic"]).optional(),
});

export const generateConfigRequestSchema = z.object({
  templateType: z.string(),
  description: z.string().min(1),
  childProfile: z.object({
    ageRange: z.string().optional(),
    interests: z.array(z.string()).optional(),
    communicationLevel: z.string().optional(),
  }),
  generationProfile: generationProfileSchema.optional(),
});

// ← new
export const childProfileSchema = z.object({
  ageRange: z.string().optional(),
  interests: z.array(z.string()).optional(),
  communicationLevel: z.string().optional(),
});

export const inferTemplateRequestSchema = z.object({
  description: z.string().min(1).max(1000),
  childProfile: childProfileSchema.optional(),
});
```

- [ ] **Step 2.2: Verify types**

```bash
npx tsc --noEmit 2>&1 | grep generation-schema
```

Expected: no output (no errors).

- [ ] **Step 2.3: Commit**

```bash
git add src/features/tools/lib/ai/generation-schema.ts
git commit -m "feat(ai): add inferTemplateRequestSchema"
```

---

## Task 3: Build `/api/tools/infer-template` route

**Files:**
- Create: `src/app/api/tools/infer-template/route.ts`
- Create: `src/app/api/tools/infer-template/__tests__/route.test.ts`

- [ ] **Step 3.1: Write the failing test**

```typescript
// src/app/api/tools/infer-template/__tests__/route.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_test123" }),
}));

// First generateText call returns { templateType, suggestedTitle }
// Second generateText call returns config object
let callCount = 0;
vi.mock("ai", () => ({
  generateText: vi.fn().mockImplementation(() => {
    callCount++;
    if (callCount % 2 === 1) {
      // Odd call = inference
      return Promise.resolve({
        output: { templateType: "token_board", suggestedTitle: "Marcus Token Board" },
      });
    }
    // Even call = config generation
    return Promise.resolve({
      output: {
        title: "Marcus Token Board",
        tokenCount: 5,
        rewardLabel: "iPad time",
        tokenShape: "star",
        tokenColor: "#FBBF24",
        highContrast: false,
      },
    });
  }),
  Output: {
    object: vi.fn(({ schema }) => ({ schema })),
  },
}));

import { POST } from "../route";

describe("POST /api/tools/infer-template", () => {
  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValueOnce({ userId: null } as never);

    const req = new Request("http://localhost/api/tools/infer-template", {
      method: "POST",
      body: JSON.stringify({ description: "token board for Marcus" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty description", async () => {
    const req = new Request("http://localhost/api/tools/infer-template", {
      method: "POST",
      body: JSON.stringify({ description: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns templateType, configJson, suggestedTitle for valid description", async () => {
    callCount = 0;
    const req = new Request("http://localhost/api/tools/infer-template", {
      method: "POST",
      body: JSON.stringify({
        description: "token board for Marcus, 5 tokens, reward is iPad time",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.templateType).toBe("token_board");
    expect(body.suggestedTitle).toBe("Marcus Token Board");
    expect(typeof body.configJson).toBe("string");
    const config = JSON.parse(body.configJson);
    expect(config.tokenCount).toBe(5);
  });
});
```

- [ ] **Step 3.2: Run test — verify it fails**

```bash
npm test -- --run src/app/api/tools/infer-template/__tests__/route.test.ts 2>&1 | tail -20
```

Expected: FAIL — "Cannot find module '../route'"

- [ ] **Step 3.3: Implement the route**

```typescript
// src/app/api/tools/infer-template/route.ts
import { auth } from "@clerk/nextjs/server";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { inferTemplateRequestSchema } from "@/features/tools/lib/ai/generation-schema";
import { toolsGenerationModel } from "@/features/tools/lib/ai/model";
import { buildPremiumToolPrompt } from "@/features/tools/lib/ai/premium-prompt";
import { templateRegistry } from "@/features/tools/lib/registry";

export const runtime = "nodejs";

const TEMPLATE_KEYS = [
  "aac_board",
  "first_then_board",
  "token_board",
  "visual_schedule",
  "matching_game",
] as const;

function buildInferPrompt(description: string, childContext: string): string {
  return `You are helping a speech-language pathologist choose the right therapy tool type.

Available tool types:
- aac_board: Tappable buttons that speak aloud. Use for: communication, AAC, requesting, words, buttons.
- first_then_board: First do X, Then get Y. Use for: task-reward, sequencing, transitions, first/then.
- token_board: Earn tokens, exchange for reward. Use for: tokens, reinforcement, stars, behavior, rewards.
- visual_schedule: Step-by-step activity sequence. Use for: schedule, routine, steps, morning, order.
- matching_game: Vocabulary and concept matching. Use for: matching, vocabulary, categories, game, words.

Child context:
${childContext || "Not provided."}

Clinician request: "${description}"

Pick the single best tool type. Also suggest a concise title (3-6 words) that names this specific tool.`;
}

function buildChildContext(childProfile?: {
  ageRange?: string;
  communicationLevel?: string;
  interests?: string[];
}): string {
  if (!childProfile) return "";
  return [
    childProfile.ageRange && `Age range: ${childProfile.ageRange}`,
    childProfile.communicationLevel &&
      `Communication level: ${childProfile.communicationLevel}`,
    childProfile.interests?.length &&
      `Interests: ${childProfile.interests.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = inferTemplateRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { description, childProfile } = parsed.data;
  const childContext = buildChildContext(childProfile);

  try {
    // Step 1: Infer template type and title
    const inferResult = await generateText({
      model: toolsGenerationModel,
      output: Output.object({
        schema: z.object({
          templateType: z.enum(TEMPLATE_KEYS),
          suggestedTitle: z.string(),
        }),
      }),
      prompt: buildInferPrompt(description, childContext),
    });

    if (!inferResult.output) {
      return NextResponse.json(
        { error: "Template inference produced no output" },
        { status: 500 }
      );
    }

    const { templateType, suggestedTitle } = inferResult.output;
    const registration = templateRegistry[templateType];

    // Step 2: Generate config for the inferred template
    const configResult = await generateText({
      model: toolsGenerationModel,
      output: Output.object({ schema: registration.aiConfigSchema }),
      prompt: buildPremiumToolPrompt({
        description,
        childContext,
        templateName: registration.meta.name,
        schemaNotes: registration.schemaPrompt,
      }),
    });

    if (!configResult.output) {
      return NextResponse.json(
        { error: "Config generation produced no output" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      templateType,
      configJson: JSON.stringify(configResult.output),
      suggestedTitle,
    });
  } catch (err) {
    console.error("[tools/infer-template] failed:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3.4: Run test — verify it passes**

```bash
npm test -- --run src/app/api/tools/infer-template/__tests__/route.test.ts 2>&1 | tail -20
```

Expected: PASS — 3 tests

- [ ] **Step 3.5: Commit**

```bash
git add src/app/api/tools/infer-template/
git commit -m "feat(api): add infer-template route for AI-first tool creation"
```

---

## Task 4: Refactor `use-tool-builder.ts` — remove step machine, add publish state

**Files:**
- Modify: `src/features/tools/hooks/use-tool-builder.ts`
- Modify: `src/features/tools/hooks/__tests__/use-tool-builder.test.ts`

- [ ] **Step 4.1: Write new tests first**

Replace `src/features/tools/hooks/__tests__/use-tool-builder.test.ts` entirely:

```typescript
// src/features/tools/hooks/__tests__/use-tool-builder.test.ts
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue("inst-1")),
  useQuery: vi.fn(() => undefined),
}));
vi.mock("@convex/_generated/api", () => ({
  api: {
    tools: {
      create: "tools:create",
      update: "tools:update",
      publish: "tools:publish",
      get: "tools:get",
    },
  },
}));

import { useToolBuilder } from "../use-tool-builder";

describe("useToolBuilder", () => {
  it("initialises with null template and instance", () => {
    const { result } = renderHook(() => useToolBuilder());
    expect(result.current.templateType).toBeNull();
    expect(result.current.instanceId).toBeNull();
    expect(result.current.originalDescription).toBeNull();
  });

  it("publish panel is closed initially", () => {
    const { result } = renderHook(() => useToolBuilder());
    expect(result.current.isPublishOpen).toBe(false);
  });

  it("openPublish opens the publish panel", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.openPublish());
    expect(result.current.isPublishOpen).toBe(true);
  });

  it("closePublish closes the publish panel", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.openPublish());
    act(() => result.current.closePublish());
    expect(result.current.isPublishOpen).toBe(false);
  });

  it("selectPatient stores patientId", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.selectPatient("patient-123" as never));
    expect(result.current.patientId).toBe("patient-123");
  });

  it("updateConfig stores new config", () => {
    const { result } = renderHook(() => useToolBuilder());
    const config = { title: "My Board" };
    act(() => result.current.updateConfig(config));
    expect(result.current.config).toEqual(config);
  });

  it("saveAndAdvance creates an instance when none exists", async () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.updateConfig({ title: "Test", tokenCount: 5 }));
    // Simulate template type set (as the entry page would do via seeding)
    act(() => result.current.selectTemplate("token_board"));

    await act(async () => {
      await result.current.saveAndAdvance();
    });

    expect(result.current.instanceId).not.toBeNull();
  });

  it("appearance defaults to calm preset", () => {
    const { result } = renderHook(() => useToolBuilder());
    expect(result.current.appearance.themePreset).toBe("calm");
  });
});
```

- [ ] **Step 4.2: Run tests — verify they fail**

```bash
npm test -- --run src/features/tools/hooks/__tests__/use-tool-builder.test.ts 2>&1 | tail -30
```

Expected: multiple FAIL — `isPublishOpen`, `openPublish`, `closePublish`, `originalDescription` don't exist yet.

- [ ] **Step 4.3: Rewrite the hook**

```typescript
// src/features/tools/hooks/use-tool-builder.ts
"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { templateRegistry } from "../lib/registry";
import type { ThemePreset } from "../lib/runtime/app-shell-types";

interface BuilderState {
  patientId: Id<"patients"> | null;
  templateType: string | null;
  config: unknown;
  instanceId: Id<"app_instances"> | null;
  publishedShareToken: string | null;
  isSaving: boolean;
  originalDescription: string | null;
  isPublishOpen: boolean;
  appearance: {
    themePreset: ThemePreset;
    accentColor: string;
  };
}

export function useToolBuilder(initialId?: Id<"app_instances"> | null) {
  const existingInstance = useQuery(
    api.tools.get,
    initialId ? { id: initialId } : "skip"
  );

  const [state, setState] = useState<BuilderState>({
    patientId: null,
    templateType: null,
    config: null,
    instanceId: null,
    publishedShareToken: null,
    isSaving: false,
    originalDescription: null,
    isPublishOpen: false,
    appearance: {
      themePreset: "calm",
      accentColor: "#00595c",
    },
  });

  const seeded = useRef(false);

  useEffect(() => {
    if (existingInstance && !seeded.current) {
      seeded.current = true;
      const timer = setTimeout(() => {
        setState({
          patientId: existingInstance.patientId ?? null,
          templateType: existingInstance.templateType,
          config: JSON.parse(existingInstance.configJson),
          instanceId: existingInstance._id,
          publishedShareToken: existingInstance.shareToken ?? null,
          isSaving: false,
          originalDescription: existingInstance.originalDescription ?? null,
          isPublishOpen: false,
          appearance: {
            themePreset: "calm",
            accentColor: "#00595c",
          },
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [existingInstance]);

  const createInstance = useMutation(api.tools.create);
  const updateInstance = useMutation(api.tools.update);
  const publishInstance = useMutation(api.tools.publish);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestConfigRef = useRef<unknown>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

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

  const openPublish = useCallback(
    () => setState((s) => ({ ...s, isPublishOpen: true })),
    []
  );

  const closePublish = useCallback(
    () => setState((s) => ({ ...s, isPublishOpen: false })),
    []
  );

  const updateConfig = useCallback(
    (config: unknown) => {
      setState((s) => ({ ...s, config }));
      latestConfigRef.current = config;

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setState((s) => {
          if (!s.instanceId) return s;
          void updateInstance({
            id: s.instanceId,
            configJson: JSON.stringify(latestConfigRef.current),
          });
          return s;
        });
      }, 1500);
    },
    [updateInstance]
  );

  const updateAppearance = useCallback(
    (appearance: BuilderState["appearance"]) =>
      setState((s) => ({ ...s, appearance })),
    []
  );

  const saveAndAdvance = useCallback(async () => {
    const { patientId, templateType, config, instanceId } = state;
    if (!templateType || !config) return;

    setState((s) => ({ ...s, isSaving: true }));
    try {
      if (!instanceId) {
        const payload = {
          templateType,
          title: (config as { title?: string }).title ?? "Untitled",
          configJson: JSON.stringify(config),
          ...(patientId ? { patientId } : {}),
          ...(state.originalDescription
            ? { originalDescription: state.originalDescription }
            : {}),
        };
        const id = await createInstance(payload);
        setState((s) => ({
          ...s,
          instanceId: id as Id<"app_instances">,
          isSaving: false,
        }));
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

  return {
    ...state,
    selectPatient,
    selectTemplate,
    openPublish,
    closePublish,
    updateConfig,
    updateAppearance,
    saveAndAdvance,
    publish,
  };
}
```

- [ ] **Step 4.4: Run tests — verify they pass**

```bash
npm test -- --run src/features/tools/hooks/__tests__/use-tool-builder.test.ts 2>&1 | tail -20
```

Expected: PASS — 8 tests

- [ ] **Step 4.5: Commit**

```bash
git add src/features/tools/hooks/
git commit -m "refactor(tools): remove step machine from useToolBuilder, add publish panel state"
```

---

## Task 5: Build `quick-start-cards.tsx`

**Files:**
- Create: `src/features/tools/components/entry/quick-start-cards.tsx`

- [ ] **Step 5.1: Create the component**

```tsx
// src/features/tools/components/entry/quick-start-cards.tsx
"use client";

import { templateRegistry } from "../../lib/registry";

interface QuickStartCardsProps {
  onSelect: (templateType: string) => void;
  disabled?: boolean;
}

export function QuickStartCards({ onSelect, disabled }: QuickStartCardsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground text-center">
        Or start from a template
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {Object.values(templateRegistry).map((t) => (
          <button
            key={t.meta.id}
            onClick={() => onSelect(t.meta.id)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none"
          >
            {t.meta.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5.2: Verify it renders without errors (type-check only)**

```bash
npx tsc --noEmit 2>&1 | grep quick-start-cards
```

Expected: no output.

- [ ] **Step 5.3: Commit**

```bash
git add src/features/tools/components/entry/quick-start-cards.tsx
git commit -m "feat(tools): add quick-start template cards for entry page"
```

---

## Task 6: Build `tool-entry-page.tsx`

**Files:**
- Create: `src/features/tools/components/entry/tool-entry-page.tsx`
- Create: `src/features/tools/components/entry/__tests__/tool-entry-page.test.tsx`

- [ ] **Step 6.1: Write the failing tests**

```typescript
// src/features/tools/components/entry/__tests__/tool-entry-page.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockCreateInstance = vi.fn().mockResolvedValue("new-instance-id");
vi.mock("convex/react", () => ({
  useMutation: () => mockCreateInstance,
}));
vi.mock("@convex/_generated/api", () => ({
  api: { tools: { create: "tools:create" } },
}));

// Mock fetch for the infer-template call
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { ToolEntryPage } from "../tool-entry-page";

describe("ToolEntryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          templateType: "token_board",
          configJson: JSON.stringify({ title: "Marcus Token Board", tokenCount: 5 }),
          suggestedTitle: "Marcus Token Board",
        }),
    });
  });

  it("renders the heading and textarea", () => {
    render(<ToolEntryPage />);
    expect(screen.getByText(/what do you want to build/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("Build it button is disabled when description is empty", () => {
    render(<ToolEntryPage />);
    expect(screen.getByRole("button", { name: /build it/i })).toBeDisabled();
  });

  it("Build it button enables when description is entered", () => {
    render(<ToolEntryPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "token board for Marcus" },
    });
    expect(screen.getByRole("button", { name: /build it/i })).not.toBeDisabled();
  });

  it("calls infer-template API then creates instance and redirects", async () => {
    render(<ToolEntryPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "token board for Marcus, 5 tokens, iPad reward" },
    });
    fireEvent.click(screen.getByRole("button", { name: /build it/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tools/infer-template",
        expect.objectContaining({ method: "POST" })
      );
    });

    await waitFor(() => {
      expect(mockCreateInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          templateType: "token_board",
          title: "Marcus Token Board",
          originalDescription: "token board for Marcus, 5 tokens, iPad reward",
        })
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/tools/new-instance-id");
    });
  });

  it("shows error message when API fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });
    render(<ToolEntryPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "token board for Marcus" },
    });
    fireEvent.click(screen.getByRole("button", { name: /build it/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/couldn't build the tool/i)
      ).toBeInTheDocument();
    });
  });

  it("quick-start cards are visible", () => {
    render(<ToolEntryPage />);
    expect(screen.getByText(/token board/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6.2: Run tests — verify they fail**

```bash
npm test -- --run "src/features/tools/components/entry/__tests__/tool-entry-page.test.tsx" 2>&1 | tail -20
```

Expected: FAIL — "Cannot find module '../tool-entry-page'"

- [ ] **Step 6.3: Implement the component**

```tsx
// src/features/tools/components/entry/tool-entry-page.tsx
"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

import { templateRegistry } from "../../lib/registry";
import { QuickStartCards } from "./quick-start-cards";

interface ToolEntryPageProps {
  childProfile?: {
    ageRange?: string;
    interests?: string[];
    communicationLevel?: string;
  };
}

export function ToolEntryPage({ childProfile }: ToolEntryPageProps) {
  const router = useRouter();
  const createInstance = useMutation(api.tools.create);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBuildIt = async () => {
    const desc = description.trim();
    if (!desc) return;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/tools/infer-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc, childProfile }),
      });

      if (!res.ok) {
        setStatus("error");
        setError("Couldn't build the tool. Try describing it differently.");
        return;
      }

      const { templateType, configJson, suggestedTitle } = (await res.json()) as {
        templateType: string;
        configJson: string;
        suggestedTitle: string;
      };

      const id = await createInstance({
        templateType,
        title: suggestedTitle,
        configJson,
        originalDescription: desc,
      });

      router.push(`/tools/${id as Id<"app_instances">}`);
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  };

  const handleQuickStart = async (templateType: string) => {
    setStatus("loading");
    setError(null);
    try {
      const reg = templateRegistry[templateType];
      const id = await createInstance({
        templateType,
        title: reg.meta.name,
        configJson: JSON.stringify(reg.defaultConfig),
      });
      router.push(`/tools/${id as Id<"app_instances">}`);
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-8">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-display font-semibold text-foreground">
            What do you want to build?
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Describe the tool in plain language — AI will pick the right type and
            set it up for you.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Textarea
            ref={textareaRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`e.g. "Token board for Marcus, 5 tokens, reward is iPad time. He loves dinosaurs."`}
            rows={4}
            className="text-sm resize-none"
            disabled={isLoading}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                void handleBuildIt();
              }
            }}
          />

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            size="lg"
            onClick={() => void handleBuildIt()}
            disabled={!description.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Building your tool…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Build it
              </>
            )}
          </Button>
        </div>

        <QuickStartCards onSelect={(t) => void handleQuickStart(t)} disabled={isLoading} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6.4: Run tests — verify they pass**

```bash
npm test -- --run "src/features/tools/components/entry/__tests__/tool-entry-page.test.tsx" 2>&1 | tail -20
```

Expected: PASS — 6 tests

- [ ] **Step 6.5: Commit**

```bash
git add src/features/tools/components/entry/
git commit -m "feat(tools): add AI-first tool entry page"
```

---

## Task 7: Wire `/tools/new` page to ToolEntryPage

**Files:**
- Modify: `src/app/(app)/tools/new/page.tsx`
- Modify: `src/app/(app)/tools/[id]/page.tsx`

- [ ] **Step 7.1: Replace the new page**

```tsx
// src/app/(app)/tools/new/page.tsx
import { ToolEntryPage } from "@/features/tools/components/entry/tool-entry-page";

export default function NewToolPage() {
  return <ToolEntryPage />;
}
```

- [ ] **Step 7.2: Simplify the edit page — remove unused patients query**

```tsx
// src/app/(app)/tools/[id]/page.tsx
"use client";

import type { Id } from "@convex/_generated/dataModel";
import { useParams } from "next/navigation";

import { ToolBuilderWizard } from "@/features/tools/components/builder/tool-builder-wizard";
import { useToolBuilder } from "@/features/tools/hooks/use-tool-builder";

export default function EditToolPage() {
  const { id } = useParams<{ id: string }>();
  const builder = useToolBuilder(id as Id<"app_instances">);

  return <ToolBuilderWizard builder={builder} />;
}
```

- [ ] **Step 7.3: Verify type-check**

```bash
npx tsc --noEmit 2>&1 | grep -E "tools/new|tools/\[id\]"
```

Expected: no output.

- [ ] **Step 7.4: Commit**

```bash
git add src/app/\(app\)/tools/
git commit -m "feat(tools): wire new entry page to /tools/new route"
```

---

## Task 8: Build `PublishSheet` component

**Files:**
- Create: `src/features/tools/components/builder/publish-sheet.tsx`
- Create: `src/features/tools/components/builder/__tests__/publish-sheet.test.tsx`

- [ ] **Step 8.1: Write the failing tests**

```typescript
// src/features/tools/components/builder/__tests__/publish-sheet.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PublishSheet } from "../publish-sheet";

const mockOnPublish = vi.fn().mockResolvedValue("tok-abc");
const mockOnClose = vi.fn();

describe("PublishSheet", () => {
  it("renders nothing when closed", () => {
    render(
      <PublishSheet
        open={false}
        onClose={mockOnClose}
        isSaving={false}
        publishedShareToken={null}
        onPublish={mockOnPublish}
      />
    );
    expect(screen.queryByText(/publish/i)).not.toBeInTheDocument();
  });

  it("shows Publish button when open and not yet published", () => {
    render(
      <PublishSheet
        open={true}
        onClose={mockOnClose}
        isSaving={false}
        publishedShareToken={null}
        onPublish={mockOnPublish}
      />
    );
    expect(screen.getByRole("button", { name: /publish app/i })).toBeInTheDocument();
  });

  it("shows share link when already published", () => {
    render(
      <PublishSheet
        open={true}
        onClose={mockOnClose}
        isSaving={false}
        publishedShareToken="tok-abc"
        onPublish={mockOnPublish}
      />
    );
    expect(screen.getByText(/tok-abc/)).toBeInTheDocument();
  });

  it("calls onPublish when Publish app is clicked", async () => {
    render(
      <PublishSheet
        open={true}
        onClose={mockOnClose}
        isSaving={false}
        publishedShareToken={null}
        onPublish={mockOnPublish}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /publish app/i }));
    await waitFor(() => expect(mockOnPublish).toHaveBeenCalled());
  });
});
```

- [ ] **Step 8.2: Run tests — verify they fail**

```bash
npm test -- --run "src/features/tools/components/builder/__tests__/publish-sheet.test.tsx" 2>&1 | tail -15
```

Expected: FAIL — module not found.

- [ ] **Step 8.3: Implement the component**

```tsx
// src/features/tools/components/builder/publish-sheet.tsx
"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

interface PublishSheetProps {
  open: boolean;
  onClose: () => void;
  isSaving: boolean;
  publishedShareToken: string | null;
  onPublish: () => Promise<string | null>;
}

export function PublishSheet({
  open,
  onClose,
  isSaving,
  publishedShareToken,
  onPublish,
}: PublishSheetProps) {
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
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-[400px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Publish app</SheetTitle>
          <SheetDescription>
            Create a shareable link for parents and caregivers. No login required to use it.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-6">
          {!publishedShareToken ? (
            <Button
              className="w-full"
              disabled={isSaving}
              onClick={() => void onPublish()}
            >
              {isSaving ? "Publishing…" : "Publish app"}
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                <span className="flex-1 truncate font-mono text-xs text-foreground">
                  {shareUrl}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void handleCopy()}>
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={shareUrl!} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Patient assignment, QR code, and session mode are coming in the next update.
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 8.4: Run tests — verify they pass**

```bash
npm test -- --run "src/features/tools/components/builder/__tests__/publish-sheet.test.tsx" 2>&1 | tail -15
```

Expected: PASS — 4 tests

- [ ] **Step 8.5: Commit**

```bash
git add src/features/tools/components/builder/publish-sheet.tsx src/features/tools/components/builder/__tests__/publish-sheet.test.tsx
git commit -m "feat(tools): add PublishSheet slide-over replacing wizard step 4"
```

---

## Task 9: Add `initialDescription` prop to `AIAssistPanel`

**Files:**
- Modify: `src/features/tools/components/builder/ai-assist-panel.tsx`

- [ ] **Step 9.1: Write the failing test**

Create `src/features/tools/components/builder/__tests__/ai-assist-panel-prefill.test.tsx`:

```typescript
// src/features/tools/components/builder/__tests__/ai-assist-panel-prefill.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../hooks/use-ai-config-assist", () => ({
  useAIConfigAssist: () => ({ status: "idle", error: null, generate: vi.fn() }),
}));
vi.mock("../../lib/ai/generation-profile", () => ({
  DEFAULT_GENERATION_PROFILE: {},
}));

import { AIAssistPanel } from "../ai-assist-panel";

describe("AIAssistPanel", () => {
  it("pre-fills textarea when initialDescription is provided", () => {
    render(
      <AIAssistPanel
        templateType="token_board"
        childProfile={{}}
        initialDescription="token board for Marcus, 5 tokens"
        onApply={vi.fn()}
      />
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("token board for Marcus, 5 tokens");
  });

  it("textarea is empty when initialDescription is not provided", () => {
    render(
      <AIAssistPanel
        templateType="token_board"
        childProfile={{}}
        onApply={vi.fn()}
      />
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
  });
});
```

- [ ] **Step 9.2: Run test — verify it fails**

```bash
npm test -- --run "src/features/tools/components/builder/__tests__/ai-assist-panel-prefill.test.tsx" 2>&1 | tail -15
```

Expected: FAIL — `initialDescription` prop not accepted, textarea always empty.

- [ ] **Step 9.3: Add prop to AIAssistPanel**

```tsx
// src/features/tools/components/builder/ai-assist-panel.tsx
"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

import { useAIConfigAssist } from "../../hooks/use-ai-config-assist";
import { DEFAULT_GENERATION_PROFILE } from "../../lib/ai/generation-profile";

interface AIAssistPanelProps {
  templateType: string;
  childProfile: {
    ageRange?: string;
    interests?: string[];
    communicationLevel?: string;
  };
  initialDescription?: string;   // ← new
  onApply: (configJson: string) => void;
}

export function AIAssistPanel({
  templateType,
  childProfile,
  initialDescription,   // ← new
  onApply,
}: AIAssistPanelProps) {
  const [description, setDescription] = useState(initialDescription ?? "");
  const { status, error, generate } = useAIConfigAssist({
    templateType,
    childProfile,
    generationProfile: DEFAULT_GENERATION_PROFILE,
  });

  const handleGenerate = async () => {
    if (!description.trim()) return;
    const configJson = await generate(description);
    if (configJson) onApply(configJson);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Refine with AI</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Describe changes and AI will update the tool. Your edits are preserved until you apply.
      </p>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={`e.g. "Change the reward to free play" or "Add a button for 'bathroom'"`}
        rows={3}
        className="text-sm resize-none"
        disabled={status === "loading"}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="sm"
        onClick={() => void handleGenerate()}
        disabled={!description.trim() || status === "loading"}
        className="self-start"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            Applying…
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3 mr-1.5" />
            Apply
          </>
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 9.4: Run tests — verify they pass**

```bash
npm test -- --run "src/features/tools/components/builder/__tests__/ai-assist-panel-prefill.test.tsx" 2>&1 | tail -15
```

Expected: PASS — 2 tests

- [ ] **Step 9.5: Commit**

```bash
git add src/features/tools/components/builder/ai-assist-panel.tsx src/features/tools/components/builder/__tests__/ai-assist-panel-prefill.test.tsx
git commit -m "feat(tools): pre-fill AI panel with original description; promote to Refine with AI"
```

---

## Task 10: Rework `tool-builder-wizard.tsx` — pure editor layout

**Files:**
- Modify: `src/features/tools/components/builder/tool-builder-wizard.tsx`

The wizard loses all step chrome. It becomes the editor with: top bar (title, save indicator, publish), 40% left panel (AI Refine + Content/Appearance tabs), 60% right panel (preview).

- [ ] **Step 10.1: Write the failing test**

Create `src/features/tools/components/builder/__tests__/tool-builder-wizard.test.tsx`:

```typescript
// src/features/tools/components/builder/__tests__/tool-builder-wizard.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../hooks/use-ai-config-assist", () => ({
  useAIConfigAssist: () => ({ status: "idle", error: null, generate: vi.fn() }),
}));
vi.mock("../../lib/ai/generation-profile", () => ({
  DEFAULT_GENERATION_PROFILE: {},
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { ToolBuilderWizard } from "../tool-builder-wizard";
import type { useToolBuilder } from "../../hooks/use-tool-builder";

type Builder = ReturnType<typeof useToolBuilder>;

function makeBuilder(overrides: Partial<Builder> = {}): Builder {
  return {
    patientId: null,
    templateType: "token_board",
    config: { title: "Test Board", tokenCount: 5, rewardLabel: "iPad", tokenShape: "star", tokenColor: "#FBBF24", highContrast: false },
    instanceId: "inst-1" as never,
    publishedShareToken: null,
    isSaving: false,
    originalDescription: null,
    isPublishOpen: false,
    appearance: { themePreset: "calm", accentColor: "#00595c" },
    selectPatient: vi.fn(),
    selectTemplate: vi.fn(),
    openPublish: vi.fn(),
    closePublish: vi.fn(),
    updateConfig: vi.fn(),
    updateAppearance: vi.fn(),
    saveAndAdvance: vi.fn(),
    publish: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as Builder;
}

describe("ToolBuilderWizard (editor)", () => {
  it("renders inline title from config", () => {
    render(<ToolBuilderWizard builder={makeBuilder()} />);
    const input = screen.getByDisplayValue("Test Board");
    expect(input).toBeInTheDocument();
  });

  it("shows Publish button", () => {
    render(<ToolBuilderWizard builder={makeBuilder()} />);
    expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
  });

  it("shows Content and Appearance tabs", () => {
    render(<ToolBuilderWizard builder={makeBuilder()} />);
    expect(screen.getByRole("tab", { name: /content/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /appearance/i })).toBeInTheDocument();
  });

  it("shows empty state when no template selected", () => {
    render(<ToolBuilderWizard builder={makeBuilder({ templateType: null })} />);
    expect(screen.getByText(/select a tool type/i)).toBeInTheDocument();
  });

  it("Publish button is disabled when no instanceId", () => {
    render(<ToolBuilderWizard builder={makeBuilder({ instanceId: null })} />);
    expect(screen.getByRole("button", { name: /publish/i })).toBeDisabled();
  });
});
```

- [ ] **Step 10.2: Run tests — verify they fail**

```bash
npm test -- --run "src/features/tools/components/builder/__tests__/tool-builder-wizard.test.tsx" 2>&1 | tail -20
```

Expected: FAIL — tabs not found, wizard still has step chrome.

- [ ] **Step 10.3: Rewrite tool-builder-wizard.tsx**

```tsx
// src/features/tools/components/builder/tool-builder-wizard.tsx
"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

import type { useToolBuilder } from "../../hooks/use-tool-builder";
import { templateRegistry } from "../../lib/registry";
import { AIAssistPanel } from "./ai-assist-panel";
import { AppearanceControls } from "./appearance-controls";
import { ConfigEditor } from "./config-editor";
import { PreviewPanel } from "./preview-panel";
import { PublishSheet } from "./publish-sheet";

type Builder = ReturnType<typeof useToolBuilder>;

interface ToolBuilderWizardProps {
  builder: Builder;
}

export function ToolBuilderWizard({ builder }: ToolBuilderWizardProps) {
  const config = builder.config as Record<string, unknown> | null;
  const title = (config?.title as string) ?? "Untitled";

  const handleTitleChange = (newTitle: string) => {
    if (!config) return;
    builder.updateConfig({ ...config, title: newTitle });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-2 shrink-0 h-12">
        <Link
          href="/tools"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to tools"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>

        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground min-w-0"
          placeholder="Tool title"
          aria-label="Tool title"
        />

        <span className="text-xs text-muted-foreground shrink-0">
          {builder.isSaving ? "Saving…" : builder.instanceId ? "Saved" : ""}
        </span>

        <Button
          size="sm"
          onClick={builder.openPublish}
          disabled={!builder.instanceId}
          className="shrink-0"
        >
          Publish →
        </Button>
      </div>

      {/* Editor body */}
      {builder.templateType ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — 40% */}
          <div className="w-[40%] min-w-[300px] border-r border-border flex flex-col overflow-hidden">
            {/* AI Refine — always visible at top */}
            <div className="p-4 border-b border-border shrink-0">
              <AIAssistPanel
                templateType={builder.templateType}
                childProfile={{}}
                initialDescription={builder.originalDescription ?? undefined}
                onApply={(configJson) => {
                  const reg = templateRegistry[builder.templateType!];
                  if (reg) builder.updateConfig(reg.parseConfig(configJson));
                }}
              />
            </div>

            {/* Content / Appearance tabs */}
            <Tabs defaultValue="content" className="flex flex-col flex-1 overflow-hidden">
              <div className="px-4 pt-3 shrink-0">
                <TabsList className="w-full">
                  <TabsTrigger value="content" className="flex-1">
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="flex-1">
                    Appearance
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="content" className="flex-1 overflow-y-auto p-4 mt-0">
                <ConfigEditor
                  templateType={builder.templateType}
                  config={builder.config}
                  onChange={builder.updateConfig}
                />
              </TabsContent>

              <TabsContent value="appearance" className="overflow-y-auto p-4 mt-0">
                <AppearanceControls
                  value={builder.appearance}
                  onChange={builder.updateAppearance}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right panel — 60% */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20 shrink-0">
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
                Preview
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              <PreviewPanel
                templateType={builder.templateType}
                config={builder.config}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Select a tool type to begin editing.</p>
        </div>
      )}

      {/* Publish sheet */}
      <PublishSheet
        open={builder.isPublishOpen}
        onClose={builder.closePublish}
        isSaving={builder.isSaving}
        publishedShareToken={builder.publishedShareToken}
        onPublish={builder.publish}
      />
    </div>
  );
}
```

- [ ] **Step 10.4: Run tests — verify they pass**

```bash
npm test -- --run "src/features/tools/components/builder/__tests__/tool-builder-wizard.test.tsx" 2>&1 | tail -20
```

Expected: PASS — 5 tests

- [ ] **Step 10.5: Commit**

```bash
git add src/features/tools/components/builder/tool-builder-wizard.tsx src/features/tools/components/builder/__tests__/tool-builder-wizard.test.tsx
git commit -m "feat(tools): rework editor layout — 40/60 split, AI Refine at top, Content/Appearance tabs"
```

---

## Task 11: Full test run + type-check

- [ ] **Step 11.1: Run the full test suite**

```bash
npm test -- --run 2>&1 | tail -30
```

Expected: all tests pass. The two pre-existing failures on main (ElevenLabs voice ID, settings bg-white) are known and not regressions.

- [ ] **Step 11.2: Type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 11.3: Check old wizard tests are gone / updated**

The old `tool-builder-wizard` test referenced `step` and `patients` props. Confirm the new test file replaces it and old step-based tests no longer exist:

```bash
grep -r "builder.step\|STEP_LABELS\|Choose context\|Choose template" src/features/tools/ --include="*.ts" --include="*.tsx"
```

Expected: no matches.

- [ ] **Step 11.4: Final commit (if any lint fixes needed)**

```bash
npm run lint -- --fix 2>&1 | tail -10
git add -A
git commit -m "chore: lint fixes after tools builder Plan 1"
```

Only commit if there are actual changes; skip if clean.

---

## Self-Review Checklist

| Spec requirement | Task that implements it |
|---|---|
| AI-first entry — textarea prompt | Task 6 (ToolEntryPage) |
| Quick-start cards for direct template pick | Task 5 (QuickStartCards) |
| AI infers template type from description | Task 3 (infer-template route) |
| Child profile piped to AI | Task 6 — `childProfile` prop on ToolEntryPage |
| Patient assignment removed from creation | Task 4 (use-tool-builder), Task 7 (pages) |
| `originalDescription` stored on instance | Task 1 (schema), Task 6 (ToolEntryPage) |
| AI Refine at top of editor, always visible | Task 10 (wizard rework) |
| Content / Appearance tabs | Task 10 |
| 60% preview panel | Task 10 |
| Inline title editing | Task 10 |
| Publish → sheet (not wizard step) | Task 8 (PublishSheet), Task 10 |
| initialDescription pre-fills AI panel | Task 9 (AIAssistPanel) |
| "Publish" disabled until instance saved | Task 10 |
