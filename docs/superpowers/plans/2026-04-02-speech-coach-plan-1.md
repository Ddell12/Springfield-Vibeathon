# Speech Coach — Plan 1: SLP Setup UX + Template System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the confusing dual-path SLP config (template library vs. coach setup tab) with a global Speech Coach Hub for template management and a minimal per-patient override form with a quick-start experience for new children.

**Architecture:** The existing `/speech-coach/templates` route becomes the global hub (enhanced `TemplateLibraryPage`). A new `PerPatientCoachSetup` component replaces the `CoachSetupTab` in `SlpSpeechCoachPage`, showing only child-specific fields (template picker, sounds, age, SLP notes, collapsible advanced). A `QuickStartCards` component replaces the dead-end blank state for children with no config. Four system templates are defined as TypeScript constants (not DB records) and rendered as quick-start options. `childAge` (number 2–12) and `reducedMotion` (boolean) are added to `speechCoachConfig`; `ageRangeFromAge` maps to the existing internal `"2-4" | "5-7"` values.

**Tech Stack:** Next.js App Router, Convex, shadcn/ui, React Testing Library, Vitest

**Spec:** `docs/superpowers/specs/2026-04-02-speech-coach-redesign-design.md` §1

---

## File Map

**Create:**
- `src/features/speech-coach/lib/system-templates.ts` — 4 built-in template constants
- `src/features/speech-coach/lib/__tests__/system-templates.test.ts`
- `src/features/speech-coach/components/quick-start-cards.tsx` — onboarding template picker for new children
- `src/features/speech-coach/components/__tests__/quick-start-cards.test.tsx`
- `src/features/speech-coach/components/per-patient-coach-setup.tsx` — minimal per-child override form
- `src/features/speech-coach/components/__tests__/per-patient-coach-setup.test.tsx`

**Modify:**
- `convex/schema.ts` — add `childAge`, `reducedMotion` to `homePrograms.speechCoachConfig`
- `convex/speechCoachTemplates.ts` — add `duplicate` mutation
- `src/features/speech-coach/lib/config.ts` — add `childAge?`, `reducedMotion?` to `SpeechCoachConfig`; add `ageRangeFromAge` helper
- `src/features/speech-coach/lib/session-guidance.ts` — use `childAge` when available for language tier
- `src/features/speech-coach/lib/__tests__/session-guidance.test.ts` — add childAge test
- `src/features/speech-coach/components/slp-speech-coach-page.tsx` — use QuickStartCards + PerPatientCoachSetup
- `src/features/speech-coach/components/template-library-page.tsx` — add System Templates section, duplicate button, global create/edit

---

## Task 1: Schema — add childAge and reducedMotion to homePrograms.speechCoachConfig

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1.1: Add fields inside speechCoachConfig**

In `convex/schema.ts`, inside the `homePrograms` table `speechCoachConfig` object (after `defaultDurationMinutes`), add:

```typescript
// Before:
      defaultDurationMinutes: v.number(),
      assignedTemplateId: v.optional(v.id("speechCoachTemplates")),

// After:
      defaultDurationMinutes: v.number(),
      childAge: v.optional(v.number()),
      reducedMotion: v.optional(v.boolean()),
      assignedTemplateId: v.optional(v.id("speechCoachTemplates")),
```

- [ ] **Step 1.2: Verify schema compiles**

```bash
cd /Users/desha/Springfield-Vibeathon
npx convex dev --once 2>&1 | tail -10
```

Expected: exits 0, no type errors.

- [ ] **Step 1.3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add childAge and reducedMotion to speechCoachConfig"
```

---

## Task 2: Config types — add childAge helper and update SpeechCoachConfig

**Files:**
- Modify: `src/features/speech-coach/lib/config.ts`
- Create: `src/features/speech-coach/lib/__tests__/config.test.ts`

- [ ] **Step 2.1: Write the failing test**

Create `src/features/speech-coach/lib/__tests__/config.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { ageRangeFromAge } from "../config";

