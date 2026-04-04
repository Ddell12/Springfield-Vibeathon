# Full-Stack Template Runtime Design

**Date:** 2026-04-04
**Status:** Approved
**Builds on:** `2026-04-04-wab-component-contract-design.md`

## Problem

Generated therapy apps are single-page, session-local artifacts. There is no in-app navigation, no persistence between sessions, and no way for an SLP to review usage data without leaving the tool. The runtime shell's sidebar takes up 280px of horizontal space that should belong to the child's interactive surface.

## Goal

Every template ships three standard pages (Main, Settings, History) plus any template-specific extras. The SLP sees all pages in preview/session mode. Published share links show only child-facing pages. Data persists via Convex when authenticated and localStorage when anonymous.

---

## Architecture

### Approach: Template-Declared Page Registry

Each template exports a `pages: PageDefinition[]` array. `RuntimeShell` reads this array and renders a bottom tab bar when `pages.length > 1`. Templates own their page set — the shell is a router, not a page author.

This replaces the current sidebar model. Sidebar controls (sounds, difficulty, progress) move into the Settings page.

---

## Section 1: Page Registry Contract

```ts
export interface PageDefinition<TConfig = unknown> {
  id: string;                          // "main" | "settings" | "history" | "word-bank" | etc.
  label: string;                       // shown in tab bar
  icon: LucideIcon;
  audience: "slp" | "child" | "both"; // filters visibility by mode
  component: ComponentType<PageProps<TConfig>>;
}

export interface PageProps<TConfig> extends RuntimeProps<TConfig> {
  data: TemplateDataStore;
}
```

**Rules:**
- `pages[0].id` must always be `"main"` — enforced by the contract test
- Pages with `audience: "slp"` are hidden when `mode === "published"` (family using a share link sees only the board, not History or Settings)
- `audience: "child"` and `audience: "both"` pages are always shown in both modes
- In v1, only `audience: "slp"` pages are used beyond `main`; child-facing pages are out of scope

`TemplateRegistration` in `registry.ts` gains:
```ts
pages: PageDefinition[];
```

---

## Section 2: `TemplateDataStore` (Persistence)

```ts
export interface TemplateDataStore {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  history: {
    events: ToolEvent[];
    sessionCount: number;
    lastUsedAt: number | null;
  };
  isLoading: boolean;
}
```

**Routing logic in `useTemplateData(appInstanceId, mode)`:**

| Condition | Backend |
|---|---|
| `mode === "preview"` + authenticated | Convex (`app_instance_data` + `tool_events`) |
| `mode === "published"` + no auth | localStorage keyed by `appInstanceId` |
| `mode === "published"` + authenticated | Convex (family signed in) |

**Key namespace convention:** Templates prefix their keys with their template id (e.g. `"aac:buttons"`, `"token:streaks"`) to avoid collisions.

---

## Section 3: `RuntimeShell` Navigation

### Layout

```
┌─────────────────────────────────────┐
│ LIVE PREVIEW  [Title]             ✕ │  ← existing header (unchanged)
├─────────────────────────────────────┤
│  🟢 Board  │  ⚙ Settings  │  📊 History │  ← tab bar (new, audience-filtered)
├─────────────────────────────────────┤
│                                     │
│        [current page component]     │
│                                     │
└─────────────────────────────────────┘
```

### Changes to `runtime-shell.tsx`
- Remove the `lg:grid-cols-[280px_minmax(0,1fr)]` sidebar layout
- Add `useState<string>("main")` for active tab
- Render tab bar below header when `pages.length > 1`, filtering by audience
- Render `CurrentPage.component` with `RuntimeProps + data`
- Tab state is ephemeral — resets to `"main"` on every open (correct for therapy tools)

### Sidebar removal
`AppShellConfig` flags (`enableSounds`, `enableDifficulty`, `enableProgress`) remain in the type for backwards compatibility but no longer drive a sidebar. They signal which controls the Settings page should render.

---

## Section 4: Standard Pages Per Template

### `main` page
Current `Runtime` component promoted to a page. Full-width now that sidebar is gone.

