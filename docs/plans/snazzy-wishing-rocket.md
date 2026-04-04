---
plan_version: "1.0"
created: "2026-04-03"
title: "Spec Completion — Builder Shell, SLP Tools & Speech Coach Remaining Items"
status: "draft"
tier: "complex"
domain_tags: [convex, speech-coach, tools-builder, runtime]
files:
  modify:
    - convex/schema.ts
    - convex/speechCoachTemplates.ts
    - src/features/tools/lib/runtime/app-shell-types.ts
    - src/features/tools/lib/runtime/runtime-shell.tsx
    - src/features/tools/lib/registry.ts
    - src/features/tools/lib/templates/token-board/runtime.tsx
    - src/features/tools/lib/templates/matching-game/runtime.tsx
    - src/app/globals.css
  create:
    - convex/speechCoachHistory.ts
    - src/features/speech-coach/components/session-dot-calendar.tsx
    - src/features/speech-coach/components/practice-frequency-panel.tsx
team_hint: "medium — 6–8 files modified, 3 created, no cross-cutting architectural risk"
verification:
  precheck: "npx convex dev --once && npx tsc --noEmit"
  audit: "npm test -- --run"
---

# Plan: Spec Completion — Builder Shell, SLP Tools & Speech Coach Remaining Items

## Context

Three design specs were approved on 2026-04-02. The implementation that followed is 85–90% complete: the LiveKit runtimeSecret is fully wired (entrypoint.ts → agent.ts → tools.ts → logAttemptFromRuntime), all three agent tools are implemented, split caregiver/SLP analysis prompts exist, and the runtime shell has difficulty, progress, sounds, and theme presets.

**Confirmed remaining gaps** (verified by codebase audit 2026-04-03):

1. `sessionMode` missing from `app_instances` schema
2. `isSystemTemplate` missing from `speechCoachTemplates` schema → 4 built-in templates don't exist
3. `enableInstructions` in `AppShellConfig` type is never rendered in `RuntimeShell`
4. Token board completion overlay has no confetti (spec: "confetti burst, CSS-only")
5. Matching game plays no audio on correct match (voice prop unused, `_voice`)
6. No SLP accuracy trend view ("session-over-session accuracy trend" from `positionAccuracy`)
7. No caregiver session dot calendar (practice consistency view)
8. No SLP caseload practice frequency panel on patient speech coach tab

---

## Architecture

All work stays within existing feature slices:
- Schema additions: `convex/schema.ts`
- System template CRUD: `convex/speechCoachTemplates.ts` (existing) + new `convex/speechCoachHistory.ts`
- Shell instructions: `src/features/tools/lib/runtime/` (types + shell)
- Runtime polish: `src/features/tools/lib/templates/{token-board,matching-game}/runtime.tsx`
- History/reporting: `src/features/speech-coach/components/` (two new files)

No new routes required. All new components slot into existing patient-profile and speech-coach pages.

---

## Files

| Path | Action | Purpose |
|------|--------|---------|
| `convex/schema.ts` | Modify | Add `sessionMode` to `app_instances`; add `isSystemTemplate` + `by_isSystemTemplate` index to `speechCoachTemplates` |
| `convex/speechCoachTemplates.ts` | Modify | `seedSystemTemplates` internalMutation; update `listMine` + `getById` to expose system templates |
| `convex/speechCoachHistory.ts` | **Create** | `getProgressTrend`, `getRecentPatientSessions`, `getPracticeFrequency` queries |
| `src/features/tools/lib/runtime/app-shell-types.ts` | Modify | Add `instructionsText?: string` to `AppShellConfig` |
| `src/features/tools/lib/runtime/runtime-shell.tsx` | Modify | Render `?` help button + Dialog when `enableInstructions && instructionsText` |
| `src/features/tools/lib/registry.ts` | Modify | Add `instructionsText` to each of the 5 template shell configs |
| `src/features/tools/lib/templates/token-board/runtime.tsx` | Modify | Add confetti spans inside completion overlay; disabled when `config.highContrast` |
| `src/features/tools/lib/templates/matching-game/runtime.tsx` | Modify | Wire `voice` (was `_voice`); call `voice.speak` on correct match when `soundsEnabled` |
| `src/app/globals.css` | Modify | Add `@keyframes confetti-fall` keyframe |
| `src/features/speech-coach/components/session-dot-calendar.tsx` | **Create** | Caregiver calendar dot view (filled = session, empty = no session) |
| `src/features/speech-coach/components/practice-frequency-panel.tsx` | **Create** | SLP caseload: sessions completed, avg/week, sounds practiced this month |

---

## Key Types

### A. Schema additions

```typescript
// convex/schema.ts — app_instances table (after line ~245 with goalTags)
sessionMode: v.optional(v.boolean()),

// convex/schema.ts — speechCoachTemplates table (after slpUserId field, ~line 1079)
isSystemTemplate: v.optional(v.boolean()),
// New index:
.index("by_isSystemTemplate", ["isSystemTemplate"])
```

