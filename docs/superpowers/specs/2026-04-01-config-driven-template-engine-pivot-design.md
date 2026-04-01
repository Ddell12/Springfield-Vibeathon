# Config-Driven Template Engine Pivot

**Date:** 2026-04-01
**Status:** Approved

## Summary

Replace the AI code-generation builder (WAB/Parcel streaming pipeline) with a config-driven template engine where SLPs pick a therapy tool template, optionally ask Claude to generate a structured config from a plain-language description, review and edit the pre-filled form with live preview, and publish to a tokenized share link. The child-facing runtime renders directly from config — no bundling, no iframe, no generated code.

---

## What Changes

### Retired
- `src/app/api/generate/` — WAB streaming SSE route
- WAB scaffold + Parcel bundling pipeline
- `convex/publish.ts` — Vercel deploy pipeline
- `src/features/builder/` — chat-based builder (replaced by `src/features/tools/`)
- Code-generation portions of `convex/aiActions.ts` (TTS action stays)

### Preserved (deprioritized, not removed)
- Session notes, goals tracking, teletherapy (LiveKit), progress reports
- All auth infrastructure (Clerk, dual roles)
- Billing (Stripe)
- ElevenLabs TTS/STT actions — TTS reused in AAC runtime
- Gemini image generation — reused for AAC button image generation

### New
- `src/features/tools/` — full template engine feature slice
- Three new Convex tables: `app_instances`, `published_app_versions`, `tool_events`
- `/tools/new` builder wizard, `/tools/[id]/edit`, `/apps/[shareToken]` runtime

---

## Core Architecture

**Old pipeline:**
```
Claude → React code → Parcel → iframe blob URL
```

**New pipeline:**
```
Claude → config JSON (validated against Zod schema) → form pre-populated → runtime renders directly
```

The runtime is a standard Next.js page. No bundling. No iframes. No code execution at runtime.

**Registry pattern:**
```ts
const templateRegistry = {
  aac_board:        { schema, Editor, Runtime },
  first_then_board: { schema, Editor, Runtime },
  token_board:      { schema, Editor, Runtime },
  visual_schedule:  { schema, Editor, Runtime },
  matching_game:    { schema, Editor, Runtime },
}

// Runtime page
const { Runtime } = templateRegistry[app.templateType]
return <Runtime config={JSON.parse(app.configJson)} onEvent={logEvent} />
```

---

## Template Registry Structure

```
src/features/tools/
  lib/
    registry.ts
    templates/
      aac-board/
        schema.ts       ← Zod schema for valid config
        editor.tsx      ← SLP-facing form fields
        runtime.tsx     ← child-facing React component
      first-then-board/
        schema.ts / editor.tsx / runtime.tsx
      token-board/
        schema.ts / editor.tsx / runtime.tsx
      visual-schedule/
        schema.ts / editor.tsx / runtime.tsx
      matching-game/
        schema.ts / editor.tsx / runtime.tsx
  components/
    builder/
      template-picker.tsx
      ai-assist-panel.tsx
      config-editor.tsx      ← renders Editor for chosen template
      preview-panel.tsx      ← renders Runtime with live config
    runtime/
      tool-runtime-page.tsx
  hooks/
    use-tool-builder.ts      ← wizard state, draft autosave
    use-ai-config-assist.ts  ← calls Convex action, manages loading/error
```

**V1 template priority:**
1. AAC Board — highest complexity, highest clinical value
2. First/Then Board — simplest, ships fast
3. Token Board — simplest, ships fast
4. Visual Schedule — medium
5. Matching Game — medium

---

## Data Model

### New Convex tables

