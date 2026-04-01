# Tools Builder Premium Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the tools builder so it creates premium therapy apps by default, supports patient-optional creation, provides reliable fullscreen/published exit controls, and uses ElevenLabs-first speech inside generated apps.

**Architecture:** Keep the work centered in `src/features/tools` and the existing `convex/tools*` surface. Add a richer generation contract for AI-assisted config creation, a shared tools runtime shell with host controls and voice services, and a small schema/mutation update so app instances can exist with or without a patient. Apply the new runtime contract to each template rather than rebuilding the entire builder.

**Tech Stack:** Next.js 16 App Router, React, Tailwind v4, Convex, Zod, Vitest, convex-test, ElevenLabs via existing `convex/aiActions.ts`, Anthropic SDK

---

## Scope Check

This spec is still one coherent implementation plan, not multiple independent projects:

- generation quality upgrades
- runtime/voice contract upgrades
- patient-optional builder flow
- fullscreen/published exit affordance

They all land in the same feature slice and share the same runtime contract.

---

## File Map

**Modify:**
- `convex/schema.ts` — make `app_instances.patientId` and `tool_events.patientId` optional
- `convex/tools.ts` — allow null patient assignment, preserve analytics behavior, add attach-later support if needed
- `convex/tools_ai.ts` — expand AI config generation contract beyond basic field fill
- `convex/__tests__/tools.test.ts` — cover patient-optional creation and event logging without patient
- `src/features/tools/hooks/use-tool-builder.ts` — remove patient gate from create flow, track fullscreen state if builder shell needs it
- `src/features/tools/hooks/use-ai-config-assist.ts` — send richer generation context to Convex
- `src/features/tools/hooks/__tests__/use-tool-builder.test.ts`
- `src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts`
- `src/features/tools/components/builder/tool-builder-wizard.tsx` — make patient selection optional and improve copy
- `src/features/tools/components/builder/ai-assist-panel.tsx` — collect richer prompt context and premium defaults
- `src/features/tools/components/builder/preview-panel.tsx` — wrap preview in shared runtime shell and fullscreen exit control
- `src/features/tools/components/builder/publish-panel.tsx` — updated published copy and open-preview action
- `src/features/tools/components/runtime/tool-runtime-page.tsx` — render through shared runtime shell with exit affordance
- `src/features/tools/lib/registry.ts` — upgrade runtime prop contract for shared voice and host controls
- `src/features/tools/lib/templates/aac-board/runtime.tsx`
- `src/features/tools/lib/templates/first-then-board/runtime.tsx`
- `src/features/tools/lib/templates/token-board/runtime.tsx`
- `src/features/tools/lib/templates/visual-schedule/runtime.tsx`
- `src/features/tools/lib/templates/matching-game/runtime.tsx`
- `src/app/(app)/tools/new/page.tsx`
- `src/app/(app)/tools/[id]/page.tsx`
- `src/app/apps/[shareToken]/page.tsx`

**Create:**
- `src/features/tools/lib/runtime/runtime-shell.tsx` — shared host chrome for preview/published runtime
- `src/features/tools/lib/runtime/use-runtime-voice.ts` — ElevenLabs-first playback hook
- `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`
- `src/features/tools/lib/runtime/__tests__/use-runtime-voice.test.tsx`
- `src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`
- `convex/lib/premium_tool_prompt.ts` — premium generation rules and blueprint helpers

**Verify against existing docs while implementing:**
- `DESIGN.md`
- `convex/_generated/ai/guidelines.md`
- `docs/superpowers/specs/2026-04-01-tools-builder-premium-generation-design.md`

---