### B. AppShellConfig type

```typescript
// src/features/tools/lib/runtime/app-shell-types.ts
export type AppShellConfig = {
  themePreset: ThemePreset;
  accentColor: string;
  enableInstructions: boolean;
  instructionsText?: string;      // ← new: text shown in help dialog
  enableSounds: boolean;
  enableDifficulty: boolean;
  enableProgress: boolean;
};
```

### C. History query return types

```typescript
// convex/speechCoachHistory.ts
type ProgressTrendEntry = {
  sound: string;
  position: "initial" | "medial" | "final" | "unknown";
  firstAccuracy: number;   // correct/total from earliest record
  latestAccuracy: number;  // correct/total from most recent record
  sessionCount: number;    // number of progress records with this sound
};

type PracticeFrequency = {
  sessionsLast30Days: number;
  avgPerWeek: number;       // sessionsLast30Days / 4.3 weeks
  lastSessionAt: number | null;  // startedAt timestamp
  soundsSummary: Array<{ sound: string; count: number }>;
};
```

---

## Integration Points

### Phase A — Schema (convex/schema.ts)

Add to `app_instances` table after `goalTags` field (~line 245):
```typescript
sessionMode: v.optional(v.boolean()),
```

Add to `speechCoachTemplates` table body after `slpUserId` (~line 1079) and add index:
```typescript
isSystemTemplate: v.optional(v.boolean()),
// in the .index chain:
.index("by_isSystemTemplate", ["isSystemTemplate"])
```

### Phase B — System Templates (convex/speechCoachTemplates.ts)

**1. Add `seedSystemTemplates` internalMutation** — idempotent (skip if already seeded):

```typescript
export const seedSystemTemplates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("speechCoachTemplates")
      .withIndex("by_isSystemTemplate", (q) => q.eq("isSystemTemplate", true))
      .first();
    if (existing) return; // already seeded
    // Insert 4 system templates with slpUserId: "system", isSystemTemplate: true
    // Sound Drill / Conversational / Listening First / Mixed Practice
  },
});
```

**2. Update `listMine`** to union system templates:

```typescript
export const listMine = slpQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.slpUserId) return [];
    const [mine, system] = await Promise.all([
      ctx.db.query("speechCoachTemplates")
        .withIndex("by_slpUserId_updatedAt", (q) => q.eq("slpUserId", ctx.slpUserId!))
        .order("desc").take(100),
      ctx.db.query("speechCoachTemplates")
        .withIndex("by_isSystemTemplate", (q) => q.eq("isSystemTemplate", true))
        .collect(),
    ]);
    return [...system, ...mine];
  },
});
```

**3. Update `getById`** to allow reading system templates:
```typescript
// Change ownership check:
if (!template || (!template.isSystemTemplate && template.slpUserId !== ctx.slpUserId)) return null;
```

**4. Block editing system templates in `update`:**
```typescript
if (existing.isSystemTemplate) throw new ConvexError("System templates cannot be edited — duplicate first");
```

**5. Call `seedSystemTemplates` from an HTTP action or scheduled mutation** (one-time, can be called manually via dashboard).

### Phase C — Shell Instructions (runtime-shell.tsx)

Read `shell.enableInstructions` and `shell.instructionsText` from the shell context. When both are truthy, render a `?` icon button in the sticky header. On click, open a Shadcn `<Dialog>` with the instructions text.

The shell context (or props) already carries the `AppShellConfig` — no new plumbing needed. Integration point: inside the header JSX, before/after the existing title and exit button.

### Phase D — Registry instructionsText (registry.ts)

Each template registration already has `shell: AppShellConfig`. Add `instructionsText` to each:

```typescript
// AAC Board
shell: { ...DEFAULT_APP_SHELL, enableDifficulty: false, enableProgress: false,
  instructionsText: "Tap a picture to hear the word. Tap the speaker button to say your sentence." },

// Token Board
shell: { ...DEFAULT_APP_SHELL, enableDifficulty: false, enableProgress: false,
  instructionsText: "Tap a token each time you do the task. When all tokens are filled, you earn your reward!" },

// Visual Schedule
shell: { ...DEFAULT_APP_SHELL, enableDifficulty: false,
  instructionsText: "Tap each step when it's done. The next step will light up." },

// Matching Game
shell: { ...DEFAULT_APP_SHELL, enableDifficulty: true, enableProgress: true,
  instructionsText: "Tap a word on the left, then tap its match on the right. Find all the pairs!" },

// First/Then Board
shell: { ...DEFAULT_APP_SHELL, enableDifficulty: false, enableProgress: false,
  instructionsText: "First finish the task on the left, then you get the reward on the right." },
```

### Phase E — Token Board Confetti (runtime.tsx + globals.css)

In `globals.css`, add alongside existing `token-fill` / `shake` / `checkmark-pop` keyframes:

```css
@keyframes confetti-fall {
  0% { transform: translateY(-40px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(300px) rotate(720deg); opacity: 0; }
}
```

In `token-board/runtime.tsx`, inside the `completed` overlay and only when `!config.highContrast`, render 20 confetti spans:

```tsx
{!config.highContrast && Array.from({ length: 20 }).map((_, i) => (
  <span key={i} aria-hidden="true" style={{
    position: "absolute",
    left: `${Math.random() * 100}%`,
    top: 0,
    width: 10,
    height: 10,
    borderRadius: Math.random() > 0.5 ? "50%" : "0",
    backgroundColor: ["#00595c","#0d7377","#FBBF24","#EC4899","#3B82F6"][i % 5],
    animation: `confetti-fall ${600 + i * 80}ms cubic-bezier(0.4,0,0.2,1) ${i * 40}ms both`,
  }} />
))}
```

Use a stable random seed (not `Math.random()` inline) to avoid hydration issues. Use a pre-computed positions array via `useMemo`.

### Phase F — Matching Game Audio (runtime.tsx)

Change `voice: _voice` to `voice` in the destructure. On correct match:

```typescript
const shellState = useShellState(); // already imported
if (isCorrect) {
  if (shellState?.soundsEnabled !== false) {
    void voice.speak({ text: "Great match!" });
  }
  // existing match logic...
}
```

### Phase G — Convex History Queries (speechCoachHistory.ts)

```typescript
"use node"; // not needed — pure queries

export const getProgressTrend = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const records = await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_patientId", (q) => q.eq("patientId", patientId))
      .order("asc")  // oldest first for trend direction
      .collect();
    // Group positionAccuracy entries by sound+position across records
    // Return first vs latest accuracy per sound+position
  },
});

export const getRecentPatientSessions = query({  // public — caregivers need this
  args: { patientId: v.id("patients"), limitDays: v.number() },
  handler: async (ctx, { patientId, limitDays }) => {
    const since = Date.now() - limitDays * 24 * 60 * 60 * 1000;
    return ctx.db
      .query("speechCoachSessions")
      .withIndex("by_patientId_startedAt", (q) =>
        q.eq("patientId", patientId).gte("startedAt", since)
      )
      .order("desc")
      .take(60);
  },
});

export const getPracticeFrequency = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const sessions = await ctx.db
      .query("speechCoachSessions")
      .withIndex("by_patientId_startedAt", (q) =>
        q.eq("patientId", patientId).gte("startedAt", since)
      )
      .collect();
    // Compute: count, avg/week, lastSessionAt, sounds from rawAttempts
  },
});
```

### Phase H — New UI Components

**`session-dot-calendar.tsx`** — accepts `sessions: Array<{ startedAt: number; summary?: string }>`, renders last 30 days as a list. Filled dot (●) for days with sessions, empty circle (○) for gaps. Each session shows the date, target sounds from progress, duration, and summary emoji.

**`practice-frequency-panel.tsx`** — accepts `PracticeFrequency` data, renders the stats panel for SLP view on patient speech coach tab. Wire into the existing patient speech coach page (check `src/app/(app)/patients/[id]/speech-coach/page.tsx`).

---

## Constraints

- **Confetti `Math.random()`**: Positions must be computed once via `useMemo` (not inline) to avoid React reconciliation issues on re-render.
- **System template `slpUserId`**: Use `"system"` as the sentinel — the existing Convex index will work without schema changes to `slpUserId`.
- **`getRecentPatientSessions`**: Must be a regular `query` (not `slpQuery`) since caregivers need it too. Relies on Clerk auth check: verify `ctx.auth.getUserIdentity()` is non-null.
- **`speechCoachHistory.ts`**: Do NOT add `"use node"` — it's pure Convex queries, no Node.js APIs.
- **No `Math.random()` in SSR paths**: The confetti array must be in a `"use client"` component (token board runtime already is).
- Run `npx convex dev --once` and `npx tsc --noEmit` before pushing — Convex deploy catches type errors Vitest misses.

---

## Verification

**Automated:**
```bash
npm test -- --run
npx tsc --noEmit
npx convex dev --once
```

**Manual:**
1. Matching game: correct answer → hear "Great match!" (sounds must be enabled in shell)
2. Token board: fill all tokens → full-screen overlay with confetti squares falling; highContrast mode → no confetti
3. Any template → tap `?` button in header → instructions dialog appears with template-specific text
4. Speech coach templates page → 4 system templates (Sound Drill, Conversational, Listening First, Mixed Practice) appear at top, greyed "duplicate only" edit action
5. Patient speech coach tab → SLP sees "Home Practice · Last 30 days" panel with session count and avg/week
6. Caregiver speech coach page → session dot calendar shows filled/empty circles for last 30 days
7. SLP session history for a patient with 3+ analyzed sessions → accuracy trend section shows "↑ 68% → 82% over N sessions" per sound
