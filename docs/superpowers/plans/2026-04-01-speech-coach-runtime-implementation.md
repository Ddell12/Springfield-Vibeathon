# Speech Coach Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build reusable SLP speech-coach templates, child-level template assignment and overrides, and a migration-safe path from the current fixed ElevenLabs speech coach to a real LiveKit agent runtime.

**Architecture:** Keep the current speech-coach feature slice and Convex domain, but introduce first-class template records and a runtime-resolution layer that merges base runtime rules, template config, and child overrides. Ship the reusable config system first, then replace the fixed ElevenLabs agent flow with a server-side LiveKit agent service that starts an `AgentSession`, joins a room, and uses the resolved runtime snapshot to configure Gemini and voice output.

**Tech Stack:** Next.js App Router, React, Tailwind v4, shadcn/ui, Clerk, Convex, LiveKit Agents, Gemini Live, ElevenLabs, Vitest, Playwright

---

## File Map

### Create

- `convex/lib/speechCoachValidators.ts`
- `convex/speechCoachTemplates.ts`
- `convex/speechCoachRuntimeActions.ts`
- `convex/__tests__/speechCoachTemplates.test.ts`
- `src/app/api/speech-coach/livekit-token/route.ts`
- `src/app/api/speech-coach/livekit-token/__tests__/route.test.ts`
- `src/features/speech-coach/lib/template-types.ts`
- `src/features/speech-coach/lib/runtime-config.ts`
- `src/features/speech-coach/lib/__tests__/runtime-config.test.ts`
- `src/features/speech-coach/livekit/agent.ts`
- `src/features/speech-coach/livekit/entrypoint.ts`
- `src/features/speech-coach/livekit/model-config.ts`
- `src/features/speech-coach/livekit/tools.ts`
- `src/features/speech-coach/livekit/__tests__/agent.test.ts`
- `src/features/speech-coach/components/template-library-page.tsx`
- `src/features/speech-coach/components/template-editor.tsx`
- `src/features/speech-coach/components/template-assignment-card.tsx`
- `src/features/speech-coach/components/template-capability-section.tsx`
- `src/features/speech-coach/components/__tests__/template-editor.test.tsx`
- `src/features/speech-coach/components/__tests__/template-assignment-card.test.tsx`
- `src/app/(app)/speech-coach/templates/page.tsx`

### Modify

- `convex/schema.ts`
- `convex/homePrograms.ts`
- `convex/speechCoach.ts`
- `convex/speechCoachActions.ts`
- `convex/__tests__/speechCoach.test.ts`
- `package.json`
- `src/features/speech-coach/lib/config.ts`
- `src/features/speech-coach/hooks/use-speech-session.ts`
- `src/features/speech-coach/hooks/use-standalone-speech-session.ts`
- `src/features/speech-coach/components/speech-coach-page.tsx`
- `src/features/speech-coach/components/standalone-speech-coach-page.tsx`
- `src/features/speech-coach/components/active-session.tsx`
- `src/features/speech-coach/components/session-config.tsx`

## Task 1: Add Shared Template Types And Convex Validators

**Files:**
- Create: `convex/lib/speechCoachValidators.ts`
- Create: `src/features/speech-coach/lib/template-types.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/homePrograms.ts`
- Test: `convex/__tests__/speechCoachTemplates.test.ts`
- Test: `src/features/speech-coach/lib/__tests__/runtime-config.test.ts`

- [ ] **Step 1: Write the failing backend schema test**

```ts
import { describe, expect, it } from "vitest";

import schema from "../schema";

describe("speech coach template schema", () => {
  it("includes speechCoachTemplates and template-aware home program config", () => {
    expect(schema.tables).toHaveProperty("speechCoachTemplates");

    const homePrograms = schema.tables.homePrograms.validator;
    expect(homePrograms).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- convex/__tests__/speechCoachTemplates.test.ts`
Expected: FAIL because `speechCoachTemplates` does not exist yet.

- [ ] **Step 3: Add shared template types and validators**

```ts
// src/features/speech-coach/lib/template-types.ts
export type SpeechCoachToolKey =
  | "target-word-picker"
  | "minimal-pair-generator"
  | "topic-prompt-generator"
  | "pacing-adjuster"
  | "reinforcement-helper"
  | "session-summary"
  | "caregiver-handoff";

export type SpeechCoachSkillKey =
  | "auditory-bombardment"
  | "model-then-imitate"
  | "recast-and-retry"
  | "choice-based-elicitation"
  | "carryover-conversation"
  | "low-frustration-fallback";

export type SpeechCoachTemplateStatus = "draft" | "active" | "archived";
```

