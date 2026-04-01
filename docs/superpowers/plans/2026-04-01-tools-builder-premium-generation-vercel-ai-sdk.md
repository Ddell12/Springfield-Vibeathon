# Tools Builder Premium Generation Vercel AI SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the quality floor of generated therapy apps by replacing bespoke JSON prompt parsing with Vercel AI SDK structured generation, moving premium behavior into shared runtime primitives, and fixing builder/runtime UX gaps that currently block a premium-feeling result.

**Architecture:** Keep the tools feature config-driven, but stop pretending prompt tweaks alone will create premium apps. Generate validated config objects through a Next.js API route using Vercel AI SDK + Zod, then render those configs through a stronger host-controlled runtime with shared premium primitives, official SDK-backed speech, and a single event pipeline. Preserve the existing template model, but upgrade the templates and runtime contract so the premium feel comes from reliable UI building blocks rather than bespoke model prose.

**Tech Stack:** Next.js 16 App Router, Vercel AI SDK (`ai`, `@ai-sdk/anthropic`), Zod, Convex, ElevenLabs official Node SDK, React, Tailwind v4, shadcn/ui

---

## Scope Check

This remains one coherent plan because every slice serves the same outcome:

- premium config generation quality
- runtime polish and host-owned behavior
- patient-optional authoring
- reliable exit + analytics + speech

What is intentionally out of scope:

- replacing the tools feature with fully freeform code generation
- integrating `v0` directly into the generation loop
- building a new marketplace or publishing system
- inventing a custom design-scoring engine

---

## File Map

**Create:**
- `src/features/tools/lib/ai/generation-profile.ts` — shared types and defaults for premium config generation
- `src/features/tools/lib/ai/generation-schema.ts` — Zod schemas for route input/output
- `src/features/tools/lib/ai/premium-prompt.ts` — Vercel AI SDK prompt builder grounded in Bridges terminology and `DESIGN.md`
- `src/features/tools/lib/ai/model.ts` — Anthropic provider wrapper for the tools feature
- `src/app/api/tools/generate-config/route.ts` — Vercel AI SDK structured generation endpoint
- `src/features/tools/lib/runtime/runtime-shell.tsx` — host shell for preview and published modes
- `src/features/tools/lib/runtime/runtime-voice-controller.tsx` — host-owned voice adapter using shared speech generation
- `src/features/tools/lib/runtime/premium-primitives.tsx` — shared prompt, progress, reinforcement, and surface primitives
- `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`
- `src/features/tools/lib/runtime/__tests__/runtime-voice-controller.test.tsx`
- `src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`

**Modify:**
- `package.json` — add `@ai-sdk/anthropic`
- `convex/aiActions.ts` — switch speech generation to the official ElevenLabs SDK instead of raw fetch
- `convex/schema.ts` — make `app_instances.patientId` and `tool_events.patientId` optional
- `convex/tools.ts` — patient-optional create/logging flow
- `convex/__tests__/tools.test.ts` — patient-optional coverage
- `src/features/tools/hooks/use-ai-config-assist.ts` — call the Next route instead of Convex `tools_ai`
- `src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts`
- `src/features/tools/components/builder/ai-assist-panel.tsx` — collect richer generation context and use premium defaults
- `src/features/tools/hooks/use-tool-builder.ts` — remove patient gate
- `src/features/tools/hooks/__tests__/use-tool-builder.test.ts`
- `src/features/tools/components/builder/tool-builder-wizard.tsx` — patient-optional flow and better copy
- `src/features/tools/components/builder/preview-panel.tsx` — host shell wiring
- `src/features/tools/components/builder/publish-panel.tsx` — improved published UX copy
- `src/features/tools/components/runtime/tool-runtime-page.tsx` — host shell, host-owned voice, single event pipeline
- `src/features/tools/lib/registry.ts` — runtime contract update
- `src/features/tools/lib/templates/aac-board/runtime.tsx`
- `src/features/tools/lib/templates/first-then-board/runtime.tsx`
- `src/features/tools/lib/templates/token-board/runtime.tsx`
- `src/features/tools/lib/templates/visual-schedule/runtime.tsx`
- `src/features/tools/lib/templates/matching-game/runtime.tsx`
- `src/app/(app)/tools/new/page.tsx`
- `src/app/(app)/tools/[id]/page.tsx`
- `src/app/apps/[shareToken]/page.tsx`
- `docs/ai/prompt-library.md` — update tool generation model and structured-output guidance

