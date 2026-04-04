# WAB Component Contract Design

**Date:** 2026-04-04
**Status:** Approved
**Audience:** Bridges engineering

## Summary

Incorporate the Web Artifacts Builder (WAB) skill's component library and design strategies into the config-driven template engine — without the HTML bundling pipeline. The goal is a TypeScript-first "component contract" that improves three things simultaneously: AI-generated config quality, template runtime UI richness, and new template authoring velocity.

## Background

The Bridges template engine (pivoted from WAB/code-gen on 2026-04-01) renders therapy apps as React components in `src/features/tools/lib/templates/`. These apps are used by children — many autistic — during SLP therapy sessions. Two gaps exist:

1. **Missing components:** `src/shared/components/ui/` has ~27 of the 40+ shadcn/ui components WAB pre-packages.
2. **No AI/authoring contract:** `generateToolConfig` (Convex action) has no knowledge of available components or therapy-appropriate design rules; template authors have no scaffold or guidelines.

## Architecture

```
src/features/tools/lib/
  component-registry.ts        ← single source of truth (new)
  templates/...                ← unchanged structure

convex/
  tool-component-prompt.ts     ← generated string, committed (new)
  tools_ai.ts                  ← imports ↑, system prompt enhanced

scripts/
  new-template.ts              ← scaffold generator (new)
  sync-registry.ts             ← writes convex/tool-component-prompt.ts (new)
```

**Boundary constraint:** Convex actions run in Convex cloud and cannot import from `src/`. The registry lives in `src/` (used by scaffold + future editor tooling). `scripts/sync-registry.ts` generates `convex/tool-component-prompt.ts` — a committed, auto-generated file. Devs run `npx tsx scripts/sync-registry.ts` after editing the registry and commit the result.

## Deliverable 1: Missing Components

Add 13 missing shadcn/ui components via `npx shadcn@latest add`:

```
slider, carousel, drawer, calendar, collapsible, table, command,
form, alert, aspect-ratio, hover-card, navigation-menu, breadcrumb
```

All land in `src/shared/components/ui/` per existing project convention.

## Deliverable 2: `component-registry.ts`

### Types

```typescript
type ComponentEntry = {
  name: string;        // "Slider"
  importPath: string;  // "@/shared/components/ui/slider"
  description: string; // "Range input for numeric values"
  therapyUse: string;  // "Difficulty level, volume, timer duration controls"
  props?: string;      // "min, max, step, value, onValueChange"
};

type DesignRule = {
  rule: string;
  rationale: string;
};
```

### `COMPONENT_REGISTRY`

Full typed array of all 40 shadcn/ui components available in the project. Each entry includes the import path, a one-line description, and a `therapyUse` note written for the AI — not for developers.

### `TEMPLATE_DESIGN_RULES`

Rules for the **generated apps** (used by children), not the Bridges platform (used by SLPs). These are distinct audiences. Bridges brand/design rules live in `DESIGN.md` and are not referenced here.

```typescript
export const TEMPLATE_DESIGN_RULES: DesignRule[] = [
  // Accessibility
  { rule: "Touch targets minimum 60×60px", rationale: "Kids have less fine motor control than adults" },
  { rule: "Text minimum 18px, prefer 20–24px", rationale: "Child readability" },
  { rule: "WCAG AAA contrast preferred, AA minimum", rationale: "Vision + cognitive accessibility" },

  // Sensory
  { rule: "Animations off by default, opt-in via shell settings", rationale: "Autistic users can be motion-sensitive" },
  { rule: "No autoplay sounds — always user-triggered", rationale: "Sensory sensitivity" },
  { rule: "Avoid busy or patterned backgrounds", rationale: "Reduces visual noise and cognitive load" },

  // Cognitive
  { rule: "One primary action visible at a time", rationale: "Reduces decision fatigue for young and autistic users" },
  { rule: "Every action must produce immediate visible feedback", rationale: "Predictability is calming" },
  { rule: "No dead ends — all errors are easily undoable", rationale: "Error tolerance reduces anxiety" },
  { rule: "Symbol and text label always together", rationale: "AAC convention: never symbol alone or text alone" },

  // Color
  { rule: "Bright, saturated colors over muted or neutral palettes", rationale: "Engagement and visual clarity for kids" },
  { rule: "Fitzgerald key for AAC: yellow=people, green=verbs, blue=descriptors, orange=nouns", rationale: "SLP standard AAC color convention" },
  { rule: "No purple/blue gradients", rationale: "Generic AI aesthetic — not therapy-appropriate" },

  // Layout
  { rule: "Large rounded shapes — prefer rounded-2xl and rounded-full", rationale: "Approachable, non-threatening UI" },
  { rule: "Simple flat navigation — kids tap, they do not browse", rationale: "Minimize navigation complexity" },
  { rule: "Positive reinforcement (stars, celebrations) must be dismissible", rationale: "Sensory sensitivity" },
];
```