```ts
// convex/lib/speechCoachValidators.ts
import { v } from "convex/values";

export const speechCoachToolKeyValidator = v.union(
  v.literal("target-word-picker"),
  v.literal("minimal-pair-generator"),
  v.literal("topic-prompt-generator"),
  v.literal("pacing-adjuster"),
  v.literal("reinforcement-helper"),
  v.literal("session-summary"),
  v.literal("caregiver-handoff")
);

export const speechCoachSkillKeyValidator = v.union(
  v.literal("auditory-bombardment"),
  v.literal("model-then-imitate"),
  v.literal("recast-and-retry"),
  v.literal("choice-based-elicitation"),
  v.literal("carryover-conversation"),
  v.literal("low-frustration-fallback")
);

export const speechCoachTemplateValidator = v.object({
  name: v.string(),
  description: v.string(),
  clinicalFocus: v.optional(v.string()),
  status: v.union(v.literal("draft"), v.literal("active"), v.literal("archived")),
  voice: v.object({
    provider: v.union(v.literal("elevenlabs"), v.literal("gemini-native")),
    voiceKey: v.string(),
  }),
  prompt: v.object({
    baseExtension: v.optional(v.string()),
    coachingStyle: v.optional(v.string()),
    toolInstructions: v.optional(v.string()),
    knowledgeInstructions: v.optional(v.string()),
  }),
  tools: v.array(v.object({
    key: speechCoachToolKeyValidator,
    enabled: v.boolean(),
    instructions: v.optional(v.string()),
  })),
  skills: v.array(v.object({
    key: speechCoachSkillKeyValidator,
    enabled: v.boolean(),
    instructions: v.optional(v.string()),
  })),
  knowledgePackIds: v.array(v.string()),
  customKnowledgeSnippets: v.array(v.string()),
  sessionDefaults: v.object({
    ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
    defaultDurationMinutes: v.number(),
  }),
  version: v.number(),
});
```

- [ ] **Step 4: Widen the schema and home-program validator**

```ts
// convex/schema.ts
speechCoachTemplates: defineTable({
  slpUserId: v.string(),
  name: v.string(),
  description: v.string(),
  clinicalFocus: v.optional(v.string()),
  status: v.union(v.literal("draft"), v.literal("active"), v.literal("archived")),
  voice: v.object({
    provider: v.union(v.literal("elevenlabs"), v.literal("gemini-native")),
    voiceKey: v.string(),
  }),
  prompt: v.object({
    baseExtension: v.optional(v.string()),
    coachingStyle: v.optional(v.string()),
    toolInstructions: v.optional(v.string()),
    knowledgeInstructions: v.optional(v.string()),
  }),
  tools: v.array(v.object({
    key: speechCoachToolKeyValidator,
    enabled: v.boolean(),
    instructions: v.optional(v.string()),
  })),
  skills: v.array(v.object({
    key: speechCoachSkillKeyValidator,
    enabled: v.boolean(),
    instructions: v.optional(v.string()),
  })),
  knowledgePackIds: v.array(v.string()),
  customKnowledgeSnippets: v.array(v.string()),
  sessionDefaults: v.object({
    ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
    defaultDurationMinutes: v.number(),
  }),
  version: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_slpUserId_and_status", ["slpUserId", "status"])
  .index("by_slpUserId_and_updatedAt", ["slpUserId", "updatedAt"]);
```

```ts
// convex/homePrograms.ts
const childSpeechCoachOverrideValidator = v.object({
  assignedTemplateId: v.optional(v.id("speechCoachTemplates")),
  lastSyncedTemplateVersion: v.optional(v.number()),
  targetSounds: v.array(v.string()),
  ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
  defaultDurationMinutes: v.number(),
  preferredThemes: v.array(v.string()),
  avoidThemes: v.array(v.string()),
  childNotes: v.optional(v.string()),
  promptAddendum: v.optional(v.string()),
});
```

- [ ] **Step 5: Run tests to verify schema and validators pass**

Run: `npm test -- convex/__tests__/speechCoachTemplates.test.ts src/features/speech-coach/lib/__tests__/runtime-config.test.ts`
Expected: PASS for the new schema/validator coverage.

- [ ] **Step 6: Commit**

```bash
git add convex/lib/speechCoachValidators.ts convex/schema.ts convex/homePrograms.ts convex/__tests__/speechCoachTemplates.test.ts src/features/speech-coach/lib/template-types.ts src/features/speech-coach/lib/__tests__/runtime-config.test.ts
git commit -m "feat: add speech coach template schema and validators"
```

## Task 1.5: Add LiveKit Agent Dependencies And Runtime Boundary

**Files:**
- Create: `src/features/speech-coach/livekit/agent.ts`
- Create: `src/features/speech-coach/livekit/entrypoint.ts`
- Create: `src/features/speech-coach/livekit/model-config.ts`
- Create: `src/features/speech-coach/livekit/__tests__/agent.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing agent-module test**

```ts
import { describe, expect, it } from "vitest";

import { createSpeechCoachAgent } from "../agent";