### `settings` page (audience: "slp")
Renders the existing `Editor` component in a scrollable panel. `EditorProps.onChange` writes to `data.set("config", updatedConfig)`. The main page reads config from `data.get("config", defaultConfig)` — falling back to the Convex-stored `configJson` on first load.

**This is Editor reused, not duplicated.**

### `history` page (audience: "slp")
Generic `<HistoryPage />` base component shared by all templates. Displays:
- Total sessions, last used date
- Event timeline from `tool_events`
- Template-specific summary via an optional export:

```ts
// Each template can export this — optional
export function historyStats(events: ToolEvent[]): HistoryStat[] { ... }
```

Template-specific stat examples:
- **AAC Board:** most-tapped words ranked by frequency
- **Token Board:** tokens earned per session, current streak
- **Matching Game:** accuracy rate per pair
- **Visual Schedule / First-Then:** generic (session count + timeline only)

### Template-specific extra pages

| Template | Extra page | id | audience |
|---|---|---|---|
| `aac_board` | Word Bank — manage vocabulary by Fitzgerald category | `word-bank` | `slp` |
| All others | None in v1 | — | — |

**AAC Word Bank page** (`word-bank-page.tsx`):
- Grouped by color category (verb/pronoun/noun/descriptor/social/core)
- Add/remove/rename buttons
- Persisted via `data.set("aac:buttons", [...])`
- Changes reflect immediately on the Main page

---

## Section 5: Convex Schema & Functions

### New table (`convex/schema.ts`)

```ts
app_instance_data: defineTable({
  appInstanceId: v.id("app_instances"),
  key: v.string(),
  valueJson: v.string(),
  updatedAt: v.number(),
})
  .index("by_appInstanceId", ["appInstanceId"])
  .index("by_appInstanceId_key", ["appInstanceId", "key"]),
```

### New file (`convex/app_instance_data.ts`)

- `getAll` — query, returns all entries for an appInstanceId
- `upsert` — mutation, set or update a key's value
- `remove` — mutation, delete a key

---

## File Map

| Action | Path |
|---|---|
| Modify | `convex/schema.ts` — add `app_instance_data` table |
| Create | `convex/app_instance_data.ts` — getAll, upsert, remove |
| Modify | `src/features/tools/lib/registry.ts` — add `pages: PageDefinition[]` to `TemplateRegistration` |
| Modify | `src/features/tools/lib/runtime/runtime-shell.tsx` — tab bar, audience filter, sidebar removal |
| Create | `src/features/tools/lib/runtime/use-template-data.ts` — Convex/localStorage abstraction |
| Create | `src/features/tools/lib/runtime/history-page.tsx` — generic SLP history view |
| Modify | `src/features/tools/lib/templates/aac-board/runtime.tsx` → promoted to `main-page.tsx` |
| Create | `src/features/tools/lib/templates/aac-board/settings-page.tsx` |
| Create | `src/features/tools/lib/templates/aac-board/history-page.tsx` (calls historyStats) |
| Create | `src/features/tools/lib/templates/aac-board/word-bank-page.tsx` |
| Modify | `src/features/tools/lib/templates/first-then-board/` — add 2 standard pages |
| Modify | `src/features/tools/lib/templates/token-board/` — add 2 standard pages |
| Modify | `src/features/tools/lib/templates/visual-schedule/` — add 2 standard pages |
| Modify | `src/features/tools/lib/templates/matching-game/` — add 2 standard pages |
| Modify | `src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx` — assert pages[0].id === "main" |
| Create | `src/features/tools/lib/runtime/__tests__/use-template-data.test.ts` |

---

## Testing Strategy

- **Contract test:** all `TemplateRegistration` entries must have `pages[0].id === "main"` — extends existing `template-runtime-contract.test.tsx`
- **`useTemplateData` unit tests:** mock Convex + localStorage, assert correct backend chosen per mode/auth state
- **`historyStats` unit tests:** pure function per template, easy to cover with fixture events
- **Existing Editor and Runtime tests:** unaffected — they don't know about pages

---

## Out of Scope (v1)

- Template-specific pages beyond AAC Word Bank
- Family-facing "your progress" celebration screens (future)
- Offline sync (localStorage → Convex when reconnected)
- Page-level deep linking via URL