**Delete after cutover:**
- `convex/tools_ai.ts` — remove bespoke server-side prompt + `JSON.parse` generation path once frontend is fully migrated

**Verify against existing docs while implementing:**
- `DESIGN.md`
- `convex/_generated/ai/guidelines.md`
- `docs/superpowers/specs/2026-04-01-tools-builder-premium-generation-design.md`

---

## Task 1: Adopt Vercel AI SDK provider dependencies for the tools feature

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the missing Anthropic provider package**

Update `package.json` dependencies to include:

```json
{
  "dependencies": {
    "@ai-sdk/anthropic": "^2.0.0",
    "ai": "^6.0.137"
  }
}
```

Do not remove `@anthropic-ai/sdk` yet. Other parts of the repo still use it.

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: PASS with a lockfile update and `@ai-sdk/anthropic` added.

- [ ] **Step 3: Verify the SDK surface locally**

Run:

```bash
node -e "const ai=require('ai'); console.log(typeof ai.generateText, typeof ai.Output)"
```

Expected output:

```txt
function object
```

> **Note:** `generateObject` is deprecated in AI SDK v6. The plan uses `generateText` with `Output.object({ schema })` instead.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(tools): add Vercel AI SDK anthropic provider"
```

---

## Task 2: Replace bespoke JSON parsing with Vercel AI SDK structured generation

**Files:**
- Create: `src/features/tools/lib/ai/generation-profile.ts`
- Create: `src/features/tools/lib/ai/generation-schema.ts`
- Create: `src/features/tools/lib/ai/premium-prompt.ts`
- Create: `src/features/tools/lib/ai/model.ts`
- Create: `src/app/api/tools/generate-config/route.ts`
- Modify: `docs/ai/prompt-library.md`
- Delete: `convex/tools_ai.ts`

- [ ] **Step 1: Write the failing route test for validated config generation**

Create a route test at `src/app/api/tools/generate-config/__tests__/route.test.ts` with:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    output: {
      title: "Snack Requests",
      gridCols: 3,
      gridRows: 2,
      buttons: [{ id: "1", label: "Crackers", speakText: "I want crackers" }],
      showTextLabels: true,
      autoSpeak: true,
      voice: "child-friendly",
      highContrast: false,
    },
  }),
  Output: {
    object: vi.fn(({ schema }) => ({ schema })),
  },
}));

import { POST } from "../route";

describe("POST /api/tools/generate-config", () => {
  it("returns structured config JSON for a known template", async () => {
    const req = new Request("http://localhost/api/tools/generate-config", {
      method: "POST",
      body: JSON.stringify({
        templateType: "aac_board",
        description: "Snack request board for clinic sessions",
        childProfile: {},
        generationProfile: {
          targetSetting: "clinic",
          interactionRichness: "high",
          voicePreference: "elevenlabs-first",
          sensoryMode: "calm",
        },
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.configJson).toContain("\"Snack Requests\"");
  });
});
```

- [ ] **Step 2: Run the route test and confirm failure**

Run:

```bash
npm test -- src/app/api/tools/generate-config/__tests__/route.test.ts
```

Expected: FAIL because the route and shared generation modules do not exist yet.

- [ ] **Step 3: Add the shared generation types and defaults**

Create `src/features/tools/lib/ai/generation-profile.ts`:

```ts
export interface GenerationProfile {
  targetSetting?: "clinic" | "home" | "both";
  interactionRichness?: "standard" | "high";
  voicePreference?: "elevenlabs-first";
  sensoryMode?: "calm" | "energetic";
}

export const DEFAULT_GENERATION_PROFILE: Required<GenerationProfile> = {
  targetSetting: "both",
  interactionRichness: "high",
  voicePreference: "elevenlabs-first",
  sensoryMode: "calm",
};
```

Create `src/features/tools/lib/ai/generation-schema.ts`:

```ts
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
```

- [ ] **Step 4: Add the tools-feature AI SDK model wrapper**

Create `src/features/tools/lib/ai/model.ts`:

```ts
import { anthropic } from "@ai-sdk/anthropic";

export const toolsGenerationModel = anthropic("claude-sonnet-4-6");
```

- [ ] **Step 5: Add a prompt builder that encodes premium defaults without pretending to generate arbitrary apps**

Create `src/features/tools/lib/ai/premium-prompt.ts`:

```ts
import { DEFAULT_GENERATION_PROFILE, type GenerationProfile } from "./generation-profile";

export function buildPremiumToolPrompt(args: {
  description: string;
  childContext: string;
  templateName: string;
  schemaNotes: string;
  generationProfile?: GenerationProfile;
}) {
  const profile = { ...DEFAULT_GENERATION_PROFILE, ...args.generationProfile };

  return `You are helping a speech-language pathologist configure a premium therapy app built from an existing template.

Template:
${args.templateName}

Design and UX rules:
- Follow Bridges' warm-professional therapy design language
- Prefer clear hierarchy, strong labels, and calm tonal separation
- Avoid placeholder copy and flat generic card stacks
- Add enough activity structure to feel session-ready, but stay within the template's capabilities
- If the template uses voice, prefer ElevenLabs-first speech moments in product terms such as instruction, replay, and reinforcement

Generation profile:
${JSON.stringify(profile, null, 2)}

Child context:
${args.childContext || "No child profile provided."}

Clinician request:
${args.description}

Return an object that strictly matches this schema guidance:
${args.schemaNotes}`;
}
```

- [ ] **Step 6: Implement the Vercel AI SDK route with Zod-backed structured output**

Create `src/app/api/tools/generate-config/route.ts`:

```ts
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";

import { generateConfigRequestSchema } from "@/features/tools/lib/ai/generation-schema";
import { buildPremiumToolPrompt } from "@/features/tools/lib/ai/premium-prompt";
import { toolsGenerationModel } from "@/features/tools/lib/ai/model";
import { templateRegistry } from "@/features/tools/lib/registry";

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = generateConfigRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid generation request" }, { status: 400 });
  }

  const { templateType, description, childProfile, generationProfile } = parsed.data;
  const registration = templateRegistry[templateType];

  if (!registration) {
    return NextResponse.json({ error: "Unknown template type" }, { status: 404 });
  }

  const childContext = [
    childProfile.ageRange && `Age range: ${childProfile.ageRange}`,
    childProfile.communicationLevel &&
      `Communication level: ${childProfile.communicationLevel}`,
    childProfile.interests?.length &&
      `Interests: ${childProfile.interests.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await generateText({
    model: toolsGenerationModel,
    output: Output.object({ schema: registration.aiConfigSchema }),
    prompt: buildPremiumToolPrompt({
      description,
      childContext,
      templateName: registration.meta.name,
      schemaNotes: registration.schemaPrompt,
      generationProfile,
    }),
  });

  return NextResponse.json({ configJson: JSON.stringify(result.output) });
}
```

> **Note:** `generateObject` is deprecated in AI SDK v6. Use `generateText` with `Output.object({ schema })` and access the result via `result.output`.

- [ ] **Step 7: Extend the registry so generation uses real schema objects, not prose-only descriptions**

In `src/features/tools/lib/registry.ts`, add:

```ts
import type { z } from "zod";