## Task 1: Make app instances patient-optional in schema and Convex mutations

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/tools.ts`
- Test: `convex/__tests__/tools.test.ts`

- [ ] **Step 1: Write the failing Convex tests for patient-optional drafts**

Add the following cases to `convex/__tests__/tools.test.ts`:

```ts
  it("creates a draft app instance without a patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);

    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Portable Snack Board",
      configJson: SAMPLE_CONFIG,
    });

    const instance = await t.query(api.tools.get, { id });
    expect(instance).not.toBeNull();
    expect(instance?.patientId).toBeUndefined();
    expect(instance?.status).toBe("draft");
  });

  it("listBySLP includes drafts without a patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);

    await t.mutation(api.tools.create, {
      templateType: "token_board",
      title: "General Reward Board",
      configJson: SAMPLE_CONFIG,
    });

    const list = await t.query(api.tools.listBySLP, {});
    expect(list.some((instance) => instance.patientId === undefined)).toBe(true);
  });

  it("logEvent stores undefined patientId for patient-neutral apps", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const id = await t.mutation(api.tools.create, {
      templateType: "aac_board",
      title: "Portable Snack Board",
      configJson: SAMPLE_CONFIG,
    });
    const { shareToken } = await t.mutation(api.tools.publish, { id });

    await t.mutation(api.tools.logEvent, {
      shareToken,
      eventType: "app_opened",
    });

    const result = await t.query(api.tools.getByShareToken, { shareToken });
    expect(result?.instance.patientId).toBeUndefined();
  });
```

- [ ] **Step 2: Run the targeted Convex test file and confirm failure**

Run:

```bash
npm test -- convex/__tests__/tools.test.ts
```

Expected: FAIL because `api.tools.create` still requires `patientId`, and schema validators still require patient IDs.

- [ ] **Step 3: Update the Convex schema for optional patient linkage**

In `convex/schema.ts`, change the table fields to:

```ts
  app_instances: defineTable({
    templateType: v.string(),
    title: v.string(),
    patientId: v.optional(v.id("patients")),
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
```

and:

```ts
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
  })
```

- [ ] **Step 4: Update mutations and queries to accept optional patientId**

In `convex/tools.ts`, change the `create` args to:

```ts
  args: {
    templateType: v.string(),
    title: v.string(),
    patientId: v.optional(v.id("patients")),
    configJson: v.string(),
  },
```

and insert with:

```ts
    return ctx.db.insert("app_instances", {
      templateType: args.templateType,
      title: args.title,
      patientId: args.patientId,
      slpUserId: identity.subject,
      configJson: args.configJson,
      status: "draft",
      version: 1,
    });
```

Also update `logEvent` to persist `patientId: instance.patientId` without assuming it exists:

```ts
    await ctx.db.insert("tool_events", {
      appInstanceId: instance._id,
      patientId: instance.patientId,
      eventType: args.eventType,
      eventPayloadJson: args.eventPayloadJson,
    });
```

Do not widen `listByPatient` or `getEventSummaryByPatient`; those remain patient-scoped queries.

- [ ] **Step 5: Re-run the targeted tests**

Run:

```bash
npm test -- convex/__tests__/tools.test.ts
```

Expected: PASS for the new patient-optional cases and existing tools tests.

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/tools.ts convex/__tests__/tools.test.ts
git commit -m "feat(tools): allow patient-optional app drafts"
```

---

## Task 2: Remove the patient gate from the builder flow

**Files:**
- Modify: `src/features/tools/hooks/use-tool-builder.ts`
- Modify: `src/features/tools/components/builder/tool-builder-wizard.tsx`
- Modify: `src/app/(app)/tools/new/page.tsx`
- Modify: `src/app/(app)/tools/[id]/page.tsx`
- Test: `src/features/tools/hooks/__tests__/use-tool-builder.test.ts`

- [ ] **Step 1: Write the failing hook tests for patient-optional saving**

Add the following to `src/features/tools/hooks/__tests__/use-tool-builder.test.ts`:

```ts
  it("allows advancing past step 1 without selecting a patient", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.nextStep());
    expect(result.current.step).toBe(2);
  });

  it("saveAndAdvance creates an instance without patientId", async () => {
    const createMock = vi.fn().mockResolvedValue("inst-optional");
    const updateMock = vi.fn();
    const publishMock = vi.fn();
    vi.mocked(useMutation)
      .mockReturnValueOnce(createMock)
      .mockReturnValueOnce(updateMock)
      .mockReturnValueOnce(publishMock);

    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.selectTemplate("aac_board"));

    await act(async () => {
      await result.current.saveAndAdvance();
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        templateType: "aac_board",
      })
    );
    expect(createMock.mock.calls[0][0]).not.toHaveProperty("patientId");
  });
```

- [ ] **Step 2: Run the hook test file and confirm failure**

Run:

```bash
npm test -- src/features/tools/hooks/__tests__/use-tool-builder.test.ts
```

Expected: FAIL because `saveAndAdvance` currently returns early when `patientId` is missing.

- [ ] **Step 3: Update `useToolBuilder` to save without a patient**

In `src/features/tools/hooks/use-tool-builder.ts`, change the save gate from:

```ts
    if (!patientId || !templateType || !config) return;
```

to:

```ts
    if (!templateType || !config) return;
```

and change the create payload to:

```ts
        const payload = {
          templateType,
          title: (config as { title?: string }).title ?? "Untitled",
          configJson: JSON.stringify(config),
          ...(patientId ? { patientId } : {}),
        };
        const id = await createInstance(payload);
```

- [ ] **Step 4: Update the builder wizard copy and controls**

In `src/features/tools/components/builder/tool-builder-wizard.tsx`:

- rename step label `"Choose child"` to `"Choose context"`
- change the step 1 heading/copy to:

```tsx
            <h1 className="text-2xl font-display font-semibold">Who is this app for?</h1>
            <p className="text-muted-foreground mt-1">
              Choose a child now, or skip this and attach the app later.
            </p>
```

- keep the `Select`, but change the primary CTA to:

```tsx
          <div className="flex items-center gap-3">
            <Button onClick={builder.nextStep}>Continue without child</Button>
            <Button
              variant="outline"
              disabled={!builder.patientId}
              onClick={builder.nextStep}
            >
              Continue with selected child
            </Button>
          </div>
```

Use clinician-facing copy in the UI, but keep the internal state name `patientId`.

- [ ] **Step 5: Re-run the hook tests**

Run:

```bash
npm test -- src/features/tools/hooks/__tests__/use-tool-builder.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/hooks/use-tool-builder.ts src/features/tools/hooks/__tests__/use-tool-builder.test.ts src/features/tools/components/builder/tool-builder-wizard.tsx "src/app/(app)/tools/new/page.tsx" "src/app/(app)/tools/[id]/page.tsx"
git commit -m "feat(tools): make builder patient selection optional"
```

---

## Task 3: Upgrade the AI config generation contract for premium defaults

**Files:**
- Create: `convex/lib/premium_tool_prompt.ts`
- Modify: `convex/tools_ai.ts`
- Modify: `src/features/tools/hooks/use-ai-config-assist.ts`
- Modify: `src/features/tools/components/builder/ai-assist-panel.tsx`
- Test: `src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts`

- [ ] **Step 1: Write the failing hook test for richer generation context**

Add this case to `src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts`:

```ts
  it("passes premium defaults to the generate action", async () => {
    const actionMock = vi.fn().mockResolvedValue({ configJson: '{"title":"Generated"}' });
    vi.mocked(useAction).mockReturnValue(actionMock);

    const { result } = renderHook(() =>
      useAIConfigAssist({
        templateType: "aac_board",
        childProfile: {},
        generationProfile: {
          targetSetting: "clinic",
          interactionRichness: "high",
          voicePreference: "elevenlabs-first",
        },
      })
    );

    await act(async () => {
      await result.current.generate("Make a premium snack board");
    });

    expect(actionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        generationProfile: expect.objectContaining({
          interactionRichness: "high",
          voicePreference: "elevenlabs-first",
        }),
      })
    );
  });
```