### `registryToPrompt(): string`

Serializes `COMPONENT_REGISTRY` and `TEMPLATE_DESIGN_RULES` into a single markdown string for injection into the Convex action system prompt:

```
## Available UI Components
- **Slider** (`@/shared/components/ui/slider`) — Range input. Props: min, max, step, value, onValueChange. Therapy use: difficulty level, volume, timer controls.
...

## Child & Autism-Friendly Design Rules
- Touch targets minimum 60×60px (kids have less fine motor control than adults)
...
```

## Deliverable 3: Enhanced `generateToolConfig` System Prompt

`convex/tool-component-prompt.ts` — auto-generated, committed:
```typescript
// AUTO-GENERATED by scripts/sync-registry.ts — do not edit manually
export const COMPONENT_PROMPT = `...`;
```

`convex/tools_ai.ts` updated system prompt structure:
```
You are generating configuration for a therapy tool used by children,
many of whom are autistic or have communication disorders. An SLP will
deploy this tool — a child will use it during a real therapy session.

[COMPONENT_PROMPT injected here]

## Task
Generate a valid JSON config matching this Zod schema:
[schema]

User's description: [input]
```

The model is instructed to apply design rules unconditionally, not as suggestions.

## Deliverable 4: Template Scaffold

### `scripts/new-template.ts`

Usage: `npx tsx scripts/new-template.ts <name>`

Generates:
```
src/features/tools/lib/templates/<name>/
  schema.ts    ← Zod config schema boilerplate + AppShellConfigSchema wired in
  editor.tsx   ← standard editor shell with section headers
  runtime.tsx  ← RuntimeShell wrapper + therapy-appropriate starter layout
```

Also appends the new template entry to `src/features/tools/lib/registry.ts`.

The `runtime.tsx` stub:
- Imports `RuntimeShell`
- Includes a `// DESIGN: child-friendly — 60px touch targets, 20px+ text, bright colors` comment block
- Pre-imports `Button`, `Card`, `Progress` as most-commonly needed
- Has a `// TODO: import additional components from registry as needed` comment
- Prints a next-steps checklist on completion

### `scripts/sync-registry.ts`

Usage: `npx tsx scripts/sync-registry.ts`

- Imports `registryToPrompt()` from `src/features/tools/lib/component-registry.ts`
- Writes `convex/tool-component-prompt.ts`
- Prints `✓ convex/tool-component-prompt.ts updated — commit this file`

Must be run and committed whenever `COMPONENT_REGISTRY` or `TEMPLATE_DESIGN_RULES` is updated.

## What Is Not In Scope

- Bridges platform design rules (live in `DESIGN.md`, not the registry)
- HTML bundling or iframe-based rendering (WAB pipeline is gone)
- Editor UI component picker (future: the registry enables this, but not built now)
- `tool_events` analytics or parent portal (separate roadmap items)

## Testing

- `component-registry.test.ts` — sanity checks: every entry has non-empty `importPath`, `therapyUse`, no duplicates
- Existing template tests unchanged
- Manual: run `scripts/sync-registry.ts`, verify `convex/tool-component-prompt.ts` output is well-formed
- Manual: run `scripts/new-template.ts test-template`, verify all three files are generated and registry is updated