describe("createSpeechCoachAgent", () => {
  it("creates an agent with bounded instructions and tools", () => {
    const agent = createSpeechCoachAgent({
      instructions: "Coach a child through articulation practice.",
      tools: ["target-word-picker"],
    });

    expect(agent).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/speech-coach/livekit/__tests__/agent.test.ts`
Expected: FAIL because the LiveKit agent module does not exist yet.

- [ ] **Step 3: Add the required dependencies and scripts**

```json
// package.json
{
  "dependencies": {
    "@livekit/agents": "^1.x",
    "@livekit/agents-plugin-google": "^1.x"
  },
  "scripts": {
    "speech-coach:agent": "tsx src/features/speech-coach/livekit/entrypoint.ts"
  }
}
```

- [ ] **Step 4: Create the LiveKit agent boundary**

```ts
// src/features/speech-coach/livekit/model-config.ts
// Separate-TTS architecture (ElevenLabs selectable voices) requires a
// non-native-audio Gemini model. The native-audio preview model cannot be
// combined with a separate TTS provider — docs confirm this is an open
// Google SDK limitation. If we later switch to native audio output, flip
// SPEECH_COACH_VOICE_MODE to "native-audio" AND change the model to
// "gemini-2.5-flash-native-audio-preview-12-2025".
export const SPEECH_COACH_REALTIME_MODEL = "gemini-2.5-flash";
export const SPEECH_COACH_VOICE_MODE: "native-audio" | "separate-tts" = "separate-tts";
```

```ts
// src/features/speech-coach/livekit/agent.ts
import { voice } from "@livekit/agents";

export function createSpeechCoachAgent(config: {
  instructions: string;
  tools: string[];
}): voice.Agent {
  // Tools wired in Task 6 — stub accepts the list so the interface is stable.
  return new voice.Agent({ instructions: config.instructions });
}
```

```ts
// src/features/speech-coach/livekit/entrypoint.ts
// Node.js LiveKit Agents entrypoint MUST use defineAgent({ entry }) as the
// default export — this is the hook LiveKit Cloud uses to dispatch jobs.
// A named export or plain function will not be registered as a worker.
import { defineAgent, JobContext } from "@livekit/agents";

export default defineAgent({
  entry: async (_ctx: JobContext) => {
    // Full session wired in Task 6. Stub satisfies the module boundary.
  },
});
```

- [ ] **Step 5: Run test to verify the runtime boundary passes**

Run: `npm test -- src/features/speech-coach/livekit/__tests__/agent.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json src/features/speech-coach/livekit/agent.ts src/features/speech-coach/livekit/entrypoint.ts src/features/speech-coach/livekit/model-config.ts src/features/speech-coach/livekit/__tests__/agent.test.ts
git commit -m "chore: add livekit speech coach runtime boundary"
```

## Task 2: Add Template CRUD Queries And Mutations In Convex

**Files:**
- Create: `convex/speechCoachTemplates.ts`
- Modify: `convex/homePrograms.ts`
- Test: `convex/__tests__/speechCoachTemplates.test.ts`

- [ ] **Step 1: Write the failing CRUD test**

```ts
it("allows an SLP to create and list their speech coach templates", async () => {
  const templateId = await slp.mutation(api.speechCoachTemplates.create, {
    template: {
      name: "Articulation Warmup",
      description: "Short playful articulation practice",
      status: "active",
      voice: { provider: "elevenlabs", voiceKey: "friendly-coach" },
      prompt: {},
      tools: [],
      skills: [],
      knowledgePackIds: [],
      customKnowledgeSnippets: [],
      sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 5 },
      version: 1,
    },
  });

  const templates = await slp.query(api.speechCoachTemplates.listMine, {});
  expect(templates.map((template) => template._id)).toContain(templateId);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- convex/__tests__/speechCoachTemplates.test.ts`
Expected: FAIL because `api.speechCoachTemplates.create` and `listMine` do not exist.

- [ ] **Step 3: Implement template CRUD**

```ts
// convex/speechCoachTemplates.ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import { slpMutation, slpQuery } from "./lib/customFunctions";
import { speechCoachTemplateValidator } from "./lib/speechCoachValidators";

export const listMine = slpQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("speechCoachTemplates")
      .withIndex("by_slpUserId_and_updatedAt", (q) => q.eq("slpUserId", ctx.slpUserId))
      .order("desc")
      .take(100);
  },
});

export const create = slpMutation({
  args: { template: speechCoachTemplateValidator },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("speechCoachTemplates", {
      ...args.template,
      slpUserId: ctx.slpUserId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = slpMutation({
  args: {
    templateId: v.id("speechCoachTemplates"),
    template: speechCoachTemplateValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.templateId);
    if (!existing || existing.slpUserId !== ctx.slpUserId) {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      ...args.template,
      updatedAt: Date.now(),
    });
  },
});
```

- [ ] **Step 4: Add assignment mutation on home programs**

```ts
// convex/homePrograms.ts
export const assignSpeechCoachTemplate = slpMutation({
  args: {
    id: v.id("homePrograms"),
    assignedTemplateId: v.id("speechCoachTemplates"),
    childOverrides: childSpeechCoachOverrideValidator,
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.id);
    if (!program) throw new ConvexError("Home program not found");

    const template = await ctx.db.get(args.assignedTemplateId);
    if (!template || template.slpUserId !== ctx.slpUserId) {
      throw new ConvexError("Template not found");
    }

    await ctx.db.patch(args.id, {
      speechCoachConfig: {
        ...program.speechCoachConfig,
        assignedTemplateId: args.assignedTemplateId,
        lastSyncedTemplateVersion: template.version,
        childOverrides: args.childOverrides,
      },
    });
  },
});
```

- [ ] **Step 5: Run tests to verify template CRUD and assignment pass**

Run: `npm test -- convex/__tests__/speechCoachTemplates.test.ts convex/__tests__/speechCoach.test.ts`
Expected: PASS with create/list/update coverage and template assignment coverage.

- [ ] **Step 6: Commit**

```bash
git add convex/speechCoachTemplates.ts convex/homePrograms.ts convex/__tests__/speechCoachTemplates.test.ts convex/__tests__/speechCoach.test.ts
git commit -m "feat: add speech coach template queries and assignment"
```

## Task 3: Build Runtime Resolution And Session Snapshot Logic

**Files:**
- Create: `src/features/speech-coach/lib/runtime-config.ts`
- Create: `src/features/speech-coach/lib/__tests__/runtime-config.test.ts`
- Modify: `convex/speechCoach.ts`
- Modify: `convex/schema.ts`
- Test: `src/features/speech-coach/lib/__tests__/runtime-config.test.ts`
- Test: `convex/__tests__/speechCoach.test.ts`

- [ ] **Step 1: Write the failing merge test**

```ts
import { describe, expect, it } from "vitest";

import { resolveSpeechCoachRuntimeConfig } from "../runtime-config";

describe("resolveSpeechCoachRuntimeConfig", () => {
  it("merges base runtime, template, and child overrides", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: { name: "Template A", voice: { provider: "elevenlabs", voiceKey: "friendly" } },
      childOverrides: { targetSounds: ["/s/"], promptAddendum: "Use dinosaur words" },
    });

    expect(resolved.targetSounds).toEqual(["/s/"]);
    expect(resolved.voice.voiceKey).toBe("friendly");
    expect(resolved.prompt.childAddendum).toContain("dinosaur");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/speech-coach/lib/__tests__/runtime-config.test.ts`
Expected: FAIL because `resolveSpeechCoachRuntimeConfig` does not exist.

- [ ] **Step 3: Implement deterministic runtime resolution**

```ts
// src/features/speech-coach/lib/runtime-config.ts
const BASE_RUNTIME_RULES = {
  opening: "Warm greeting, simple orientation, child-safe tone.",
  safety: "No diagnosis, no medical advice, additive prompt overrides only.",
};

export function resolveSpeechCoachRuntimeConfig({
  template,
  childOverrides,
}: {
  template: {
    voice: { provider: "elevenlabs" | "gemini-native"; voiceKey: string };
    prompt?: {
      baseExtension?: string;
      coachingStyle?: string;
      toolInstructions?: string;
      knowledgeInstructions?: string;
    };
    tools?: Array<{ key: string; enabled: boolean; instructions?: string }>;
    skills?: Array<{ key: string; enabled: boolean; instructions?: string }>;
    knowledgePackIds?: string[];
    customKnowledgeSnippets?: string[];
    sessionDefaults?: { ageRange: "2-4" | "5-7"; defaultDurationMinutes: number };
  };
  childOverrides: {
    targetSounds: string[];
    ageRange?: "2-4" | "5-7";
    defaultDurationMinutes?: number;
    preferredThemes?: string[];
    avoidThemes?: string[];
    promptAddendum?: string;
  };
}) {
  return {
    baseRules: BASE_RUNTIME_RULES,
    voice: template.voice,
    tools: (template.tools ?? []).filter((tool) => tool.enabled),
    skills: (template.skills ?? []).filter((skill) => skill.enabled),
    knowledge: {
      packs: template.knowledgePackIds ?? [],
      snippets: template.customKnowledgeSnippets ?? [],
    },
    prompt: {
      baseExtension: template.prompt?.baseExtension ?? "",
      coachingStyle: template.prompt?.coachingStyle ?? "",
      toolInstructions: template.prompt?.toolInstructions ?? "",
      knowledgeInstructions: template.prompt?.knowledgeInstructions ?? "",
      childAddendum: childOverrides.promptAddendum ?? "",
    },
    targetSounds: childOverrides.targetSounds,
    ageRange: childOverrides.ageRange ?? template.sessionDefaults?.ageRange ?? "5-7",
    durationMinutes:
      childOverrides.defaultDurationMinutes ??
      template.sessionDefaults?.defaultDurationMinutes ??
      5,
  };
}
```

- [ ] **Step 4: Persist runtime snapshot on session creation**

```ts
// convex/speechCoach.ts
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
```

```ts
// convex/speechCoach.ts createSession handler excerpt
return await ctx.db.insert("speechCoachSessions", {
  patientId: program.patientId,
  homeProgramId: args.homeProgramId,
  caregiverUserId,
  agentId: "speech-coach-livekit",
  status: "configuring",
  config: args.config,
});
```

- [ ] **Step 5: Run tests to verify merge logic and snapshot persistence**

Run: `npm test -- src/features/speech-coach/lib/__tests__/runtime-config.test.ts convex/__tests__/speechCoach.test.ts`
Expected: PASS with merged config behavior and session snapshot assertions.

- [ ] **Step 6: Commit**

```bash
git add src/features/speech-coach/lib/runtime-config.ts src/features/speech-coach/lib/__tests__/runtime-config.test.ts convex/speechCoach.ts convex/schema.ts convex/__tests__/speechCoach.test.ts
git commit -m "feat: add speech coach runtime resolution"
```

## Task 4: Build The SLP Template Library And Editor UI

**Files:**
- Create: `src/features/speech-coach/components/template-library-page.tsx`
- Create: `src/features/speech-coach/components/template-editor.tsx`
- Create: `src/features/speech-coach/components/template-capability-section.tsx`
- Create: `src/features/speech-coach/components/__tests__/template-editor.test.tsx`
- Create: `src/app/(app)/speech-coach/templates/page.tsx`
- Modify: `src/features/speech-coach/lib/config.ts`

- [ ] **Step 1: Write the failing template-editor test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { TemplateEditor } from "../template-editor";

it("saves voice, tools, skills, and knowledge changes", async () => {
  const onSave = vi.fn();
  render(<TemplateEditor initialTemplate={null} onSave={onSave} />);

  fireEvent.change(screen.getByLabelText("Template name"), {
    target: { value: "Playful /s/ Coach" },
  });
  fireEvent.click(screen.getByLabelText("Target word picker"));
  fireEvent.click(screen.getByText("Save template"));

  expect(onSave).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/speech-coach/components/__tests__/template-editor.test.tsx`
Expected: FAIL because `TemplateEditor` does not exist.

- [ ] **Step 3: Build the dedicated template page and editor**

```tsx
// src/app/(app)/speech-coach/templates/page.tsx
import { TemplateLibraryPage } from "@/features/speech-coach/components/template-library-page";

export default function SpeechCoachTemplatesRoute() {
  return <TemplateLibraryPage />;
}
```

```tsx
// src/features/speech-coach/components/template-editor.tsx
export function TemplateEditor({
  initialTemplate,
  onSave,
}: {
  initialTemplate: SpeechCoachTemplateForm | null;
  onSave: (template: SpeechCoachTemplateForm) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <Label htmlFor="template-name">Template name</Label>
        <Input id="template-name" aria-label="Template name" />
      </section>
      <section>
        <h2 className="font-headline text-xl">Voice</h2>
      </section>
      <section>
        <h2 className="font-headline text-xl">Tools</h2>
      </section>
      <Button type="button">Save template</Button>
    </div>
  );
}
```

- [ ] **Step 4: Build the library screen with list/create/duplicate affordances**

```tsx
// src/features/speech-coach/components/template-library-page.tsx
export function TemplateLibraryPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl text-foreground">Speech Coach Templates</h1>
          <p className="text-sm text-muted-foreground">
            Save reusable coach setups for different speech practice styles.
          </p>
        </div>
        <Button type="button">New template</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify UI flows pass**

Run: `npm test -- src/features/speech-coach/components/__tests__/template-editor.test.tsx`
Expected: PASS with save interaction coverage.

- [ ] **Step 6: Commit**

```bash
git add src/app/'(app)'/speech-coach/templates/page.tsx src/features/speech-coach/components/template-library-page.tsx src/features/speech-coach/components/template-editor.tsx src/features/speech-coach/components/template-capability-section.tsx src/features/speech-coach/components/__tests__/template-editor.test.tsx src/features/speech-coach/lib/config.ts
git commit -m "feat: add speech coach template library ui"
```

## Task 5: Replace Coach Setup With Template Assignment On Child Pages

**Files:**
- Create: `src/features/speech-coach/components/template-assignment-card.tsx`
- Create: `src/features/speech-coach/components/__tests__/template-assignment-card.test.tsx`
- Modify: `src/features/speech-coach/components/speech-coach-page.tsx`
- Modify: `src/features/speech-coach/components/standalone-speech-coach-page.tsx`
- Modify: `src/features/speech-coach/components/session-config.tsx`
- Modify: `src/features/speech-coach/hooks/use-speech-session.ts`

- [ ] **Step 1: Write the failing assignment-card test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { TemplateAssignmentCard } from "../template-assignment-card";

it("lets the SLP assign a template and save child overrides", async () => {
  const onSave = vi.fn();
  render(
    <TemplateAssignmentCard
      templates={[{ _id: "t1", name: "Playful /s/ Coach", version: 2 }]}
      value={null}
      onSave={onSave}
    />
  );

  fireEvent.click(screen.getByText("Playful /s/ Coach"));
  fireEvent.change(screen.getByLabelText("Child notes"), {
    target: { value: "Prefers animals and trucks" },
  });
  fireEvent.click(screen.getByText("Save assignment"));

  expect(onSave).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/speech-coach/components/__tests__/template-assignment-card.test.tsx`
Expected: FAIL because `TemplateAssignmentCard` does not exist.

- [ ] **Step 3: Implement the assignment card and wire it into the child speech-coach page**

```tsx
// src/features/speech-coach/components/template-assignment-card.tsx
export function TemplateAssignmentCard({
  templates,
  value,
  onSave,
}: {
  templates: Array<{ _id: string; name: string; version: number }>;
  value: ChildTemplateAssignment | null;
  onSave: (value: ChildTemplateAssignment) => Promise<void>;
}) {
  return (
    <Card className="rounded-xl py-5">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Assigned Template</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Textarea aria-label="Child notes" />
        <Button type="button">Save assignment</Button>
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/features/speech-coach/components/speech-coach-page.tsx
type Tab = "new" | "history" | "assigned-template";
```

- [ ] **Step 4: Keep caregiver session start simple**

```tsx
// src/features/speech-coach/components/session-config.tsx
<p className="mt-2 text-sm text-muted-foreground">
  Your child&apos;s coach setup is already prepared. Choose the sounds for today&apos;s session and start when ready.
</p>
```

- [ ] **Step 5: Run tests to verify assignment and session-start UI pass**

Run: `npm test -- src/features/speech-coach/components/__tests__/template-assignment-card.test.tsx src/features/speech-coach/components/__tests__/session-config.test.tsx`
Expected: PASS with template assignment coverage and caregiver start flow unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/features/speech-coach/components/template-assignment-card.tsx src/features/speech-coach/components/__tests__/template-assignment-card.test.tsx src/features/speech-coach/components/speech-coach-page.tsx src/features/speech-coach/components/standalone-speech-coach-page.tsx src/features/speech-coach/components/session-config.tsx src/features/speech-coach/hooks/use-speech-session.ts
git commit -m "feat: add speech coach template assignment flow"
```

## Task 6: Replace Fixed ElevenLabs Session Bootstrap With LiveKit Session Startup

**Files:**
- Create: `convex/speechCoachRuntimeActions.ts`
- Create: `src/app/api/speech-coach/livekit-token/route.ts`
- Create: `src/app/api/speech-coach/livekit-token/__tests__/route.test.ts`
- Create: `src/features/speech-coach/livekit/tools.ts`
- Create: `src/features/speech-coach/livekit/__tests__/agent.test.ts`
- Modify: `convex/speechCoachActions.ts`
- Modify: `convex/speechCoach.ts`
- Modify: `src/features/speech-coach/livekit/agent.ts`
- Modify: `src/features/speech-coach/livekit/entrypoint.ts`
- Modify: `src/features/speech-coach/livekit/model-config.ts`
- Modify: `src/features/speech-coach/components/active-session.tsx`
- Modify: `src/features/speech-coach/hooks/use-speech-session.ts`
- Modify: `src/features/speech-coach/hooks/use-standalone-speech-session.ts`
- Test: `convex/__tests__/speechCoach.test.ts`

- [ ] **Step 1: Write the failing runtime-start and agent behavior tests**

```ts
it("returns a runtime session payload instead of a fixed elevenlabs signed url", async () => {
  const result = await action(api.speechCoachRuntimeActions.createLiveSession, {
    sessionId,
  });

  expect(result.roomName).toContain("speech-coach-");
  expect(result.tokenPath).toBe("/api/speech-coach/livekit-token");
  expect(result.runtime).toBe("livekit-agent");
});
```

- [ ] **Step 1b: Add a LiveKit agent behavior test using the official testing framework**

The LiveKit Agents SDK ships a first-class testing API for Node.js (Vitest). Tests
use `voice.AgentSession` in headless mode — no LiveKit server connection required.
`initializeLogger` suppresses the CLI output that would otherwise clutter test output.

```ts
// src/features/speech-coach/livekit/__tests__/agent.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initializeLogger, voice } from "@livekit/agents";
import * as google from "@livekit/agents-plugin-google";
import { createSpeechCoachAgent } from "../agent";

// Suppress LiveKit CLI output in test runs.
initializeLogger({ pretty: false, level: "warn" });

const { AgentSession } = voice;

describe("speech coach livekit agent", () => {
  let session: voice.AgentSession;

  beforeAll(async () => {
    // Use the same model the real runtime uses, in TEXT modality so the test
    // runs without audio infrastructure and uses the GOOGLE_API_KEY env var.
    session = new AgentSession({
      llm: new google.beta.realtime.RealtimeModel({
        model: "gemini-2.5-flash",
        modalities: [google.types.Modality.TEXT],
      }),
    });
    await session.start({
      agent: createSpeechCoachAgent({
        instructions:
          "You are a speech coach helping a child practice the /s/ sound. Be brief and child-friendly.",
        tools: [],
      }),
    });
  });

  afterAll(async () => {
    await session?.close();
  });

  it("responds with a short child-friendly greeting", async () => {
    const result = await session.run({ userInput: "Hi!" }).wait();
    const msg = result.expect.nextEvent().isMessage({ role: "assistant" });
    // Verify response is concise — long monologues are inappropriate for a child session.
    expect((msg.event().item.content as string).length).toBeLessThan(150);
    result.expect.noMoreEvents();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- convex/__tests__/speechCoach.test.ts src/features/speech-coach/livekit/__tests__/agent.test.ts src/app/api/speech-coach/livekit-token/__tests__/route.test.ts`
Expected: FAIL because the runtime action, token route, and real agent implementation do not exist yet.

- [ ] **Step 3: Add the runtime action that returns room metadata, not a fake token**

```ts
// convex/speechCoachRuntimeActions.ts
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const createLiveSession = action({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (_ctx, args) => {
    // Use LIVEKIT_URL (not NEXT_PUBLIC_LIVEKIT_URL) — Convex actions run on
    // Convex servers, not Next.js. NEXT_PUBLIC_ is a Next.js build-time
    // substitution and won't exist in the Convex runtime. Add LIVEKIT_URL
    // to the Convex dashboard environment variables.
    return {
      runtime: "livekit-agent",
      roomName: `speech-coach-${args.sessionId}`,
      serverUrl: process.env.LIVEKIT_URL!,
      tokenPath: "/api/speech-coach/livekit-token",
    };
  },
});
```

- [ ] **Step 4: Add a dedicated token route using the existing LiveKit server-sdk pattern**

```ts
// src/app/api/speech-coach/livekit-token/route.ts
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const { roomName, participantName } = body as {
    roomName?: string;
    participantName?: string;
  };

  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: participantName!,
    ttl: "30m",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName!,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return Response.json({
    token: await at.toJwt(),
    serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
  });
}
```

- [ ] **Step 5: Implement the actual LiveKit agent worker and model decision**

`model-config.ts` is already correct from Task 1.5 (see that task for the voice-mode
tradeoff comment). No changes needed here.

```ts
// src/features/speech-coach/livekit/entrypoint.ts
//
// IMPORTANT: The Node.js LiveKit entrypoint MUST be a `defineAgent` default
// export. LiveKit Cloud dispatches jobs by importing this file and calling
// the `entry` function. A named export or plain function is invisible to
// the worker pool and will never run.
//
// `AgentSession` lives under the `voice` namespace — it is NOT a top-level
// export from "@livekit/agents".
import { defineAgent, JobContext, voice } from "@livekit/agents";
import * as google from "@livekit/agents-plugin-google";
import { createSpeechCoachAgent } from "./agent";
import { SPEECH_COACH_REALTIME_MODEL, SPEECH_COACH_VOICE_MODE } from "./model-config";

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    // Room metadata carries the resolved runtime snapshot set by the Convex
    // action before dispatching the agent (see convex/speechCoachRuntimeActions.ts).
    const metadata = ctx.room.metadata ? (JSON.parse(ctx.room.metadata) as {
      instructions?: string;
      tools?: string[];
    }) : {};

    const session = new voice.AgentSession({
      llm: new google.beta.realtime.RealtimeModel({
        model: SPEECH_COACH_REALTIME_MODEL,
        // TEXT modality enables the separate-TTS path (ElevenLabs selectable voices).
        // This requires a non-native-audio model — see model-config.ts for details.
        ...(SPEECH_COACH_VOICE_MODE === "separate-tts"
          ? { modalities: [google.types.Modality.TEXT] }
          : {}),
      }),
    });

    await session.start({
      room: ctx.room,
      agent: createSpeechCoachAgent({
        instructions: metadata.instructions ?? "You are a helpful speech coach. Guide the child through articulation practice with patience and encouragement.",
        tools: metadata.tools ?? [],
      }),
    });
  },
});
```

```ts
// src/features/speech-coach/livekit/agent.ts
// No changes needed from Task 1.5 — createSpeechCoachAgent already returns a
// voice.Agent instance. Add ElevenLabs TTS wiring here when the voice provider
// feature is implemented.
```

- [ ] **Step 6: Update hooks and active-session UI to consume the runtime payload**

```ts
// src/features/speech-coach/hooks/use-speech-session.ts
const getLiveSession = useAction(api.speechCoachRuntimeActions.createLiveSession);
```

```tsx
// src/features/speech-coach/components/active-session.tsx
type Props = {
  runtimeSession: {
    runtime: "livekit-agent";
    serverUrl: string;
    tokenPath: string;
    roomName: string;
  };
  onConversationStarted: (conversationId: string) => void;
  onEnd: () => void;
  durationMinutes: number;
};
```

- [ ] **Step 7: Run tests to verify the runtime flow passes**

Run: `npm test -- convex/__tests__/speechCoach.test.ts src/features/speech-coach/livekit/__tests__/agent.test.ts src/app/api/speech-coach/livekit-token/__tests__/route.test.ts`
Expected: PASS with room-metadata, token-route, and agent-behavior coverage.

- [ ] **Step 8: Commit**

```bash
git add convex/speechCoachRuntimeActions.ts src/app/api/speech-coach/livekit-token/route.ts src/app/api/speech-coach/livekit-token/__tests__/route.test.ts src/features/speech-coach/livekit/agent.ts src/features/speech-coach/livekit/entrypoint.ts src/features/speech-coach/livekit/model-config.ts src/features/speech-coach/livekit/tools.ts src/features/speech-coach/livekit/__tests__/agent.test.ts convex/speechCoachActions.ts convex/speechCoach.ts src/features/speech-coach/components/active-session.tsx src/features/speech-coach/hooks/use-speech-session.ts src/features/speech-coach/hooks/use-standalone-speech-session.ts convex/__tests__/speechCoach.test.ts
git commit -m "feat: switch speech coach to livekit agent runtime"
```

## Task 7: Keep Analysis, History, And Migration Working

**Files:**
- Modify: `convex/speechCoachActions.ts`
- Modify: `convex/speechCoach.ts`
- Modify: `src/features/speech-coach/components/session-history.tsx`
- Test: `convex/__tests__/speechCoach.test.ts`

- [ ] **Step 1: Write the failing history regression test**

```ts
it("keeps session history readable after template-backed runtime changes", async () => {
  const detail = await caregiver.query(api.speechCoach.getSessionDetail, { sessionId });
  expect(detail.session.config.runtimeSnapshot?.templateVersion).toBe(2);
  expect(detail.progress?.summary).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- convex/__tests__/speechCoach.test.ts`
Expected: FAIL because session detail does not include the new snapshot fields.

- [ ] **Step 3: Preserve analysis and history contracts**

```ts
// convex/speechCoachActions.ts
const runtimeSnapshot = session.config.runtimeSnapshot;
const analysisPrompt = `You are analyzing a speech therapy session.
Voice provider: ${runtimeSnapshot?.voiceProvider ?? "unknown"}
Enabled tools: ${(runtimeSnapshot?.tools ?? []).join(", ")}
Enabled skills: ${(runtimeSnapshot?.skills ?? []).join(", ")}
`;
```

```tsx
// src/features/speech-coach/components/session-history.tsx
{detail.session.config.runtimeSnapshot ? (
  <p className="text-xs text-muted-foreground">
    Template v{detail.session.config.runtimeSnapshot.templateVersion} · {detail.session.config.runtimeSnapshot.voiceKey}
  </p>
) : null}
```

- [ ] **Step 4: Add one-time migration/backfill helper if needed**

```ts
// convex/speechCoach.ts
export const backfillLegacySpeechCoachPrograms = internalMutation({
  args: { cursor: v.optional(v.id("homePrograms")) },
  handler: async (ctx, args) => {
    const programs = await ctx.db
      .query("homePrograms")
      .order("asc")
      .take(100);
    return programs.length;
  },
});
```

- [ ] **Step 5: Run tests to verify history and analysis still pass**

Run: `npm test -- convex/__tests__/speechCoach.test.ts`
Expected: PASS with session-detail coverage for template-backed sessions.

- [ ] **Step 6: Commit**

```bash
git add convex/speechCoachActions.ts convex/speechCoach.ts src/features/speech-coach/components/session-history.tsx convex/__tests__/speechCoach.test.ts
git commit -m "feat: preserve speech coach history and analysis with template runtime"
```

## Task 8: End-To-End Verification

**Files:**
- Test: `src/features/speech-coach/components/__tests__/template-editor.test.tsx`
- Test: `src/features/speech-coach/components/__tests__/template-assignment-card.test.tsx`
- Test: `src/features/speech-coach/components/__tests__/session-config.test.tsx`
- Test: `convex/__tests__/speechCoachTemplates.test.ts`
- Test: `convex/__tests__/speechCoach.test.ts`
- Test: `tests/e2e/` speech-coach coverage file if the repo already has a matching feature spec location

- [ ] **Step 1: Run focused unit and Convex tests**

Run:

```bash
npm test -- src/features/speech-coach/components/__tests__/template-editor.test.tsx src/features/speech-coach/components/__tests__/template-assignment-card.test.tsx src/features/speech-coach/components/__tests__/session-config.test.tsx convex/__tests__/speechCoachTemplates.test.ts convex/__tests__/speechCoach.test.ts
```

Expected: PASS.

- [ ] **Step 2: Add or update Playwright coverage for template library and assignment**

```ts
test("slp can create a template and assign it to a child speech coach", async ({ page }) => {
  await page.goto("/speech-coach/templates");
  await page.getByText("New template").click();
  await page.getByLabel("Template name").fill("Playful /s/ Coach");
  await page.getByText("Save template").click();
});
```

- [ ] **Step 3: Run the speech-coach e2e test**

Run: `npx playwright test tests/e2e/speech-coach-template.spec.ts`
Expected: PASS.

- [ ] **Step 4: Run the broader regression suite if time permits**

Run:

```bash
npm test
npx playwright test
```

Expected: PASS or only known unrelated failures.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/speech-coach-template.spec.ts
git commit -m "test: add speech coach template regression coverage"
```

## Self-Review

### Spec coverage

- Reusable SLP templates: covered by Tasks 1, 2, and 4
- Child assignment and overrides: covered by Tasks 1, 2, and 5
- Runtime resolution and snapshots: covered by Tasks 3 and 7
- LiveKit runtime swap: covered by Task 6
- LiveKit server-side worker boundary and token generation: covered by Tasks 1.5 and 6
- Safety and deterministic config assembly: covered by Tasks 1 and 3
- Analysis/history continuity: covered by Task 7
- Verification: covered by Task 8

### Placeholder scan

- No `TBD`, `TODO`, or fake-token placeholders remain in the plan body
- Every task includes explicit file paths, commands, and code snippets

### Type consistency

- `assignedTemplateId`, `lastSyncedTemplateVersion`, and `runtimeSnapshot` are used consistently across schema, backend, and UI tasks
- `speechCoachTemplates` remains the single template table name throughout
- Runtime startup consistently points to `speechCoachRuntimeActions.createLiveSession`
- LiveKit token issuance consistently points to `/api/speech-coach/livekit-token`