- [ ] **Step 2: Run the AI assist hook test file and confirm failure**

Run:

```bash
npm test -- src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts
```

Expected: FAIL because `useAIConfigAssist` does not yet accept or forward a `generationProfile`.

- [ ] **Step 3: Add a shared premium prompt helper**

Create `convex/lib/premium_tool_prompt.ts`:

```ts
export interface PremiumGenerationProfile {
  targetSetting?: "clinic" | "home" | "both";
  interactionRichness?: "standard" | "high";
  voicePreference?: "elevenlabs-first";
  sensoryMode?: "calm" | "energetic";
}

export function buildPremiumToolPrompt(args: {
  description: string;
  childContext: string;
  schemaDescription: string;
  generationProfile?: PremiumGenerationProfile;
}) {
  return `You are helping a speech-language pathologist build a premium therapy app.

Design rules:
- default to warm-professional, therapy-grade UI
- avoid basic generic layouts and placeholder copy
- include richer states, guidance, and reinforcement where relevant
- assume speech should use ElevenLabs-style high quality output when the template supports voice
- prefer clinician-usable experiences over flashy but distracting visuals

Generation profile:
${JSON.stringify(args.generationProfile ?? { interactionRichness: "high", voicePreference: "elevenlabs-first" }, null, 2)}

Child context:
${args.childContext || "No child profile provided."}

Clinician request:
${args.description}

Return only valid JSON for this schema:
${args.schemaDescription}`;
}
```

- [ ] **Step 4: Update `convex/tools_ai.ts` to use the new contract**

Change the args and prompt construction in `convex/tools_ai.ts` to:

```ts
    generationProfile: v.optional(
      v.object({
        targetSetting: v.optional(
          v.union(v.literal("clinic"), v.literal("home"), v.literal("both"))
        ),
        interactionRichness: v.optional(
          v.union(v.literal("standard"), v.literal("high"))
        ),
        voicePreference: v.optional(v.literal("elevenlabs-first")),
        sensoryMode: v.optional(
          v.union(v.literal("calm"), v.literal("energetic"))
        ),
      })
    ),
```

and:

```ts
    const prompt = buildPremiumToolPrompt({
      description: args.description,
      childContext,
      schemaDescription,
      generationProfile: args.generationProfile,
    });
```

Also upgrade the model to the current stronger builder default already used elsewhere in the repo:

```ts
        model: "claude-sonnet-4-6",
```

- [ ] **Step 5: Update the hook and panel to send premium defaults**

In `src/features/tools/hooks/use-ai-config-assist.ts`, widen the hook signature:

```ts
interface GenerationProfile {
  targetSetting?: "clinic" | "home" | "both";
  interactionRichness?: "standard" | "high";
  voicePreference?: "elevenlabs-first";
  sensoryMode?: "calm" | "energetic";
}
```

and pass it through:

```ts
        const result = await generateAction({
          templateType,
          description,
          childProfile,
          generationProfile,
        });
```

In `src/features/tools/components/builder/ai-assist-panel.tsx`, call the hook with defaults:

```tsx
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

Update the helper copy to say:

```tsx
        Describe the app you want and AI will draft a richer, session-ready setup for you to review.
```

- [ ] **Step 6: Re-run the AI assist tests**

Run:

```bash
npm test -- src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add convex/lib/premium_tool_prompt.ts convex/tools_ai.ts src/features/tools/hooks/use-ai-config-assist.ts src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts src/features/tools/components/builder/ai-assist-panel.tsx
git commit -m "feat(tools): upgrade AI assist with premium generation defaults"
```

---

## Task 4: Add a shared runtime shell and ElevenLabs-first voice service

**Files:**
- Create: `src/features/tools/lib/runtime/runtime-shell.tsx`
- Create: `src/features/tools/lib/runtime/use-runtime-voice.ts`
- Create: `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`
- Create: `src/features/tools/lib/runtime/__tests__/use-runtime-voice.test.tsx`
- Modify: `src/features/tools/lib/registry.ts`
- Modify: `src/features/tools/components/builder/preview-panel.tsx`
- Modify: `src/features/tools/components/runtime/tool-runtime-page.tsx`

- [ ] **Step 1: Write failing tests for exit controls and voice behavior**

Create `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RuntimeShell } from "../runtime-shell";