export interface TemplateRegistration {
  meta: TemplateMeta;
  Editor: ComponentType<EditorProps<any>>;
  Runtime: ComponentType<RuntimeProps<any>>;
  defaultConfig: unknown;
  parseConfig: (json: string) => unknown;
  aiConfigSchema: z.ZodTypeAny;
  schemaPrompt: string;
}
```

Then wire each template registration to its existing Zod schema and a short schema-focused prompt string.

- [ ] **Step 8: Remove the old Convex generation endpoint after frontend cutover**

Delete:

```txt
convex/tools_ai.ts
```

Also remove any references to `api.tools_ai.generateToolConfig`.

- [ ] **Step 9: Update the prompt library so docs match the implementation**

In `docs/ai/prompt-library.md`, replace the tool generation row with:

```md
| Tool generation config | `claude-sonnet-4-6` via Vercel AI SDK `generateText()` + `Output.object()` | Structured config generation for premium template defaults |
```

Add a short note that tools config generation now runs in a Next.js route with Zod schema validation.

- [ ] **Step 10: Re-run the route test**

Run:

```bash
npm test -- src/app/api/tools/generate-config/__tests__/route.test.ts
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/features/tools/lib/ai src/app/api/tools/generate-config src/features/tools/lib/registry.ts docs/ai/prompt-library.md convex/tools_ai.ts
git commit -m "feat(tools): switch premium config generation to Vercel AI SDK"
```

---

## Task 3: Migrate the builder AI assist flow to the new route

**Files:**
- Modify: `src/features/tools/hooks/use-ai-config-assist.ts`
- Modify: `src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts`
- Modify: `src/features/tools/components/builder/ai-assist-panel.tsx`

- [ ] **Step 1: Write the failing hook test for route-backed premium generation**

Replace the Convex mock approach in `src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts` with:

```ts
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ configJson: '{"title":"Generated"}' }),
}) as never;

import { useAIConfigAssist } from "../use-ai-config-assist";

describe("useAIConfigAssist", () => {
  it("passes premium defaults to the route", async () => {
    const { result } = renderHook(() =>
      useAIConfigAssist({
        templateType: "aac_board",
        childProfile: {},
        generationProfile: {
          targetSetting: "both",
          interactionRichness: "high",
          voicePreference: "elevenlabs-first",
          sensoryMode: "calm",
        },
      })
    );

    await act(async () => {
      await result.current.generate("Make a premium snack board");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/tools/generate-config",
      expect.objectContaining({
        method: "POST",
      })
    );
  });
});
```

- [ ] **Step 2: Run the hook test and confirm failure**

Run:

```bash
npm test -- src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts
```

Expected: FAIL because the hook still calls Convex.

- [ ] **Step 3: Update `useAIConfigAssist` to call the Next route**

Change `src/features/tools/hooks/use-ai-config-assist.ts` to:

```ts
import type { GenerationProfile } from "../lib/ai/generation-profile";
```

and:

```ts
      const res = await fetch("/api/tools/generate-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType,
          description,
          childProfile,
          generationProfile,
        }),
      });

      const result = (await res.json()) as { configJson?: string; error?: string };
```

Remove the `convex/react` dependency from this hook entirely.

- [ ] **Step 4: Update the AI assist panel to send the premium defaults by default**

In `src/features/tools/components/builder/ai-assist-panel.tsx`, call the hook with:

```ts
  const { status, error, generate } = useAIConfigAssist({
    templateType,
    childProfile,
    generationProfile: {
      targetSetting: "both",
      interactionRichness: "high",
      voicePreference: "elevenlabs-first",
      sensoryMode: "calm",
    },
  });