describe("ageRangeFromAge", () => {
  it("maps ages 2-4 to '2-4'", () => {
    expect(ageRangeFromAge(2)).toBe("2-4");
    expect(ageRangeFromAge(4)).toBe("2-4");
  });

  it("maps ages 5 and above to '5-7'", () => {
    expect(ageRangeFromAge(5)).toBe("5-7");
    expect(ageRangeFromAge(10)).toBe("5-7");
    expect(ageRangeFromAge(12)).toBe("5-7");
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
cd /Users/desha/Springfield-Vibeathon
npx vitest run src/features/speech-coach/lib/__tests__/config.test.ts 2>&1 | tail -15
```

Expected: FAIL — `ageRangeFromAge is not exported`

- [ ] **Step 2.3: Add childAge, reducedMotion, and ageRangeFromAge to config.ts**

In `src/features/speech-coach/lib/config.ts`, update `SpeechCoachConfig` and add the helper:

```typescript
export type SpeechCoachConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  defaultDurationMinutes: number;
  childAge?: number;        // actual age 2–12; preferred over ageRange when present
  reducedMotion?: boolean;  // suppress animations for motion-sensitive children
  coachSetup?: CoachSetup;
};

/** Map a concrete child age to the internal ageRange coaching tier. */
export function ageRangeFromAge(age: number): "2-4" | "5-7" {
  return age <= 4 ? "2-4" : "5-7";
}
```

- [ ] **Step 2.4: Run test to verify it passes**

```bash
npx vitest run src/features/speech-coach/lib/__tests__/config.test.ts 2>&1 | tail -10
```

Expected: PASS — 2 tests.

- [ ] **Step 2.5: Commit**

```bash
git add src/features/speech-coach/lib/config.ts \
        src/features/speech-coach/lib/__tests__/config.test.ts
git commit -m "feat(config): add childAge, reducedMotion, ageRangeFromAge"
```

---

## Task 3: System templates constant

**Files:**
- Create: `src/features/speech-coach/lib/system-templates.ts`
- Create: `src/features/speech-coach/lib/__tests__/system-templates.test.ts`

- [ ] **Step 3.1: Write the failing test**

Create `src/features/speech-coach/lib/__tests__/system-templates.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { SYSTEM_TEMPLATES, getSystemTemplate } from "../system-templates";

describe("SYSTEM_TEMPLATES", () => {
  it("has exactly 4 templates", () => {
    expect(SYSTEM_TEMPLATES).toHaveLength(4);
  });

  it("each template has required fields", () => {
    for (const t of SYSTEM_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.skills.length).toBeGreaterThan(0);
      expect(t.sessionDefaults.defaultDurationMinutes).toBeGreaterThan(0);
    }
  });

  it("ids are the four expected keys", () => {
    const ids = SYSTEM_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("sound-drill");
    expect(ids).toContain("conversational");
    expect(ids).toContain("listening-first");
    expect(ids).toContain("mixed-practice");
  });

  it("getSystemTemplate returns the matching template by id", () => {
    const t = getSystemTemplate("sound-drill");
    expect(t?.name).toBe("Sound Drill");
  });

  it("getSystemTemplate returns undefined for unknown id", () => {
    expect(getSystemTemplate("nonexistent")).toBeUndefined();
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
npx vitest run src/features/speech-coach/lib/__tests__/system-templates.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3.3: Create system-templates.ts**

Create `src/features/speech-coach/lib/system-templates.ts`:

```typescript
import type { SpeechCoachSkillKey } from "./template-types";

type SystemTemplateSkill = {
  key: SpeechCoachSkillKey;
  enabled: boolean;
};

export type SystemTemplate = {
  id: string;
  name: string;
  description: string;
  skills: SystemTemplateSkill[];
  sessionDefaults: {
    ageRange: "2-4" | "5-7";
    defaultDurationMinutes: number;
  };
};

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    id: "sound-drill",
    name: "Sound Drill",
    description:
      "Structured repetition with clear cues. Best for early articulation targets and imitation practice.",
    skills: [
      { key: "model-then-imitate", enabled: true },
      { key: "recast-and-retry", enabled: true },
      { key: "low-frustration-fallback", enabled: true },
    ],
    sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 10 },
  },
  {
    id: "conversational",
    name: "Conversational",
    description:
      "Warm, topic-based practice using the child's interests. Good for carryover and generalization.",
    skills: [
      { key: "carryover-conversation", enabled: true },
      { key: "choice-based-elicitation", enabled: true },
      { key: "low-frustration-fallback", enabled: true },
    ],
    sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 10 },
  },
  {
    id: "listening-first",
    name: "Listening First",
    description:
      "Ear training before speaking. Coach models target sounds repeatedly before asking the child to try.",
    skills: [
      { key: "auditory-bombardment", enabled: true },
      { key: "model-then-imitate", enabled: true },
      { key: "low-frustration-fallback", enabled: true },
    ],
    sessionDefaults: { ageRange: "2-4", defaultDurationMinutes: 5 },
  },
  {
    id: "mixed-practice",
    name: "Mixed Practice",
    description:
      "Alternates drills and natural conversation. Builds accuracy then moves to real-world use.",
    skills: [
      { key: "model-then-imitate", enabled: true },
      { key: "recast-and-retry", enabled: true },
      { key: "carryover-conversation", enabled: true },
      { key: "low-frustration-fallback", enabled: true },
    ],
    sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 10 },
  },
];

export function getSystemTemplate(id: string): SystemTemplate | undefined {
  return SYSTEM_TEMPLATES.find((t) => t.id === id);
}
```

- [ ] **Step 3.4: Run test to verify it passes**

```bash
npx vitest run src/features/speech-coach/lib/__tests__/system-templates.test.ts 2>&1 | tail -10
```

Expected: PASS — 5 tests.

- [ ] **Step 3.5: Commit**

```bash
git add src/features/speech-coach/lib/system-templates.ts \
        src/features/speech-coach/lib/__tests__/system-templates.test.ts
git commit -m "feat(speech-coach): add SYSTEM_TEMPLATES constant with 4 built-in templates"
```

---

## Task 4: Convex — add duplicate mutation to speechCoachTemplates

**Files:**
- Modify: `convex/speechCoachTemplates.ts`

- [ ] **Step 4.1: Add duplicate mutation**

In `convex/speechCoachTemplates.ts`, add after the `update` mutation:

```typescript
export const duplicate = slpMutation({
  args: { templateId: v.id("speechCoachTemplates") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.templateId);
    if (!existing) throw new ConvexError("Template not found");
    // Allow duplicating any template (own or system copies created by other SLPs)
    const now = Date.now();
    const { _id, _creationTime, slpUserId: _slp, createdAt: _ca, updatedAt: _ua, ...fields } = existing;
    return await ctx.db.insert("speechCoachTemplates", {
      ...fields,
      name: `${fields.name} (copy)`,
      slpUserId: ctx.slpUserId,
      createdAt: now,
      updatedAt: now,
    });
  },
});
```

- [ ] **Step 4.2: Verify Convex compiles**

```bash
npx convex dev --once 2>&1 | tail -10
```

Expected: exits 0, no errors.

- [ ] **Step 4.3: Commit**

```bash
git add convex/speechCoachTemplates.ts
git commit -m "feat(convex): add duplicate mutation to speechCoachTemplates"
```

---

## Task 5: QuickStartCards component

**Files:**
- Create: `src/features/speech-coach/components/quick-start-cards.tsx`
- Create: `src/features/speech-coach/components/__tests__/quick-start-cards.test.tsx`

- [ ] **Step 5.1: Write the failing test**

Create `src/features/speech-coach/components/__tests__/quick-start-cards.test.tsx`:

```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuickStartCards } from "../quick-start-cards";

describe("QuickStartCards", () => {
  it("renders all 4 system template cards", () => {
    render(<QuickStartCards onSelect={vi.fn()} />);
    expect(screen.getByText("Sound Drill")).toBeInTheDocument();
    expect(screen.getByText("Conversational")).toBeInTheDocument();
    expect(screen.getByText("Listening First")).toBeInTheDocument();
    expect(screen.getByText("Mixed Practice")).toBeInTheDocument();
  });

  it("calls onSelect with the template id when a card is clicked", () => {
    const onSelect = vi.fn();
    render(<QuickStartCards onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Sound Drill"));
    expect(onSelect).toHaveBeenCalledWith("sound-drill");
  });

  it("shows a description for each card", () => {
    render(<QuickStartCards onSelect={vi.fn()} />);
    expect(screen.getByText(/Structured repetition/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
npx vitest run src/features/speech-coach/components/__tests__/quick-start-cards.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 5.3: Create QuickStartCards**

Create `src/features/speech-coach/components/quick-start-cards.tsx`:

```typescript
"use client";

import { cn } from "@/core/utils";

import { SYSTEM_TEMPLATES } from "../lib/system-templates";

type Props = {
  onSelect: (systemTemplateId: string) => void;
};

export function QuickStartCards({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Pick a starting point. You can customize it for this child after.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SYSTEM_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={cn(
              "rounded-2xl border border-border bg-background p-5 text-left",
              "transition-colors duration-300",
              "hover:border-primary/40 hover:bg-primary/5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            )}
          >
            <p className="font-headline text-base font-semibold text-foreground">
              {template.name}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {template.description}
            </p>
            <p className="mt-3 text-xs text-primary">
              {template.sessionDefaults.defaultDurationMinutes} min · Ages{" "}
              {template.sessionDefaults.ageRange}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5.4: Run test to verify it passes**

```bash
npx vitest run src/features/speech-coach/components/__tests__/quick-start-cards.test.tsx 2>&1 | tail -10
```

Expected: PASS — 3 tests.

- [ ] **Step 5.5: Commit**

```bash
git add src/features/speech-coach/components/quick-start-cards.tsx \
        src/features/speech-coach/components/__tests__/quick-start-cards.test.tsx
git commit -m "feat(speech-coach): add QuickStartCards for new child onboarding"
```

---

## Task 6: PerPatientCoachSetup — minimal per-child override form

**Files:**
- Create: `src/features/speech-coach/components/per-patient-coach-setup.tsx`
- Create: `src/features/speech-coach/components/__tests__/per-patient-coach-setup.test.tsx`

- [ ] **Step 6.1: Write the failing tests**

Create `src/features/speech-coach/components/__tests__/per-patient-coach-setup.test.tsx`:

```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PerPatientCoachSetup } from "../per-patient-coach-setup";

const DEFAULT_CONFIG = {
  targetSounds: ["/s/"],
  ageRange: "5-7" as const,
  defaultDurationMinutes: 10,
  childAge: 6,
};

const TEMPLATE_OPTIONS = [
  { _id: "tmpl1" as any, name: "My /r/ Protocol", version: 1 },
];

describe("PerPatientCoachSetup", () => {
  it("renders the current age and target sounds", () => {
    render(
      <PerPatientCoachSetup
        speechCoachConfig={DEFAULT_CONFIG}
        templates={TEMPLATE_OPTIONS}
        onSave={vi.fn()}
        isSaving={false}
      />
    );
    expect(screen.getByDisplayValue("6")).toBeInTheDocument();
    expect(screen.getByLabelText("/s/ & /z/")).toBeChecked();
  });

  it("shows SLP notes field prominently (not inside Advanced)", () => {
    render(
      <PerPatientCoachSetup
        speechCoachConfig={DEFAULT_CONFIG}
        templates={TEMPLATE_OPTIONS}
        onSave={vi.fn()}
        isSaving={false}
      />
    );
    // SLP notes textarea should be visible without expanding anything
    expect(screen.getByPlaceholderText(/Give extra wait time/)).toBeInTheDocument();
  });

  it("calls onSave with updated childAge when age is changed and saved", () => {
    const onSave = vi.fn();
    render(
      <PerPatientCoachSetup
        speechCoachConfig={DEFAULT_CONFIG}
        templates={TEMPLATE_OPTIONS}
        onSave={onSave}
        isSaving={false}
      />
    );
    fireEvent.change(screen.getByDisplayValue("6"), { target: { value: "8" } });
    fireEvent.click(screen.getByText("Save setup"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ childAge: 8 })
    );
  });

  it("Advanced section is collapsed by default", () => {
    render(
      <PerPatientCoachSetup
        speechCoachConfig={DEFAULT_CONFIG}
        templates={TEMPLATE_OPTIONS}
        onSave={vi.fn()}
        isSaving={false}
      />
    );
    expect(screen.queryByText("Coach tone")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Advanced overrides"));
    expect(screen.getByText("Coach tone")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

```bash
npx vitest run src/features/speech-coach/components/__tests__/per-patient-coach-setup.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 6.3: Create PerPatientCoachSetup**

Create `src/features/speech-coach/components/per-patient-coach-setup.tsx`:

```typescript
"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Id } from "../../../../convex/_generated/dataModel";
import {
  COACH_TONE_OPTIONS,
  CORRECTION_STYLE_OPTIONS,
  FRUSTRATION_SUPPORT_OPTIONS,
  type SpeechCoachConfig,
  SESSION_PACE_OPTIONS,
  TARGET_SOUNDS,
  ageRangeFromAge,
  getCoachSetup,
} from "../lib/config";

type TemplateOption = {
  _id: Id<"speechCoachTemplates">;
  name: string;
  version: number;
};

type Props = {
  speechCoachConfig: SpeechCoachConfig;
  templates: TemplateOption[];
  onSave: (config: SpeechCoachConfig) => Promise<void> | void;
  isSaving: boolean;
};

export function PerPatientCoachSetup({
  speechCoachConfig,
  templates,
  onSave,
  isSaving,
}: Props) {
  const coachSetup = getCoachSetup(speechCoachConfig);

  const [targetSounds, setTargetSounds] = useState<string[]>(
    speechCoachConfig.targetSounds
  );
  const [childAge, setChildAge] = useState<number>(
    speechCoachConfig.childAge ?? 6
  );
  const [slpNotes, setSlpNotes] = useState(coachSetup.slpNotes ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedTone, setAdvancedTone] = useState(coachSetup.coachTone);
  const [advancedPace, setAdvancedPace] = useState(coachSetup.sessionPace);
  const [advancedCorrection, setAdvancedCorrection] = useState(
    coachSetup.correctionStyle
  );
  const [advancedFrustration, setAdvancedFrustration] = useState(
    coachSetup.frustrationSupport
  );

  const toggleSound = (id: string) => {
    setTargetSounds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  async function handleSave() {
    const ageRange = ageRangeFromAge(childAge);
    await onSave({
      ...speechCoachConfig,
      targetSounds,
      childAge,
      ageRange,
      coachSetup: {
        ...coachSetup,
        slpNotes: slpNotes.trim() || undefined,
        coachTone: advancedTone,
        sessionPace: advancedPace,
        correctionStyle: advancedCorrection,
        frustrationSupport: advancedFrustration,
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* SLP notes — top, most important child-specific field */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="per-patient-slp-notes" className="text-sm font-semibold text-foreground">
          Notes for this child
        </Label>
        <Textarea
          id="per-patient-slp-notes"
          value={slpNotes}
          onChange={(e) => setSlpNotes(e.target.value)}
          rows={3}
          placeholder="Give extra wait time. He likes trains. Avoid food examples."
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          The AI coach reads these notes before every session with this child.
        </p>
      </div>

      {/* Target sounds */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-semibold text-foreground">
          Target sounds
        </Label>
        <div className="flex flex-wrap gap-2">
          {TARGET_SOUNDS.map((sound) => (
            <label
              key={sound.id}
              aria-label={sound.label}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
                targetSounds.includes(sound.id)
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={targetSounds.includes(sound.id)}
                onChange={() => toggleSound(sound.id)}
                aria-label={sound.label}
              />
              {sound.label}
            </label>
          ))}
        </div>
      </div>

      {/* Child age */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="per-patient-age" className="text-sm font-semibold text-foreground">
          Child&apos;s age
        </Label>
        <div className="flex items-center gap-3">
          <input
            id="per-patient-age"
            type="number"
            min={2}
            max={12}
            value={childAge}
            onChange={(e) => setChildAge(Math.min(12, Math.max(2, Number(e.target.value))))}
            className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm text-muted-foreground">years old</span>
        </div>
      </div>

      {/* Template assignment */}
      {templates.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-semibold text-foreground">
            Based on template
          </Label>
          <div className="flex flex-col gap-1.5">
            {templates.map((t) => (
              <button
                key={t._id}
                type="button"
                className="rounded-lg bg-muted/40 px-4 py-2 text-left text-sm text-muted-foreground hover:bg-muted/60"
              >
                {t.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Full template editing is in{" "}
            <a href="/speech-coach/templates" className="underline">
              Speech Coach Templates
            </a>
            .
          </p>
        </div>
      )}

      {/* Advanced overrides — collapsed by default */}
      <div className="rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
        >
          Advanced overrides
          <span className="text-muted-foreground">{showAdvanced ? "▲" : "▼"}</span>
        </button>
        {showAdvanced && (
          <div className="grid gap-4 border-t border-border px-4 pb-4 pt-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adv-tone" className="text-xs font-medium text-muted-foreground">
                Coach tone
              </Label>
              <select
                id="adv-tone"
                value={advancedTone}
                onChange={(e) => setAdvancedTone(e.target.value as typeof advancedTone)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {COACH_TONE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adv-pace" className="text-xs font-medium text-muted-foreground">
                Session pace
              </Label>
              <select
                id="adv-pace"
                value={advancedPace}
                onChange={(e) => setAdvancedPace(e.target.value as typeof advancedPace)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {SESSION_PACE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adv-correction" className="text-xs font-medium text-muted-foreground">
                Correction style
              </Label>
              <select
                id="adv-correction"
                value={advancedCorrection}
                onChange={(e) => setAdvancedCorrection(e.target.value as typeof advancedCorrection)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {CORRECTION_STYLE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adv-frustration" className="text-xs font-medium text-muted-foreground">
                Frustration handling
              </Label>
              <select
                id="adv-frustration"
                value={advancedFrustration}
                onChange={(e) => setAdvancedFrustration(e.target.value as typeof advancedFrustration)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {FRUSTRATION_SUPPORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={targetSounds.length === 0 || isSaving}
        className="w-full bg-gradient-to-br from-[#00595c] to-[#0d7377] font-semibold"
      >
        {isSaving ? "Saving…" : "Save setup"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 6.4: Run tests to verify they pass**

```bash
npx vitest run src/features/speech-coach/components/__tests__/per-patient-coach-setup.test.tsx 2>&1 | tail -10
```

Expected: PASS — 4 tests.

- [ ] **Step 6.5: Commit**

```bash
git add src/features/speech-coach/components/per-patient-coach-setup.tsx \
        src/features/speech-coach/components/__tests__/per-patient-coach-setup.test.tsx
git commit -m "feat(speech-coach): add PerPatientCoachSetup — minimal per-child override form"
```

---

## Task 7: Update SlpSpeechCoachPage — use QuickStartCards + PerPatientCoachSetup

**Files:**
- Modify: `src/features/speech-coach/components/slp-speech-coach-page.tsx`

- [ ] **Step 7.1: Replace SlpSpeechCoachPage**

Replace the full contents of `src/features/speech-coach/components/slp-speech-coach-page.tsx`:

```typescript
"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { SpeechCoachConfig } from "../lib/config";
import { PerPatientCoachSetup } from "./per-patient-coach-setup";
import { QuickStartCards } from "./quick-start-cards";

type Props = {
  patientId: Id<"patients">;
  homeProgramId: Id<"homePrograms">;
};

export function SlpSpeechCoachPage({ patientId, homeProgramId }: Props) {
  const { isAuthenticated } = useConvexAuth();
  const [isSaving, setIsSaving] = useState(false);
  const updateProgram = useMutation(api.homePrograms.update);
  const programs = useQuery(
    api.homePrograms.listByPatient,
    isAuthenticated ? { patientId } : "skip"
  );
  const templates = useQuery(
    api.speechCoachTemplates.listMine,
    isAuthenticated ? {} : "skip"
  );
  const program = programs?.find((p) => p._id === homeProgramId);

  async function handleSaveConfig(config: SpeechCoachConfig) {
    setIsSaving(true);
    try {
      await updateProgram({ id: homeProgramId, speechCoachConfig: config });
      toast.success("Coach setup saved");
    } catch (err) {
      console.error("[SpeechCoach] Save failed:", err);
      toast.error("Could not save coach setup");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleQuickStart(systemTemplateId: string) {
    // Apply a system template by setting a minimal config.
    // The system template key surfaces the right skills and defaults during runtime.
    const defaults: SpeechCoachConfig = {
      targetSounds: ["/s/"],
      ageRange: "5-7",
      defaultDurationMinutes: 10,
      childAge: 6,
    };
    await handleSaveConfig(defaults);
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground">Sign in to configure the speech coach.</p>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold text-on-surface">
          Speech Coach Setup
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Configure the AI coach for this child.
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl rounded-3xl bg-surface-container-lowest p-4 sm:p-6">
        {program.speechCoachConfig ? (
          <PerPatientCoachSetup
            key={JSON.stringify(program.speechCoachConfig)}
            speechCoachConfig={program.speechCoachConfig}
            templates={templates ?? []}
            onSave={handleSaveConfig}
            isSaving={isSaving}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-headline text-lg font-semibold text-foreground">
                Pick a starting point
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a coaching style for this child. You can customize it after.
              </p>
            </div>
            <QuickStartCards onSelect={handleQuickStart} />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7.2: Run existing tests for SlpSpeechCoachPage**

```bash
npx vitest run src/features/speech-coach/components/__tests__/speech-coach-shell.test.tsx 2>&1 | tail -15
```

Expected: PASS (shell tests don't test inner SlpSpeechCoachPage internals).

- [ ] **Step 7.3: Commit**

```bash
git add src/features/speech-coach/components/slp-speech-coach-page.tsx
git commit -m "feat(speech-coach): replace SlpSpeechCoachPage with QuickStartCards + PerPatientCoachSetup"
```

---

## Task 8: Rebuild TemplateLibraryPage → global Speech Coach Hub

**Files:**
- Modify: `src/features/speech-coach/components/template-library-page.tsx`

- [ ] **Step 8.1: Replace TemplateLibraryPage**

Replace the full contents of `src/features/speech-coach/components/template-library-page.tsx`:

```typescript
"use client";

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";

import { SYSTEM_TEMPLATES } from "../lib/system-templates";
import { type SpeechCoachTemplateForm, TemplateEditor } from "./template-editor";

type Section = "mine" | "system";

export function TemplateLibraryPage() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Doc<"speechCoachTemplates">["_id"] | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("mine");

  const templates = useQuery(api.speechCoachTemplates.listMine, {});
  const createTemplate = useMutation(api.speechCoachTemplates.create);
  const updateTemplate = useMutation(api.speechCoachTemplates.update);
  const duplicateTemplate = useMutation(api.speechCoachTemplates.duplicate);

  async function handleCreate(form: SpeechCoachTemplateForm) {
    await createTemplate({ template: form });
    setCreating(false);
    toast.success("Template created");
  }

  async function handleUpdate(id: Doc<"speechCoachTemplates">["_id"], form: SpeechCoachTemplateForm) {
    await updateTemplate({ templateId: id, template: form });
    setEditing(null);
    toast.success("Template saved");
  }

  async function handleDuplicate(id: Doc<"speechCoachTemplates">["_id"]) {
    await duplicateTemplate({ templateId: id });
    toast.success("Template duplicated — find the copy in My Templates");
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl text-foreground">Speech Coach Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable coaching setups for your whole caseload.
          </p>
        </div>
        {!creating && (
          <Button
            type="button"
            onClick={() => { setCreating(true); setActiveSection("mine"); }}
            className="bg-gradient-to-br from-[#00595c] to-[#0d7377] font-semibold"
          >
            + New template
          </Button>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 rounded-full bg-surface-container p-1 w-fit">
        {(["mine", "system"] as Section[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSection(s)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === s
                ? "bg-white text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {s === "mine" ? "My Templates" : "System Templates"}
          </button>
        ))}
      </div>

      {/* New template form */}
      {creating && (
        <div className="rounded-xl bg-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline text-xl text-foreground">New template</h2>
            <button type="button" onClick={() => setCreating(false)} className="text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
          <TemplateEditor initialTemplate={null} onSave={handleCreate} />
        </div>
      )}

      {/* My Templates */}
      {activeSection === "mine" && (
        <div>
          {templates === undefined && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {templates?.length === 0 && !creating && (
            <div className="rounded-xl bg-muted px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No templates yet. Create one or duplicate a system template below.
              </p>
              <Button type="button" onClick={() => setCreating(true)} className="mt-4">
                Create first template
              </Button>
            </div>
          )}
          {templates && templates.length > 0 && (
            <ul className="flex flex-col gap-3">
              {templates.map((t: Doc<"speechCoachTemplates">) => (
                <li key={t._id} className="rounded-xl bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-headline text-lg text-foreground">{t.name || "Untitled"}</p>
                      {t.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button" variant="ghost" size="sm"
                        onClick={() => setEditing((c) => c === t._id ? null : t._id)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => handleDuplicate(t._id)}
                      >
                        Duplicate
                      </Button>
                    </div>
                  </div>
                  {editing === t._id && (
                    <div className="mt-4 rounded-xl bg-background p-6">
                      <div className="mb-6 flex items-center justify-between">
                        <h2 className="font-headline text-xl text-foreground">Edit template</h2>
                        <button type="button" onClick={() => setEditing(null)} className="text-sm text-muted-foreground hover:text-foreground">
                          Cancel
                        </button>
                      </div>
                      <TemplateEditor
                        initialTemplate={{ ...t, name: t.name || "" }}
                        onSave={(form) => handleUpdate(t._id, form)}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* System Templates */}
      {activeSection === "system" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Built-in starting points. Not editable — duplicate one to create a custom version.
          </p>
          {SYSTEM_TEMPLATES.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-4 rounded-xl bg-card p-4">
              <div>
                <p className="font-headline text-lg text-foreground">{t.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.sessionDefaults.defaultDurationMinutes} min · Ages {t.sessionDefaults.ageRange}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toast.info("To customize, first apply to a child from their profile.")}
              >
                Info
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8.2: Run existing template library tests**

```bash
npx vitest run src/features/speech-coach/components/__tests__/template-library-page.test.tsx 2>&1 | tail -15
```

Expected: PASS (existing tests still pass; new sections added without breaking old assertions).

- [ ] **Step 8.3: Commit**

```bash
git add src/features/speech-coach/components/template-library-page.tsx
git commit -m "feat(speech-coach): rebuild TemplateLibraryPage as global hub with System Templates section"
```

---

## Task 9: Update session-guidance.ts to use childAge for language tier

**Files:**
- Modify: `src/features/speech-coach/lib/session-guidance.ts`
- Modify: `src/features/speech-coach/lib/__tests__/session-guidance.test.ts`

- [ ] **Step 9.1: Write the failing test**

Add to `src/features/speech-coach/lib/__tests__/session-guidance.test.ts`:

```typescript
import { buildSessionGuidance } from "../session-guidance";

// Add this test inside the existing describe block or as a new describe:
describe("buildSessionGuidance with childAge", () => {
  it("includes the actual child age when childAge is provided", () => {
    const guidance = buildSessionGuidance(
      { targetSounds: ["/s/"], ageRange: "5-7", durationMinutes: 10 },
      { targetSounds: ["/s/"], ageRange: "5-7", defaultDurationMinutes: 10, childAge: 8 }
    );
    expect(guidance).toContain("8");
  });

  it("falls back to ageRange when childAge is absent", () => {
    const guidance = buildSessionGuidance(
      { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
      { targetSounds: ["/s/"], ageRange: "2-4", defaultDurationMinutes: 5 }
    );
    expect(guidance).toContain("2-4");
  });
});
```

- [ ] **Step 9.2: Run test to verify it fails**

```bash
npx vitest run src/features/speech-coach/lib/__tests__/session-guidance.test.ts 2>&1 | tail -10
```

Expected: FAIL — guidance does not include child age `8`.

- [ ] **Step 9.3: Update buildSessionGuidance**

In `src/features/speech-coach/lib/session-guidance.ts`, replace the age line:

```typescript
// Before:
    `Child age range: ${sessionConfig.ageRange}.`,

// After:
    speechCoachConfig?.childAge
      ? `Child age: ${speechCoachConfig.childAge} years old.`
      : `Child age range: ${sessionConfig.ageRange}.`,
```

The function signature already accepts `SpeechCoachConfig | null` as the second argument, so `speechCoachConfig?.childAge` is valid.

- [ ] **Step 9.4: Run test to verify it passes**

```bash
npx vitest run src/features/speech-coach/lib/__tests__/session-guidance.test.ts 2>&1 | tail -10
```

Expected: PASS — all tests including new ones.

- [ ] **Step 9.5: Run full test suite to check for regressions**

```bash
npm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: same pass count as before ± new tests added. No new failures.

- [ ] **Step 9.6: Commit**

```bash
git add src/features/speech-coach/lib/session-guidance.ts \
        src/features/speech-coach/lib/__tests__/session-guidance.test.ts
git commit -m "feat(speech-coach): use childAge in session guidance for more precise language tier"
```

---

## Self-Review Checklist

- [x] System templates constant — 4 templates with all required fields
- [x] Schema: `childAge` and `reducedMotion` added (Task 1)
- [x] `ageRangeFromAge` helper with tests (Task 2)
- [x] `duplicate` mutation (Task 4)
- [x] `QuickStartCards` replaces blank dead-end (Task 5, 7)
- [x] `PerPatientCoachSetup` shows SLP notes at top, Advanced collapsed (Task 6)
- [x] `SlpSpeechCoachPage` uses both new components correctly (Task 7)
- [x] `TemplateLibraryPage` now has My/System tabs, global create/edit/duplicate (Task 8)
- [x] `buildSessionGuidance` uses `childAge` when available (Task 9)
- [x] No `CoachSetupTab` import remains in SlpSpeechCoachPage (replaced by PerPatientCoachSetup)