```ts
app_instances: defineTable({
  templateType: v.string(),
  title: v.string(),
  patientId: v.id("patients"),
  slpUserId: v.string(),
  configJson: v.string(),           // JSON string, validated via Zod at app layer
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
  configJson: v.string(),           // immutable snapshot at publish time
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

**Design notes:**
- `configJson` stored as string (not `v.object()`) — template schemas evolve; Zod validates at app layer
- Publishing bumps `version`, creates a `published_app_versions` snapshot — editing never mutates published state
- `shareToken` on `app_instances` is the parent-facing credential; no login required to use `/apps/[shareToken]`

---

## Builder Wizard UX

Route: `/tools/new` (4 steps)

**Step 1 — Choose child**
- Dropdown of existing patients
- Inline "Add new child" creates minimal patient record (name, age range, optional goals/interests)
- Child goals/interests passed to AI assist

**Step 2 — Choose template**
- Card grid of 5 templates
- Each card: what it does, who it's for, estimated setup time

**Step 3 — AI assist + form (2-column layout)**
```
┌─────────────────────────┬──────────────────────────┐
│  Config form            │  Live preview            │
│  (editor.tsx output)    │  (runtime.tsx, read-only)│
│                         │                          │
│  [AI Assist panel]      │  [Tablet / Child toggle] │
└─────────────────────────┴──────────────────────────┘
```
- AI assist: SLP describes what they want in plain language → Convex action calls Claude → returns validated config JSON → form pre-populates
- "Skip — fill manually" bypasses AI
- Preview re-renders on every config change (React state, no network)

**Step 4 — Preview → Publish**
- Full preview (tablet + child mode toggle)
- Publish: creates `published_app_versions` row + generates `shareToken`
- Shows copy link / assign to parent portal

---

## AI Content Assist

**Convex action:** `convex/tools.ts` → `generateToolConfig`

```
Input:  templateType, description (SLP free text), childProfile { goals, interests, age }
Output: validated config JSON for the chosen template
```

Claude is prompted with:
- The template's Zod schema shape (field names, types, constraints)
- Child profile context
- SLP's plain-language description

Output is parsed and validated against the template's Zod schema before returning. Invalid or hallucinated fields are stripped — the form never receives malformed data.

**Key constraint:** Claude fills structured fields only. It never generates React code, JSX, HTML, or executable content of any kind.

---

## Publishing + Parent Portal

**Publish flow:**
1. SLP clicks Publish
2. Mutation creates `published_app_versions` snapshot, sets `app_instances.status = "published"`, generates `shareToken`
3. SLP copies link: `https://bridgeai.app/apps/[shareToken]`

**Runtime route** (`/apps/[shareToken]`):
- Public route (excluded from Clerk middleware matcher)
- Fetches published config via `shareToken` index
- Renders `registry[templateType].Runtime` with config props
- Logs `tool_events` via unauthenticated HTTP action

**Parent portal** (`/family`):
- Existing caregiver role + `/family` route
- Shows `app_instances` for the caregiver's linked patient
- Each tool card → opens `/apps/[shareToken]`
- No changes needed to existing auth/role system

---

## Functional Requirements Summary

| Area | Requirement |
|------|------------|
| Templates | 5 templates: AAC board, first/then, token board, visual schedule, matching game |
| Builder | 4-step wizard, draft autosave, live preview |
| AI assist | Optional; fills structured config fields; Zod-validated output |
| Publish | Versioned snapshots; shareToken for unauthenticated access |
| Runtime | Renders from config at `/apps/[shareToken]`; logs events |
| Parent portal | Existing `/family` route wired to `app_instances` |
| Analytics | `tool_events` table; per-tool summaries on patient progress tab |

---

## Non-Functional Requirements

- Runtime must load fast on tablet (no bundling step)
- Builder preview must feel instant (React state updates only)
- Child-facing tools: large touch targets, minimal text, high contrast options, tablet-first
- `shareToken` uses cryptographically random value (not sequential ID)
- Published versions are immutable — editing creates new version, never overwrites
- Child data stays behind Clerk auth; only the runtime (via shareToken) is public

---

## Build Order

**Phase 1 — Foundation**
- New Convex tables + indexes
- Template registry + AAC Board (schema + editor + runtime)
- Builder wizard (all 4 steps) wired to AAC Board only
- Publish + shareToken + `/apps/[shareToken]` runtime route
- Remove WAB/Parcel pipeline + code-gen builder

**Phase 2 — Remaining Templates**
- First/Then Board, Token Board, Visual Schedule
- AI content assist (Convex action + panel UI)
- Draft autosave

**Phase 3 — Polish + Analytics**
- Matching Game
- `tool_events` logging in all runtimes
- Progress summary on patient profile
- Parent portal wired to `app_instances`
- Tool duplication (for another child)