```

Update the helper copy to:

```tsx
Describe the app you want and AI will draft a richer, session-ready setup for you to review.
```

- [ ] **Step 5: Re-run the hook test**

Run:

```bash
npm test -- src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/hooks/use-ai-config-assist.ts src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts src/features/tools/components/builder/ai-assist-panel.tsx
git commit -m "feat(tools): move AI assist to Vercel AI SDK route"
```

---

## Task 4: Make app instances patient-optional from schema through builder UX

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/tools.ts`
- Modify: `convex/__tests__/tools.test.ts`
- Modify: `src/features/tools/hooks/use-tool-builder.ts`
- Modify: `src/features/tools/hooks/__tests__/use-tool-builder.test.ts`
- Modify: `src/features/tools/components/builder/tool-builder-wizard.tsx`

- [ ] **Step 1: Add the failing backend tests**

Add these cases to `convex/__tests__/tools.test.ts`:

```ts
  it("creates a draft app instance without a patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);

    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Portable Snack Board",
      configJson: SAMPLE_CONFIG,
    });

    const instance = await t.query(api.tools.get, { id });
    expect(instance?.patientId).toBeUndefined();
  });
```

- [ ] **Step 2: Add the failing builder hook tests**

Add to `src/features/tools/hooks/__tests__/use-tool-builder.test.ts`:

```ts
  it("allows saveAndAdvance without patientId", async () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.selectTemplate("aac_board"));

    await act(async () => {
      await result.current.saveAndAdvance();
    });

    expect(result.current.instanceId).not.toBeNull();
  });
```

- [ ] **Step 3: Run the targeted tests and confirm failure**

Run:

```bash
npm test -- convex/__tests__/tools.test.ts src/features/tools/hooks/__tests__/use-tool-builder.test.ts
```

Expected: FAIL because `patientId` is currently required.

- [ ] **Step 4: Make the schema and mutation validators optional**

In `convex/schema.ts`:

```ts
patientId: v.optional(v.id("patients"))
```

for both `app_instances` and `tool_events`.

In `convex/tools.ts`, change `create` to:

```ts
  args: {
    templateType: v.string(),
    title: v.string(),
    patientId: v.optional(v.id("patients")),
    configJson: v.string(),
  },
```

- [ ] **Step 5: Remove the patient gate from the builder hook**

In `src/features/tools/hooks/use-tool-builder.ts`, change:

```ts
    if (!patientId || !templateType || !config) return;
```

to:

```ts
    if (!templateType || !config) return;
```

and create with:

```ts
        const payload = {
          templateType,
          title: (config as { title?: string }).title ?? "Untitled",
          configJson: JSON.stringify(config),
          ...(patientId ? { patientId } : {}),
        };
```

- [ ] **Step 6: Update the wizard copy and controls**

In `src/features/tools/components/builder/tool-builder-wizard.tsx`:

```ts
const STEP_LABELS = ["Choose context", "Choose template", "Customize", "Publish"];
```

and step 1 CTA block:

```tsx
<div className="flex items-center gap-3">
  <Button onClick={builder.nextStep}>Continue without child</Button>
  <Button variant="outline" disabled={!builder.patientId} onClick={builder.nextStep}>
    Continue with selected child
  </Button>
</div>
```

- [ ] **Step 7: Re-run the targeted tests**

Run:

```bash
npm test -- convex/__tests__/tools.test.ts src/features/tools/hooks/__tests__/use-tool-builder.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add convex/schema.ts convex/tools.ts convex/__tests__/tools.test.ts src/features/tools/hooks/use-tool-builder.ts src/features/tools/hooks/__tests__/use-tool-builder.test.ts src/features/tools/components/builder/tool-builder-wizard.tsx
git commit -m "feat(tools): make patient selection optional in builder and backend"
```

---

## Task 5: Move speech generation to the official ElevenLabs SDK

**Files:**
- Modify: `convex/aiActions.ts`
- Modify: `convex/__tests__/ai.test.ts`

- [ ] **Step 1: Write the failing speech action test around the SDK-backed happy path**

Add a test in `convex/__tests__/ai.test.ts` that mocks the ElevenLabs client and expects a stored audio URL result.