describe("RuntimeShell", () => {
  it("renders an exit button in preview mode", () => {
    render(
      <RuntimeShell mode="preview" title="Preview">
        <div>child app</div>
      </RuntimeShell>
    );

    expect(screen.getByRole("button", { name: /exit fullscreen/i })).toBeInTheDocument();
  });
});
```

Create `src/features/tools/lib/runtime/__tests__/use-runtime-voice.test.tsx`:

```tsx
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useAction: vi.fn(() => vi.fn().mockResolvedValue({ audioUrl: "https://audio.test/file.mp3" })),
}));

import { useRuntimeVoice } from "../use-runtime-voice";

describe("useRuntimeVoice", () => {
  it("prefers generated audio over browser speech", async () => {
    const { result } = renderHook(() => useRuntimeVoice());

    await act(async () => {
      await result.current.speak({ text: "Hello", voice: "child-friendly" });
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.lastProvider).toBe("elevenlabs");
  });
});
```

- [ ] **Step 2: Run the runtime tests and confirm failure**

Run:

```bash
npm test -- src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx src/features/tools/lib/runtime/__tests__/use-runtime-voice.test.tsx
```

Expected: FAIL because the runtime shell and voice hook do not exist.

- [ ] **Step 3: Add the shared runtime shell**

Create `src/features/tools/lib/runtime/runtime-shell.tsx`:

```tsx
"use client";

import { X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

export function RuntimeShell({
  mode,
  title,
  onExit,
  children,
}: {
  mode: "preview" | "published";
  title: string;
  onExit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-foreground">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur">
        <p className="text-xs font-mono uppercase tracking-[0.1em] text-muted-foreground">
          {mode === "preview" ? "Preview mode" : "Published app"}
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

- [ ] **Step 4: Add the ElevenLabs-first voice hook**

Create `src/features/tools/lib/runtime/use-runtime-voice.ts`:

```ts
"use client";

import { useAction } from "convex/react";
import { useRef, useState } from "react";

import { api } from "@convex/_generated/api";

type VoiceStatus = "idle" | "loading" | "ready" | "error";

export function useRuntimeVoice() {
  const generateSpeech = useAction(api.aiActions.generateSpeech);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [lastProvider, setLastProvider] = useState<"elevenlabs" | "browser" | null>(null);

  const speak = async ({ text, voice }: { text: string; voice?: string }) => {
    setStatus("loading");
    try {
      const { audioUrl } = await generateSpeech({ text, voice });
      audioRef.current?.pause();
      audioRef.current = new Audio(audioUrl);
      await audioRef.current.play();
      setLastProvider("elevenlabs");
      setStatus("ready");
      return;
    } catch {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
        setLastProvider("browser");
        setStatus("ready");
        return;
      }
      setStatus("error");
      throw new Error("No voice provider available");
    }
  };

  const stop = () => {
    audioRef.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setStatus("idle");
  };

  return { status, lastProvider, speak, stop };
}
```

- [ ] **Step 5: Wire preview and published runtime through the shell**

Update `src/features/tools/components/builder/preview-panel.tsx` to render:

```tsx
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[28px] shadow-sm">
        <RuntimeShell
          mode="preview"
          title="Preview"
          onExit={() => document.exitFullscreen?.()}
        >
          <Runtime config={config} shareToken="preview" onEvent={noop} />
        </RuntimeShell>
      </div>
```

Update `src/features/tools/components/runtime/tool-runtime-page.tsx` to wrap the runtime:

```tsx
  return (
    <RuntimeShell
      mode="published"
      title={config.title ?? "Published app"}
      onExit={() => {
        if (window.history.length > 1) window.history.back();
        else window.location.assign("/");
      }}
    >
      <Runtime config={config} shareToken={shareToken} onEvent={handleEvent} />
    </RuntimeShell>
  );
```

- [ ] **Step 6: Re-run the runtime tests**

Run:

```bash
npm test -- src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx src/features/tools/lib/runtime/__tests__/use-runtime-voice.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/tools/lib/runtime src/features/tools/components/builder/preview-panel.tsx src/features/tools/components/runtime/tool-runtime-page.tsx
git commit -m "feat(tools): add shared runtime shell and ElevenLabs-first voice"
```

---

## Task 5: Move template runtimes onto the shared voice/runtime contract

**Files:**
- Modify: `src/features/tools/lib/registry.ts`
- Modify: `src/features/tools/lib/templates/aac-board/runtime.tsx`
- Modify: `src/features/tools/lib/templates/first-then-board/runtime.tsx`
- Modify: `src/features/tools/lib/templates/token-board/runtime.tsx`
- Modify: `src/features/tools/lib/templates/visual-schedule/runtime.tsx`
- Modify: `src/features/tools/lib/templates/matching-game/runtime.tsx`
- Create: `src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`

- [ ] **Step 1: Write the failing contract test**

Create `src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { templateRegistry } from "../../registry";

describe("template runtime contract", () => {
  it("renders each runtime with the shared preview contract", () => {
    for (const registration of Object.values(templateRegistry)) {
      expect(() =>
        render(
          <registration.Runtime
            config={registration.defaultConfig as never}
            shareToken="preview"
            onEvent={() => undefined}
          />
        )
      ).not.toThrow();
    }
  });
});
```

- [ ] **Step 2: Run the runtime contract test**

Run:

```bash
npm test -- src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx
```

Expected: FAIL once the registry contract is widened but templates are not updated.

- [ ] **Step 3: Update the registry runtime props**

In `src/features/tools/lib/registry.ts`, change the runtime contract to:

```ts
export interface RuntimeProps<TConfig = unknown> {
  config: TConfig;
  shareToken: string;
  onEvent: (type: string, payloadJson?: string) => void;
  voice?: {
    speak: (args: { text: string; voice?: string }) => Promise<void>;
    stop: () => void;
    status: "idle" | "loading" | "ready" | "error";
  };
}
```

- [ ] **Step 4: Replace direct browser TTS in AAC runtime**

In `src/features/tools/lib/templates/aac-board/runtime.tsx`, replace the direct `SpeechSynthesisUtterance` block with:

```tsx
      if (config.autoSpeak) {
        if (voice) {
          void voice.speak({
            text: speakText,
            voice: config.voice,
          });
        } else if (typeof window !== "undefined") {
          const utterance = new SpeechSynthesisUtterance(speakText);
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
        }
      }
```

Do not remove the browser fallback. The shared hook should still be preferred when present.

- [ ] **Step 5: Pass the voice prop through the other runtimes**

For `first-then-board`, `token-board`, `visual-schedule`, and `matching-game` runtimes:

- widen the function signature to accept `voice`
- keep behavior unchanged where there is no speech yet
- when a runtime has celebratory or instructional speech already, route it through `voice?.speak(...)`

Use this signature shape everywhere:

```tsx
export function TokenBoardRuntime({
  config,
  shareToken,
  onEvent,
  voice,
}: RuntimeProps<TokenBoardConfig>) {
```

- [ ] **Step 6: Re-run the runtime contract test**

Run:

```bash
npm test -- src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/tools/lib/registry.ts src/features/tools/lib/templates/*/runtime.tsx src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx
git commit -m "refactor(tools): move template runtimes onto shared voice contract"
```

---

## Task 6: Polish the preview and published experience around the new shell

**Files:**
- Modify: `src/features/tools/components/builder/preview-panel.tsx`
- Modify: `src/features/tools/components/builder/publish-panel.tsx`
- Modify: `src/app/apps/[shareToken]/page.tsx`
- Test: `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`

- [ ] **Step 1: Add the failing UX test for published shell copy**

Extend `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx` with:

```tsx
  it("renders published mode label", () => {
    render(
      <RuntimeShell mode="published" title="Published">
        <div>child app</div>
      </RuntimeShell>
    );

    expect(screen.getByText(/published app/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the shell test**

Run:

```bash
npm test -- src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx
```

Expected: PASS or FAIL depending on the exact shell copy; if it fails, adjust the shell copy before continuing.

- [ ] **Step 3: Improve preview and publish UX copy**

In `src/features/tools/components/builder/preview-panel.tsx`, update the header text from:

```tsx
      <p className="text-xs text-muted-foreground text-center mb-3 uppercase tracking-wide">
        Preview — child view
      </p>
```

to:

```tsx
      <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
        Live preview
      </p>
```

In `src/features/tools/components/builder/publish-panel.tsx`, update the success copy to:

```tsx
          <h2 className="text-2xl font-display font-semibold">App published</h2>
          <p className="text-muted-foreground">
            Share this link with a parent, caregiver, or use it yourself in session.
          </p>
```

- [ ] **Step 4: Keep the public page thin**

In `src/app/apps/[shareToken]/page.tsx`, keep the route thin and update the not-found copy only if needed:

```tsx
          <p className="text-lg font-medium">App not found</p>
          <p className="text-sm mt-1">This app link may have expired or been removed.</p>
```

Do not add runtime logic here; keep it in `ToolRuntimePage`.

- [ ] **Step 5: Run the targeted tests**

Run:

```bash
npm test -- src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/components/builder/preview-panel.tsx src/features/tools/components/builder/publish-panel.tsx src/app/apps/[shareToken]/page.tsx src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx
git commit -m "feat(tools): improve preview and published runtime shell UX"
```

---

## Task 7: Run verification for the full tools slice

**Files:**
- No code changes expected

- [ ] **Step 1: Run focused unit and hook tests**

Run:

```bash
npm test -- convex/__tests__/tools.test.ts src/features/tools/hooks/__tests__/use-tool-builder.test.ts src/features/tools/hooks/__tests__/use-ai-config-assist.test.ts src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx src/features/tools/lib/runtime/__tests__/use-runtime-voice.test.tsx src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the entire tools feature test suite**

Run:

```bash
npm test -- src/features/tools
```

Expected: PASS.

- [ ] **Step 3: Run the full project unit suite if time permits**

Run:

```bash
npm test
```

Expected: PASS. If unrelated failures exist, record them explicitly before merging.

- [ ] **Step 4: Manual smoke-check in the app**

Run:

```bash
npm run dev
```

Then verify:

- `/tools/new` lets you continue without selecting a child
- template preview shows the shared shell and exit button
- AAC preview speech uses the Convex TTS path when available
- published `/apps/[shareToken]` renders the shared shell and exit control

- [ ] **Step 5: Final commit for any verification-driven fixes**

```bash
git add -A
git commit -m "test(tools): verify premium generation and runtime flow"
```

---

## Spec Coverage Check

- Premium generation defaults: covered by Task 3.
- Shared runtime and voice abstraction: covered by Tasks 4 and 5.
- Patient-optional builder flow: covered by Tasks 1 and 2.
- Fullscreen/published exit affordance: covered by Tasks 4 and 6.
- Tests and quality guardrails: covered by Tasks 1 through 7.

## Placeholder Scan

No `TODO`, `TBD`, or deferred “add validation later” steps remain. Each task names exact files, code targets, commands, and expected outcomes.

## Type Consistency Check

- `patientId` remains the internal field name everywhere.
- `generationProfile` is the shared AI assist contract.
- `voice` on `RuntimeProps` is the shared runtime speech interface.