- [ ] **Step 2: Run the AI action test and confirm failure**

Run:

```bash
npm test -- convex/__tests__/ai.test.ts
```

Expected: FAIL because the test will target SDK usage that does not exist yet.

- [ ] **Step 3: Switch `convex/aiActions.ts` from raw fetch to the official SDK**

Replace the manual fetch block with the ElevenLabs SDK pattern:

```ts
import { ElevenLabsClient } from "elevenlabs";
```

and inside the action:

```ts
    const client = new ElevenLabsClient({ apiKey: elevenLabsApiKey });
    const audio = await client.textToSpeech.convert(resolvedVoiceId, {
      text: args.text,
      modelId: "eleven_flash_v2_5",
      voiceSettings: { stability: 0.5, similarityBoost: 0.75 },
    });

    const audioBuffer = await new Response(audio).arrayBuffer();

    // Note: ElevenLabs SDK v2 uses camelCase for all parameters.
    // model_id → modelId, voice_settings → voiceSettings, similarity_boost → similarityBoost
```

Keep the existing cache behavior.

- [ ] **Step 4: Re-run the AI action test**

Run:

```bash
npm test -- convex/__tests__/ai.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/aiActions.ts convex/__tests__/ai.test.ts
git commit -m "refactor(ai): use official ElevenLabs SDK for speech generation"
```

---

## Task 6: Introduce a host-owned runtime shell, voice controller, and single event pipeline

**Files:**
- Create: `src/features/tools/lib/runtime/runtime-shell.tsx`
- Create: `src/features/tools/lib/runtime/runtime-voice-controller.tsx`
- Create: `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`
- Create: `src/features/tools/lib/runtime/__tests__/runtime-voice-controller.test.tsx`
- Modify: `src/features/tools/lib/registry.ts`
- Modify: `src/features/tools/components/builder/preview-panel.tsx`
- Modify: `src/features/tools/components/runtime/tool-runtime-page.tsx`
- Modify: `src/features/tools/lib/templates/*/runtime.tsx`

- [ ] **Step 1: Write the failing shell and event-ownership tests**

Add a shell test that verifies preview and published exit affordances are rendered.

Add a runtime contract test that renders each template with:

```tsx
<registration.Runtime
  config={registration.defaultConfig as never}
  mode="preview"
  onEvent={() => undefined}
  voice={{ speak: async () => undefined, stop: () => undefined, status: "idle" }}
/>
```

- [ ] **Step 2: Run the runtime tests and confirm failure**

Run:

```bash
npm test -- src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx
```

Expected: FAIL because the host-owned runtime contract does not exist yet.

- [ ] **Step 3: Define the new runtime contract**

In `src/features/tools/lib/registry.ts`, replace the runtime props with:

```ts
export interface RuntimeProps<TConfig = unknown> {
  config: TConfig;
  mode: "preview" | "published";
  onEvent: (type: string, payloadJson?: string) => void;
  voice: {
    speak: (args: { text: string; voice?: string }) => Promise<void>;
    stop: () => void;
    status: "idle" | "loading" | "ready" | "error";
  };
}
```

Remove `shareToken` from template props. Published persistence belongs to the host, not the templates.

- [ ] **Step 4: Add the runtime shell**

Create `src/features/tools/lib/runtime/runtime-shell.tsx`:

```tsx
"use client";

import { X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

export function RuntimeShell({
  mode,
  onExit,
  children,
}: {
  mode: "preview" | "published";
  onExit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-foreground">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
          {mode === "preview" ? "Live preview" : "Published app"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExit}
          aria-label={mode === "preview" ? "Exit fullscreen" : "Exit app"}
        >
          <X className="mr-1 h-4 w-4" />
          Exit
        </Button>
      </div>
      <div className="px-4 pb-6 pt-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Add the host-owned voice controller**

Create `src/features/tools/lib/runtime/runtime-voice-controller.tsx` using `useAction(api.aiActions.generateSpeech)` and local audio state. This controller should live above the templates and pass a `voice` object down through props.

- [ ] **Step 6: Make the host the only persistence layer for published events**

In `src/features/tools/components/runtime/tool-runtime-page.tsx`, keep `logEvent` here and pass only `onEvent` into the template runtime.

In every template runtime, remove direct `useMutation(api.tools.logEvent)` calls. Templates should emit semantic events only.

- [ ] **Step 7: Wire preview and published modes through the shell**

In `src/features/tools/components/builder/preview-panel.tsx`, render:

```tsx
<RuntimeShell mode="preview" onExit={() => document.exitFullscreen?.()}>
  <Runtime config={config} mode="preview" onEvent={noop} voice={voice} />
</RuntimeShell>
```

In `src/features/tools/components/runtime/tool-runtime-page.tsx`, render:

```tsx
<RuntimeShell
  mode="published"
  onExit={() => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/");
  }}
>
  <Runtime config={config} mode="published" onEvent={handleEvent} voice={voice} />
</RuntimeShell>
```

- [ ] **Step 8: Re-run the runtime tests**

Run:

```bash
npm test -- src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/features/tools/lib/runtime src/features/tools/lib/registry.ts src/features/tools/components/builder/preview-panel.tsx src/features/tools/components/runtime/tool-runtime-page.tsx src/features/tools/lib/templates
git commit -m "refactor(tools): move runtime voice and analytics ownership to host shell"
```

---

## Task 7: Add shared premium runtime primitives and upgrade templates to use them

**Files:**
- Create: `src/features/tools/lib/runtime/premium-primitives.tsx`
- Modify: `src/features/tools/lib/templates/aac-board/runtime.tsx`
- Modify: `src/features/tools/lib/templates/first-then-board/runtime.tsx`
- Modify: `src/features/tools/lib/templates/token-board/runtime.tsx`
- Modify: `src/features/tools/lib/templates/visual-schedule/runtime.tsx`
- Modify: `src/features/tools/lib/templates/matching-game/runtime.tsx`

- [ ] **Step 1: Write the failing visual contract tests**

For at least `aac-board` and `token-board`, add tests that assert:

- visible title hierarchy
- visible progress/reinforcement surface where appropriate
- no direct `speechSynthesis` call when `voice` is provided

- [ ] **Step 2: Run the template runtime tests and confirm failure**

Run:

```bash
npm test -- src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx
```

Expected: FAIL because the premium primitives do not exist yet.

- [ ] **Step 3: Add shared premium primitives**

Create `src/features/tools/lib/runtime/premium-primitives.tsx` with components such as:

```tsx
export function PremiumScreen({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) { /* shared layout */ }
export function ProgressRail({ current, total }: { current: number; total: number }) { /* shared progress */ }
export function ReinforcementBanner({ title, body }: { title: string; body?: string }) { /* shared completion UI */ }
export function PromptSurface({ children }: { children: React.ReactNode }) { /* shared raised panel */ }
```

These must follow `DESIGN.md`: warm surfaces, tonal separation, minimal motion, no loud borders-as-layout.

- [ ] **Step 4: Upgrade AAC runtime to use host voice and shared surfaces**

In `src/features/tools/lib/templates/aac-board/runtime.tsx`, replace direct `speechSynthesis` with:

```tsx
      if (config.autoSpeak) {
        void voice.speak({
          text: speakText,
          voice: config.voice,
        });
      }
```

Wrap the screen in `PremiumScreen` and present the buttons inside a calmer, more deliberate layout.

- [ ] **Step 5: Upgrade the other templates to use shared premium primitives**

For `first-then-board`, `token-board`, `visual-schedule`, and `matching-game`:

- use `PremiumScreen`
- use `ProgressRail` where progression exists
- use `ReinforcementBanner` instead of ad hoc emoji-only completion states
- keep current interactions, but make hierarchy and completion feedback consistent

- [ ] **Step 6: Re-run the template tests**

Run:

```bash
npm test -- src/features/tools/lib/templates/aac-board/__tests__/runtime.test.tsx src/features/tools/lib/templates/token-board/__tests__/runtime.test.tsx src/features/tools/lib/templates/first-then-board/__tests__/runtime.test.tsx src/features/tools/lib/templates/visual-schedule/__tests__/runtime.test.tsx src/features/tools/lib/templates/matching-game/__tests__/runtime.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/tools/lib/runtime/premium-primitives.tsx src/features/tools/lib/templates
git commit -m "feat(tools): add shared premium runtime primitives for templates"
```

---

## Task 8: Polish preview and publish UX around the new host shell

**Files:**
- Modify: `src/features/tools/components/builder/preview-panel.tsx`
- Modify: `src/features/tools/components/builder/publish-panel.tsx`
- Modify: `src/app/apps/[shareToken]/page.tsx`

- [ ] **Step 1: Update preview copy to match the host-owned experience**

In `src/features/tools/components/builder/preview-panel.tsx`, use:

```tsx
<p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
  Live preview
</p>
```

- [ ] **Step 2: Update publish copy to use clinician-facing language**

In `src/features/tools/components/builder/publish-panel.tsx`, use:

```tsx
<h2 className="text-2xl font-display font-semibold">App published</h2>
<p className="text-muted-foreground">
  Share this link with a parent, caregiver, or use it yourself in session.
</p>
```

Also change the unpublished CTA label from `Publish tool` to `Publish app`.

- [ ] **Step 3: Keep the public route thin and fix the not-found wording**

In `src/app/apps/[shareToken]/page.tsx`, change:

```tsx
<p className="text-lg font-medium">App not found</p>
<p className="text-sm mt-1">This app link may have expired or been removed.</p>
```

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/components/builder/preview-panel.tsx src/features/tools/components/builder/publish-panel.tsx 'src/app/apps/[shareToken]/page.tsx'
git commit -m "feat(tools): polish preview and publish experience"
```

---

## Task 9: Run verification and remove stale architecture claims

**Files:**
- Modify: `docs/superpowers/specs/2026-04-01-tools-builder-premium-generation-design.md` (only if wording still claims arbitrary app generation)

- [ ] **Step 1: Run the focused test suite**

Run:

```bash
npm test -- convex/__tests__/tools.test.ts convex/__tests__/ai.test.ts src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts src/features/tools/hooks/__tests__/use-tool-builder.test.ts src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx src/features/tools/lib/runtime/__tests__/runtime-voice-controller.test.tsx src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the full unit test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Review the design doc wording and trim misleading claims**

If the design doc still implies arbitrary generated app UIs rather than premium template-driven apps, update it to say:

```md
The tools builder remains template-driven. "Premium generation" here means higher-quality structured configuration plus a richer shared runtime, not freeform app code generation.
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-04-01-tools-builder-premium-generation-design.md
git commit -m "docs(tools): align premium generation language with template-driven architecture"
```

---

## Self-Review

Spec coverage check:

- premium generation quality: covered by Tasks 2, 3, 7
- ElevenLabs-first speech: covered by Tasks 5, 6, 7
- patient-optional creation: covered by Task 4
- fullscreen/published exit affordance: covered by Tasks 6, 8
- anti-basic quality floor: covered by Tasks 2 and 7

Placeholder scan:

- no `TODO`
- all external-framework swaps are explicit
- custom `convex/tools_ai.ts` path is removed rather than coexisting indefinitely

Type consistency:

- generation types live in `src/features/tools/lib/ai/generation-profile.ts`
- runtime contract is unified in `src/features/tools/lib/registry.ts`
- event persistence is explicitly host-owned after Task 6

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-01-tools-builder-premium-generation-vercel-ai-sdk.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
