# Full-Stack Template Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-page navigation (Main / Settings / History / template-specific extras), hybrid Convex/localStorage persistence, and a generic SLP history view to every therapy tool template.

**Architecture:** Each `TemplateRegistration` declares a `pages: PageDefinition[]` array. `RuntimeShell` reads this array and renders a bottom tab bar when pages exist. A `useTemplateData` hook abstracts over Convex (authenticated) and localStorage (anonymous published). Settings pages reuse existing Editor components. Existing `Runtime` components are wrapped in thin `main-page.tsx` wrappers that read config from the data store — no changes to existing runtime test mocks.

**Tech Stack:** Convex (queries/mutations), React, TypeScript, Vitest, Tailwind v4, lucide-react, date-fns

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `src/features/tools/lib/runtime/page-types.ts` | `TemplateDataStore`, `ToolEvent`, `HistoryStat` types |
| Modify | `src/features/tools/lib/registry.ts` | Add `PageDefinition`, `PageProps`, `pages` field, `appInstanceId` to `RuntimeProps` |
| Modify | `convex/schema.ts` | Add `app_instance_data` table |
| Create | `convex/app_instance_data.ts` | `getAll`, `upsert`, `remove`, `getEvents` |
| Create | `src/features/tools/lib/runtime/use-template-data.ts` | Convex/localStorage abstraction hook |
| Create | `src/features/tools/lib/runtime/__tests__/use-template-data.test.ts` | Hook unit tests |
| Create | `src/features/tools/lib/runtime/history-page.tsx` | Generic SLP history view component |
| Modify | `src/features/tools/lib/runtime/runtime-shell.tsx` | Tab bar, remove sidebar, support `pages` prop |
| Modify | `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx` | Update for new API |
| Modify | `src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx` | Assert pages contract |
| Create | `src/features/tools/lib/templates/aac-board/main-page.tsx` | Wraps AACBoardRuntime, reads config from data store |
| Create | `src/features/tools/lib/templates/aac-board/settings-page.tsx` | Renders AACBoardEditor via data store |
| Create | `src/features/tools/lib/templates/aac-board/history-stats.ts` | Pure: most-tapped words by frequency |
| Create | `src/features/tools/lib/templates/aac-board/__tests__/history-stats.test.ts` | Unit tests |
| Create | `src/features/tools/lib/templates/aac-board/history-page.tsx` | Calls generic HistoryPage with historyStats |
| Create | `src/features/tools/lib/templates/aac-board/word-bank-page.tsx` | Fitzgerald-grouped vocabulary editor |
| Create | `src/features/tools/lib/templates/token-board/main-page.tsx` | Wraps TokenBoardRuntime |
| Create | `src/features/tools/lib/templates/token-board/settings-page.tsx` | Renders TokenBoardEditor |
| Create | `src/features/tools/lib/templates/token-board/history-stats.ts` | Tokens earned per session, streak |
| Create | `src/features/tools/lib/templates/token-board/__tests__/history-stats.test.ts` | Unit tests |
| Create | `src/features/tools/lib/templates/token-board/history-page.tsx` | Calls generic HistoryPage |
| Create | `src/features/tools/lib/templates/visual-schedule/main-page.tsx` | Wraps VisualScheduleRuntime |
| Create | `src/features/tools/lib/templates/visual-schedule/settings-page.tsx` | Renders VisualScheduleEditor |
| Create | `src/features/tools/lib/templates/visual-schedule/history-page.tsx` | Generic history (no custom stats) |
| Create | `src/features/tools/lib/templates/first-then-board/main-page.tsx` | Wraps FirstThenBoardRuntime |
| Create | `src/features/tools/lib/templates/first-then-board/settings-page.tsx` | Renders FirstThenBoardEditor |
| Create | `src/features/tools/lib/templates/first-then-board/history-page.tsx` | Generic history |
| Create | `src/features/tools/lib/templates/matching-game/main-page.tsx` | Wraps MatchingGameRuntime |
| Create | `src/features/tools/lib/templates/matching-game/settings-page.tsx` | Renders MatchingGameEditor |
| Create | `src/features/tools/lib/templates/matching-game/history-stats.ts` | Accuracy rate per pair |
| Create | `src/features/tools/lib/templates/matching-game/__tests__/history-stats.test.ts` | Unit tests |
| Create | `src/features/tools/lib/templates/matching-game/history-page.tsx` | Calls generic HistoryPage |
| Modify | `src/features/tools/components/runtime/tool-runtime-page.tsx` | Use pages, accept appInstanceId |
| Modify | `src/app/apps/[shareToken]/page.tsx` | Pass appInstanceId to ToolRuntimePage |

---

### Task 1: Type definitions

**Files:**
- Create: `src/features/tools/lib/runtime/page-types.ts`
- Modify: `src/features/tools/lib/registry.ts`

- [ ] **Step 1: Create page-types.ts**

```typescript
// src/features/tools/lib/runtime/page-types.ts

export interface ToolEvent {
  _id: string;
  _creationTime: number;
  appInstanceId: string;
  eventType: string;
  eventPayloadJson?: string;
  sessionId?: string;
  eventSource?: "child" | "slp";
}

export interface HistoryStat {
  label: string;
  value: string | number;
}

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

- [ ] **Step 2: Add `PageDefinition`, `PageProps` to registry.ts and extend `RuntimeProps`**

Open `src/features/tools/lib/registry.ts`. Add the following imports at the top:

```typescript
import type { LucideIcon } from "lucide-react";
import type { TemplateDataStore } from "./runtime/page-types";
```

Add `appInstanceId?: string` to `RuntimeProps`:

```typescript
export interface RuntimeProps<TConfig = unknown> {
  config: TConfig;
  appInstanceId?: string;           // NEW — optional to avoid breaking existing tests
  mode: "preview" | "published";
  onEvent: (type: string, payloadJson?: string) => void;
  voice: {
    speak: (args: { text: string; voice?: string }) => Promise<void>;
    stop: () => void;
    status: "idle" | "loading" | "ready" | "error";
  };
}
```

Add the new `PageDefinition`, `PageProps` interfaces after `EditorProps`:

```typescript
export interface PageDefinition<TConfig = unknown> {
  id: string;
  label: string;
  icon: LucideIcon;
  audience: "slp" | "child" | "both";
  component: ComponentType<PageProps<TConfig>>;
}

export interface PageProps<TConfig = unknown> extends RuntimeProps<TConfig> {
  data: TemplateDataStore;
}
```

Add `pages: PageDefinition[]` to `TemplateRegistration`:

```typescript
export interface TemplateRegistration {
  meta: TemplateMeta;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Editor: ComponentType<EditorProps<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Runtime: ComponentType<RuntimeProps<any>>;
  defaultConfig: unknown;
  parseConfig: (json: string) => unknown;
  shell: AppShellConfig;
  aiConfigSchema: z.ZodTypeAny;
  schemaPrompt: string;
  pages: PageDefinition[];          // NEW
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors (existing registrations will error until Tasks 7–11 add `pages`; temporarily add `pages: []` to each entry in registry.ts to unblock compilation, then remove each `pages: []` placeholder as tasks complete).

Add `pages: []` to all 5 entries in `templateRegistry` now:

```typescript
// aac_board entry — add this line:
pages: [],

// first_then_board entry — add this line:
pages: [],

// token_board entry — add this line:
pages: [],

// visual_schedule entry — add this line:
pages: [],

// matching_game entry — add this line:
pages: [],
```

Run again:
```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/lib/runtime/page-types.ts src/features/tools/lib/registry.ts
git commit -m "feat: add PageDefinition, PageProps, TemplateDataStore types and pages field"
```

---

### Task 2: Convex schema + data functions

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/app_instance_data.ts`

- [ ] **Step 1: Add `app_instance_data` table to schema.ts**

Open `convex/schema.ts`. After the `published_app_versions` table definition (around line 272), add:

```typescript
  app_instance_data: defineTable({
    appInstanceId: v.id("app_instances"),
    key: v.string(),
    valueJson: v.string(),
    updatedAt: v.number(),
  })
    .index("by_appInstanceId", ["appInstanceId"])
    .index("by_appInstanceId_key", ["appInstanceId", "key"]),
```

- [ ] **Step 2: Create convex/app_instance_data.ts**

```typescript
// convex/app_instance_data.ts
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

/** Returns all key-value pairs for an app instance. */
export const getAll = query({
  args: { appInstanceId: v.id("app_instances") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("app_instance_data")
      .withIndex("by_appInstanceId", (q) =>
        q.eq("appInstanceId", args.appInstanceId)
      )
      .collect();
  },
});

/** Sets or updates a key's value for an app instance. */
export const upsert = mutation({
  args: {
    appInstanceId: v.id("app_instances"),
    key: v.string(),
    valueJson: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("app_instance_data")
      .withIndex("by_appInstanceId_key", (q) =>
        q.eq("appInstanceId", args.appInstanceId).eq("key", args.key)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        valueJson: args.valueJson,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("app_instance_data", {
        appInstanceId: args.appInstanceId,
        key: args.key,
        valueJson: args.valueJson,
        updatedAt: Date.now(),
      });
    }
  },
});

/** Removes a key from an app instance's data store. */
export const remove = mutation({
  args: {
    appInstanceId: v.id("app_instances"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("app_instance_data")
      .withIndex("by_appInstanceId_key", (q) =>
        q.eq("appInstanceId", args.appInstanceId).eq("key", args.key)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/** Returns all tool events for an app instance, ordered by creation time. */
export const getEvents = query({
  args: { appInstanceId: v.id("app_instances") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tool_events")
      .withIndex("by_appInstanceId", (q) =>
        q.eq("appInstanceId", args.appInstanceId)
      )
      .collect();
  },
});
```

- [ ] **Step 3: Verify Convex schema compiles**

```bash
npx convex dev --once
```

Expected: `✓ Convex functions ready` with no errors. If schema errors appear, check the `app_instance_data` table definition — it must be inside the `export default defineSchema({})` call.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/app_instance_data.ts
git commit -m "feat: add app_instance_data table and Convex kv store functions"
```

---

### Task 3: `useTemplateData` hook (TDD)

**Files:**
- Create: `src/features/tools/lib/runtime/__tests__/use-template-data.test.ts`
- Create: `src/features/tools/lib/runtime/use-template-data.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/features/tools/lib/runtime/__tests__/use-template-data.test.ts
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Convex hooks before imports
vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("@convex/_generated/api", () => ({
  api: {
    app_instance_data: {
      getAll: "app_instance_data:getAll",
      getEvents: "app_instance_data:getEvents",
      upsert: "app_instance_data:upsert",
    },
  },
}));

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useTemplateData } from "../use-template-data";

const mockUseConvexAuth = vi.mocked(useConvexAuth);
const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);
const mockUpsert = vi.fn();

beforeEach(() => {
  mockUseMutation.mockReturnValue(mockUpsert);
  localStorage.clear();
});

describe("useTemplateData — preview mode (Convex path)", () => {
  beforeEach(() => {
    mockUseConvexAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseQuery.mockReturnValue(undefined); // loading
  });

  it("returns isLoading: true while Convex data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    expect(result.current.isLoading).toBe(true);
  });

  it("returns isLoading: false when Convex data resolves", () => {
    mockUseQuery.mockImplementation((query) => {
      if (String(query).includes("getAll")) return [];
      if (String(query).includes("getEvents")) return [];
      return undefined;
    });
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("get() returns fallback when key not in Convex data", () => {
    mockUseQuery.mockImplementation((query) => {
      if (String(query).includes("getAll")) return [];
      if (String(query).includes("getEvents")) return [];
      return undefined;
    });
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    expect(result.current.get("missing", "default")).toBe("default");
  });

  it("get() returns parsed value from Convex data when key exists", () => {
    mockUseQuery.mockImplementation((query) => {
      if (String(query).includes("getAll"))
        return [{ key: "myKey", valueJson: '"stored-value"', _id: "1", _creationTime: 0 }];
      if (String(query).includes("getEvents")) return [];
      return undefined;
    });
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    expect(result.current.get("myKey", "default")).toBe("stored-value");
  });

  it("set() calls the upsert mutation", () => {
    mockUseQuery.mockImplementation((query) => {
      if (String(query).includes("getAll")) return [];
      if (String(query).includes("getEvents")) return [];
      return undefined;
    });
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    result.current.set("myKey", { value: 42 });
    expect(mockUpsert).toHaveBeenCalledWith({
      appInstanceId: "app123",
      key: "myKey",
      valueJson: JSON.stringify({ value: 42 }),
    });
  });

  it("history.sessionCount counts app_opened events", () => {
    mockUseQuery.mockImplementation((query) => {
      if (String(query).includes("getAll")) return [];
      if (String(query).includes("getEvents"))
        return [
          { eventType: "app_opened", _id: "1", _creationTime: 1000, appInstanceId: "app123" },
          { eventType: "item_tapped", _id: "2", _creationTime: 2000, appInstanceId: "app123" },
          { eventType: "app_opened", _id: "3", _creationTime: 3000, appInstanceId: "app123" },
        ];
      return undefined;
    });
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    expect(result.current.history.sessionCount).toBe(2);
  });

  it("history.lastUsedAt is the max _creationTime", () => {
    mockUseQuery.mockImplementation((query) => {
      if (String(query).includes("getAll")) return [];
      if (String(query).includes("getEvents"))
        return [
          { eventType: "app_opened", _id: "1", _creationTime: 1000, appInstanceId: "app123" },
          { eventType: "item_tapped", _id: "2", _creationTime: 5000, appInstanceId: "app123" },
        ];
      return undefined;
    });
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    expect(result.current.history.lastUsedAt).toBe(5000);
  });
});

describe("useTemplateData — published + unauthenticated (localStorage path)", () => {
  beforeEach(() => {
    mockUseConvexAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });
    // When not authenticated, queries are skipped — useQuery returns undefined
    mockUseQuery.mockReturnValue(undefined);
  });

  it("isLoading is false (localStorage is sync)", () => {
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "published")
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("get() returns fallback when localStorage key missing", () => {
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "published")
    );
    expect(result.current.get("nope", 99)).toBe(99);
  });

  it("set() writes to localStorage and get() reads it back", () => {
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "published")
    );
    result.current.set("greeting", "hello");
    expect(result.current.get("greeting", "")).toBe("hello");
  });

  it("history.events is empty for anonymous users", () => {
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "published")
    );
    expect(result.current.history.events).toEqual([]);
    expect(result.current.history.sessionCount).toBe(0);
    expect(result.current.history.lastUsedAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/features/tools/lib/runtime/__tests__/use-template-data.test.ts
```

Expected: All tests fail with `Cannot find module '../use-template-data'`.

- [ ] **Step 3: Implement use-template-data.ts**

```typescript
// src/features/tools/lib/runtime/use-template-data.ts
"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";

import type { TemplateDataStore, ToolEvent } from "./page-types";

export function useTemplateData(
  appInstanceId: Id<"app_instances"> | undefined,
  mode: "preview" | "published"
): TemplateDataStore {
  const { isAuthenticated } = useConvexAuth();
  const useConvexBackend = Boolean(appInstanceId) && (mode === "preview" || isAuthenticated);

  const convexData = useQuery(
    api.app_instance_data.getAll,
    useConvexBackend && appInstanceId
      ? { appInstanceId }
      : "skip"
  );

  const convexEvents = useQuery(
    api.app_instance_data.getEvents,
    useConvexBackend && appInstanceId
      ? { appInstanceId }
      : "skip"
  );

  const upsert = useMutation(api.app_instance_data.upsert);

  // --- Convex get/set ---
  const convexGet = useCallback(
    <T>(key: string, fallback: T): T => {
      if (!convexData) return fallback;
      const entry = convexData.find((e) => e.key === key);
      if (!entry) return fallback;
      try {
        return JSON.parse(entry.valueJson) as T;
      } catch {
        return fallback;
      }
    },
    [convexData]
  );

  const convexSet = useCallback(
    <T>(key: string, value: T) => {
      if (!appInstanceId) return;
      void upsert({
        appInstanceId,
        key,
        valueJson: JSON.stringify(value),
      });
    },
    [upsert, appInstanceId]
  );

  // --- localStorage get/set ---
  const lsPrefix = `tool:${appInstanceId ?? "anon"}`;

  const lsGet = useCallback(
    <T>(key: string, fallback: T): T => {
      try {
        const raw = localStorage.getItem(`${lsPrefix}:${key}`);
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    [lsPrefix]
  );

  const lsSet = useCallback(
    <T>(key: string, value: T) => {
      try {
        localStorage.setItem(`${lsPrefix}:${key}`, JSON.stringify(value));
      } catch {
        // Storage quota exceeded or private mode — silently ignore
      }
    },
    [lsPrefix]
  );

  // --- history ---
  const events = useMemo((): ToolEvent[] => {
    if (useConvexBackend) {
      return (convexEvents ?? []) as unknown as ToolEvent[];
    }
    return [];
  }, [useConvexBackend, convexEvents]);

  const sessionCount = useMemo(
    () => events.filter((e) => e.eventType === "app_opened").length,
    [events]
  );

  const lastUsedAt = useMemo(() => {
    if (events.length === 0) return null;
    return Math.max(...events.map((e) => e._creationTime));
  }, [events]);

  const isLoading = useConvexBackend
    ? convexData === undefined || convexEvents === undefined
    : false;

  return useMemo<TemplateDataStore>(
    () => ({
      get: useConvexBackend ? convexGet : lsGet,
      set: useConvexBackend ? convexSet : lsSet,
      history: { events, sessionCount, lastUsedAt },
      isLoading,
    }),
    [useConvexBackend, convexGet, lsGet, convexSet, lsSet, events, sessionCount, lastUsedAt, isLoading]
  );
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npx vitest run src/features/tools/lib/runtime/__tests__/use-template-data.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/lib/runtime/use-template-data.ts \
        src/features/tools/lib/runtime/__tests__/use-template-data.test.ts
git commit -m "feat: add useTemplateData hook with Convex/localStorage hybrid persistence"
```

---

### Task 4: Generic `HistoryPage` component

**Files:**
- Create: `src/features/tools/lib/runtime/history-page.tsx`

- [ ] **Step 1: Create history-page.tsx**

```tsx
// src/features/tools/lib/runtime/history-page.tsx
"use client";

import { format } from "date-fns";
import { Activity, Calendar, Clock } from "lucide-react";

import type { HistoryStat, TemplateDataStore, ToolEvent } from "./page-types";

interface HistoryPageProps {
  data: TemplateDataStore;
  historyStats?: (events: ToolEvent[]) => HistoryStat[];
}

export function HistoryPage({ data, historyStats }: HistoryPageProps) {
  const { events, sessionCount, lastUsedAt } = data.history;
  const templateStats = historyStats ? historyStats(events) : [];

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Sessions"
          value={sessionCount}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Last used"
          value={lastUsedAt ? format(new Date(lastUsedAt), "MMM d") : "Never"}
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      {/* Template-specific stats */}
      {templateStats.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-headline text-sm font-semibold text-foreground">
            Activity Summary
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {templateStats.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </section>
      )}

      {/* Recent event timeline — last 20 */}
      <section className="flex flex-col gap-2">
        <h3 className="font-headline text-sm font-semibold text-foreground">
          Recent Events
        </h3>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No events recorded yet. Use the tool to start tracking activity.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {[...events]
              .sort((a, b) => b._creationTime - a._creationTime)
              .slice(0, 20)
              .map((e) => (
                <div
                  key={e._id}
                  className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs"
                >
                  <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {format(new Date(e._creationTime), "MMM d h:mm a")}
                  </span>
                  <span className="font-medium text-foreground">
                    {e.eventType.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-headline text-2xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/lib/runtime/history-page.tsx
git commit -m "feat: add generic SLP HistoryPage component"
```

---

### Task 5: `RuntimeShell` tab bar + sidebar removal

**Files:**
- Modify: `src/features/tools/lib/runtime/runtime-shell.tsx`
- Modify: `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`

- [ ] **Step 1: Read the existing runtime-shell test**

Open `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`. The existing test renders `RuntimeShell` with `children`. This test must continue to pass.

- [ ] **Step 2: Rewrite runtime-shell.tsx**

Replace the entire file:

```tsx
// src/features/tools/lib/runtime/runtime-shell.tsx
"use client";

import { CircleHelp, X } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import type { AppShellConfig } from "./app-shell-types";
import type { PageDefinition, RuntimeProps } from "../registry";
import type { TemplateDataStore } from "./page-types";
import { ShellStateContext } from "./shell-state-context";
import { useAppShellState } from "./use-app-shell-state";

// --- Children-based props (builder preview, contract tests) ---
interface ChildrenShellProps {
  mode: "preview" | "published";
  shell: AppShellConfig;
  title: string;
  onExit?: () => void;
  children: React.ReactNode;
  pages?: never;
  runtimeProps?: never;
  data?: never;
}

// --- Pages-based props (live runtime with tabs) ---
interface PagesShellProps {
  mode: "preview" | "published";
  shell: AppShellConfig;
  title: string;
  onExit?: () => void;
  children?: never;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pages: PageDefinition<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runtimeProps: RuntimeProps<any>;
  data: TemplateDataStore;
}

type RuntimeShellProps = ChildrenShellProps | PagesShellProps;

export function RuntimeShell({
  mode,
  shell,
  title,
  onExit,
  children,
  pages,
  runtimeProps,
  data,
}: RuntimeShellProps) {
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [activePage, setActivePage] = useState("main");

  const state = useAppShellState({
    storageKey: `${mode}:${title}`,
    shell,
  });

  const shellContextValue = useMemo(
    () => ({ difficulty: state.difficulty, soundsEnabled: state.soundsEnabled }),
    [state.difficulty, state.soundsEnabled]
  );

  // Audience filter: hide slp-only pages in published mode
  const visiblePages = useMemo(
    () =>
      pages?.filter((p) =>
        p.audience === "slp" ? mode !== "published" : true
      ) ?? [],
    [pages, mode]
  );

  const currentPage = visiblePages.find((p) => p.id === activePage) ?? visiblePages[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header — unchanged */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {mode === "preview" ? "Live preview" : "Published app"}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {shell.enableInstructions && shell.instructionsText ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInstructionsOpen(true)}
              aria-label="Open instructions"
            >
              <CircleHelp className="h-4 w-4" />
              <span className="sr-only">Instructions</span>
            </Button>
          ) : null}
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
      </header>

      {/* Tab bar — only shown when pages provided and more than 1 visible */}
      {visiblePages.length > 1 && (
        <nav className="sticky top-[57px] z-10 flex border-b border-border bg-background/95 backdrop-blur">
          {visiblePages.map((page) => {
            const Icon = page.icon;
            const isActive = page.id === (currentPage?.id ?? "main");
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => setActivePage(page.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-selected={isActive}
                role="tab"
              >
                <Icon className="h-3.5 w-3.5" />
                {page.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* Content */}
      <ShellStateContext.Provider value={shellContextValue}>
        {/* Children-based (builder preview / contract tests) */}
        {children !== undefined && (
          <div className="px-4 pb-6 pt-4">{children}</div>
        )}

        {/* Pages-based (live runtime) */}
        {currentPage && runtimeProps && data && (
          <div className="pb-6">
            <currentPage.component {...runtimeProps} data={data} />
          </div>
        )}
      </ShellStateContext.Provider>

      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>How to use this app</DialogTitle>
            <DialogDescription className="sr-only">
              Instructions for the current app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            {shell.instructionsText
              ?.split("\n")
              .filter((line) => line.trim().length > 0)
              .map((line) => (
                <p key={line}>{line}</p>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Run existing runtime-shell tests**

```bash
npx vitest run src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx
```

Expected: All tests pass (children-based API is unchanged).

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/lib/runtime/runtime-shell.tsx
git commit -m "feat: add tab bar to RuntimeShell, remove sidebar"
```

---

### Task 6: Update contract test with pages assertion

**Files:**
- Modify: `src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`

- [ ] **Step 1: Add failing pages contract test**

Open `src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`. Add this test at the end:

```typescript
  it("each template registration has pages with pages[0].id === 'main'", () => {
    Object.entries(templateRegistry).forEach(([key, registration]) => {
      expect(registration.pages, `${key} missing pages`).toBeDefined();
      expect(
        Array.isArray(registration.pages),
        `${key} pages is not an array`
      ).toBe(true);
      expect(
        registration.pages.length,
        `${key} has no pages`
      ).toBeGreaterThan(0);
      expect(
        registration.pages[0].id,
        `${key} pages[0].id must be "main"`
      ).toBe("main");
    });
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx
```

Expected: New test fails with `each template registration has pages[0].id === 'main'` because all registrations have `pages: []`.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx
git commit -m "test: add pages contract assertion (red — passes after Tasks 7-11)"
```

---

### Task 7: AAC Board pages

**Files:**
- Create: `src/features/tools/lib/templates/aac-board/main-page.tsx`
- Create: `src/features/tools/lib/templates/aac-board/settings-page.tsx`
- Create: `src/features/tools/lib/templates/aac-board/history-stats.ts`
- Create: `src/features/tools/lib/templates/aac-board/__tests__/history-stats.test.ts`
- Create: `src/features/tools/lib/templates/aac-board/history-page.tsx`
- Create: `src/features/tools/lib/templates/aac-board/word-bank-page.tsx`
- Modify: `src/features/tools/lib/registry.ts` (AAC Board entry)

- [ ] **Step 1: Write failing history-stats tests**

```typescript
// src/features/tools/lib/templates/aac-board/__tests__/history-stats.test.ts
import { describe, expect, it } from "vitest";

import { aacHistoryStats } from "../history-stats";
import type { ToolEvent } from "@/features/tools/lib/runtime/page-types";

function makeEvent(label: string, buttonId = "b1"): ToolEvent {
  return {
    _id: Math.random().toString(),
    _creationTime: Date.now(),
    appInstanceId: "app1",
    eventType: "item_tapped",
    eventPayloadJson: JSON.stringify({ buttonId, label }),
  };
}

describe("aacHistoryStats", () => {
  it("returns empty array when no item_tapped events", () => {
    const events: ToolEvent[] = [
      { _id: "1", _creationTime: 1, appInstanceId: "a", eventType: "app_opened" },
    ];
    expect(aacHistoryStats(events)).toEqual([]);
  });

  it("returns most-tapped word as first stat", () => {
    const events = [
      makeEvent("More", "b1"),
      makeEvent("More", "b1"),
      makeEvent("More", "b1"),
      makeEvent("Help", "b2"),
      makeEvent("Help", "b2"),
    ];
    const stats = aacHistoryStats(events);
    expect(stats[0].label).toBe("More");
    expect(stats[0].value).toBe(3);
  });

  it("returns top 5 words maximum", () => {
    const events = [
      makeEvent("A", "1"), makeEvent("A", "1"),
      makeEvent("B", "2"), makeEvent("B", "2"),
      makeEvent("C", "3"), makeEvent("C", "3"),
      makeEvent("D", "4"), makeEvent("D", "4"),
      makeEvent("E", "5"), makeEvent("E", "5"),
      makeEvent("F", "6"),
    ];
    const stats = aacHistoryStats(events);
    expect(stats.length).toBeLessThanOrEqual(5);
  });

  it("sorts by frequency descending", () => {
    const events = [
      makeEvent("Rare", "r"),
      makeEvent("Common", "c"),
      makeEvent("Common", "c"),
      makeEvent("Common", "c"),
    ];
    const stats = aacHistoryStats(events);
    expect(stats[0].label).toBe("Common");
    expect(Number(stats[0].value)).toBeGreaterThan(Number(stats[1]?.value ?? 0));
  });

  it("ignores events with malformed payloadJson", () => {
    const events: ToolEvent[] = [
      {
        _id: "bad",
        _creationTime: 1,
        appInstanceId: "a",
        eventType: "item_tapped",
        eventPayloadJson: "not-json",
      },
    ];
    expect(() => aacHistoryStats(events)).not.toThrow();
    expect(aacHistoryStats(events)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/__tests__/history-stats.test.ts
```

Expected: All fail with `Cannot find module '../history-stats'`.

- [ ] **Step 3: Create history-stats.ts**

```typescript
// src/features/tools/lib/templates/aac-board/history-stats.ts
import type { HistoryStat, ToolEvent } from "@/features/tools/lib/runtime/page-types";

export function aacHistoryStats(events: ToolEvent[]): HistoryStat[] {
  const counts = new Map<string, number>();

  for (const e of events) {
    if (e.eventType !== "item_tapped") continue;
    try {
      const payload = JSON.parse(e.eventPayloadJson ?? "{}") as { label?: string };
      const label = payload.label;
      if (typeof label === "string" && label.length > 0) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    } catch {
      // malformed payload — skip
    }
  }

  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/__tests__/history-stats.test.ts
```

Expected: All pass.

- [ ] **Step 5: Create main-page.tsx**

```tsx
// src/features/tools/lib/templates/aac-board/main-page.tsx
"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { AACBoardRuntime } from "./runtime";
import type { AACBoardConfig } from "./schema";
import { AACBoardConfigSchema } from "./schema";

export function AACBoardMainPage({
  data,
  config: initialConfig,
  ...rest
}: PageProps<AACBoardConfig>) {
  // Read settings-page overrides; fall back to original config from Convex
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = AACBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return <AACBoardRuntime {...rest} config={config} />;
}
```

- [ ] **Step 6: Create settings-page.tsx**

```tsx
// src/features/tools/lib/templates/aac-board/settings-page.tsx
"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { AACBoardEditor } from "./editor";
import type { AACBoardConfig } from "./schema";
import { AACBoardConfigSchema } from "./schema";

export function AACBoardSettingsPage({
  config: initialConfig,
  data,
}: PageProps<AACBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = AACBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return (
    <div className="overflow-y-auto">
      <AACBoardEditor
        config={config}
        onChange={(updated) => data.set("config", updated)}
      />
    </div>
  );
}
```

- [ ] **Step 7: Create history-page.tsx**

```tsx
// src/features/tools/lib/templates/aac-board/history-page.tsx
"use client";

import { HistoryPage } from "@/features/tools/lib/runtime/history-page";
import type { PageProps } from "@/features/tools/lib/registry";

import { aacHistoryStats } from "./history-stats";
import type { AACBoardConfig } from "./schema";

export function AACBoardHistoryPage({ data }: PageProps<AACBoardConfig>) {
  return <HistoryPage data={data} historyStats={aacHistoryStats} />;
}
```

- [ ] **Step 8: Create word-bank-page.tsx**

```tsx
// src/features/tools/lib/templates/aac-board/word-bank-page.tsx
"use client";

import { nanoid } from "nanoid";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { PageProps } from "@/features/tools/lib/registry";

import type { AACBoardConfig, AACButton } from "./schema";
import { AACBoardConfigSchema, WORD_CATEGORIES } from "./schema";

const CATEGORY_COLORS: Record<string, string> = {
  verb:       "bg-[#22c55e] text-white",
  pronoun:    "bg-[#eab308] text-white",
  noun:       "bg-[#f97316] text-white",
  descriptor: "bg-[#3b82f6] text-white",
  social:     "bg-[#ec4899] text-white",
  core:       "bg-muted text-foreground",
};

const CATEGORY_LABELS: Record<string, string> = {
  verb:       "Verbs (green)",
  pronoun:    "Pronouns (yellow)",
  noun:       "Nouns (orange)",
  descriptor: "Descriptors (blue)",
  social:     "Social (pink)",
  core:       "Core words",
};

export function AACBoardWordBankPage({
  config: initialConfig,
  data,
}: PageProps<AACBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = AACBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  const buttons = config.buttons ?? [];

  const save = (updated: AACButton[]) =>
    data.set("config", { ...config, buttons: updated });

  const addButton = (category: AACButton["wordCategory"]) => {
    const newBtn: AACButton = {
      id: nanoid(),
      label: "New word",
      speakText: "New word",
      wordCategory: category,
    };
    save([...buttons, newBtn]);
  };

  const removeButton = (id: string) =>
    save(buttons.filter((b) => b.id !== id));

  const updateLabel = (id: string, label: string) =>
    save(buttons.map((b) => (b.id === id ? { ...b, label, speakText: label } : b)));

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-4">
      <p className="text-sm text-muted-foreground">
        Words are grouped by Fitzgerald key color. Changes apply immediately to the board.
      </p>

      {WORD_CATEGORIES.map((cat) => {
        const catButtons = buttons.filter((b) => b.wordCategory === cat);
        return (
          <section key={cat} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                {CATEGORY_LABELS[cat]}
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addButton(cat)}
              >
                + Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {catButtons.length === 0 && (
                <p className="text-xs text-muted-foreground">No words yet.</p>
              )}
              {catButtons.map((btn) => (
                <div key={btn.id} className="flex items-center gap-1">
                  <Badge className={CATEGORY_COLORS[cat]}>
                    <input
                      value={btn.label}
                      onChange={(e) => updateLabel(btn.id, e.target.value)}
                      className="w-20 bg-transparent text-xs outline-none"
                    />
                  </Badge>
                  <button
                    type="button"
                    onClick={() => removeButton(btn.id)}
                    aria-label={`Remove ${btn.label}`}
                    className="text-muted-foreground hover:text-destructive text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 9: Update AAC Board registry entry with pages**

In `src/features/tools/lib/registry.ts`, add the following imports at the top of the file:

```typescript
import { BarChart3, BookOpen, LayoutGrid, Settings2 } from "lucide-react";

import { AACBoardHistoryPage } from "./templates/aac-board/history-page";
import { AACBoardMainPage } from "./templates/aac-board/main-page";
import { AACBoardSettingsPage } from "./templates/aac-board/settings-page";
import { AACBoardWordBankPage } from "./templates/aac-board/word-bank-page";
```

Replace `pages: []` in the `aac_board` entry with:

```typescript
    pages: [
      { id: "main", label: "Board", icon: LayoutGrid, audience: "both", component: AACBoardMainPage },
      { id: "settings", label: "Settings", icon: Settings2, audience: "slp", component: AACBoardSettingsPage },
      { id: "history", label: "History", icon: BarChart3, audience: "slp", component: AACBoardHistoryPage },
      { id: "word-bank", label: "Word Bank", icon: BookOpen, audience: "slp", component: AACBoardWordBankPage },
    ],
```

- [ ] **Step 10: Run AAC-related tests**

```bash
npx vitest run src/features/tools/lib/templates/aac-board/
```

Expected: All pass.

- [ ] **Step 11: Commit**

```bash
git add src/features/tools/lib/templates/aac-board/ \
        src/features/tools/lib/registry.ts
git commit -m "feat: add AAC Board pages (main, settings, history, word-bank)"
```

---

### Task 8: Token Board pages

**Files:**
- Create: `src/features/tools/lib/templates/token-board/main-page.tsx`
- Create: `src/features/tools/lib/templates/token-board/settings-page.tsx`
- Create: `src/features/tools/lib/templates/token-board/history-stats.ts`
- Create: `src/features/tools/lib/templates/token-board/__tests__/history-stats.test.ts`
- Create: `src/features/tools/lib/templates/token-board/history-page.tsx`
- Modify: `src/features/tools/lib/registry.ts`

- [ ] **Step 1: Write failing history-stats tests**

```typescript
// src/features/tools/lib/templates/token-board/__tests__/history-stats.test.ts
import { describe, expect, it } from "vitest";

import { tokenHistoryStats } from "../history-stats";
import type { ToolEvent } from "@/features/tools/lib/runtime/page-types";

function makeTokenEvent(n: number): ToolEvent {
  return {
    _id: Math.random().toString(),
    _creationTime: Date.now(),
    appInstanceId: "app1",
    eventType: "token_added",
    eventPayloadJson: JSON.stringify({ tokenIndex: n - 1, earned: n }),
  };
}

function makeCompletedEvent(): ToolEvent {
  return {
    _id: Math.random().toString(),
    _creationTime: Date.now(),
    appInstanceId: "app1",
    eventType: "activity_completed",
    eventPayloadJson: JSON.stringify({ tokensEarned: 5 }),
  };
}

describe("tokenHistoryStats", () => {
  it("returns zero completions when no activity_completed events", () => {
    const stats = tokenHistoryStats([makeTokenEvent(1)]);
    const completionStat = stats.find((s) => s.label === "Completions");
    expect(Number(completionStat?.value ?? 0)).toBe(0);
  });

  it("counts activity_completed events as completions", () => {
    const events = [makeCompletedEvent(), makeCompletedEvent(), makeCompletedEvent()];
    const stats = tokenHistoryStats(events);
    const completionStat = stats.find((s) => s.label === "Completions");
    expect(Number(completionStat?.value)).toBe(3);
  });

  it("counts total tokens added", () => {
    const events = [makeTokenEvent(1), makeTokenEvent(2), makeTokenEvent(3)];
    const stats = tokenHistoryStats(events);
    const tokenStat = stats.find((s) => s.label === "Tokens Earned");
    expect(Number(tokenStat?.value)).toBe(3);
  });

  it("returns empty array when no relevant events", () => {
    const events: ToolEvent[] = [
      { _id: "1", _creationTime: 1, appInstanceId: "a", eventType: "app_opened" },
    ];
    const stats = tokenHistoryStats(events);
    // Should still return completions and tokens stats (just 0)
    expect(stats.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run src/features/tools/lib/templates/token-board/__tests__/history-stats.test.ts
```

Expected: All fail with `Cannot find module '../history-stats'`.

- [ ] **Step 3: Create history-stats.ts**

```typescript
// src/features/tools/lib/templates/token-board/history-stats.ts
import type { HistoryStat, ToolEvent } from "@/features/tools/lib/runtime/page-types";

export function tokenHistoryStats(events: ToolEvent[]): HistoryStat[] {
  const completions = events.filter((e) => e.eventType === "activity_completed").length;
  const tokensEarned = events.filter((e) => e.eventType === "token_added").length;

  return [
    { label: "Completions", value: completions },
    { label: "Tokens Earned", value: tokensEarned },
  ];
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/features/tools/lib/templates/token-board/__tests__/history-stats.test.ts
```

Expected: All pass.

- [ ] **Step 5: Create main-page.tsx**

```tsx
// src/features/tools/lib/templates/token-board/main-page.tsx
"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { TokenBoardRuntime } from "./runtime";
import type { TokenBoardConfig } from "./schema";
import { TokenBoardConfigSchema } from "./schema";

export function TokenBoardMainPage({
  data,
  config: initialConfig,
  ...rest
}: PageProps<TokenBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = TokenBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return <TokenBoardRuntime {...rest} config={config} />;
}
```

- [ ] **Step 6: Create settings-page.tsx**

```tsx
// src/features/tools/lib/templates/token-board/settings-page.tsx
"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { TokenBoardEditor } from "./editor";
import type { TokenBoardConfig } from "./schema";
import { TokenBoardConfigSchema } from "./schema";

export function TokenBoardSettingsPage({
  config: initialConfig,
  data,
}: PageProps<TokenBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = TokenBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return (
    <div className="overflow-y-auto">
      <TokenBoardEditor
        config={config}
        onChange={(updated) => data.set("config", updated)}
      />
    </div>
  );
}
```

- [ ] **Step 7: Create history-page.tsx**

```tsx
// src/features/tools/lib/templates/token-board/history-page.tsx
"use client";

import { HistoryPage } from "@/features/tools/lib/runtime/history-page";
import type { PageProps } from "@/features/tools/lib/registry";

import { tokenHistoryStats } from "./history-stats";
import type { TokenBoardConfig } from "./schema";

export function TokenBoardHistoryPage({ data }: PageProps<TokenBoardConfig>) {
  return <HistoryPage data={data} historyStats={tokenHistoryStats} />;
}
```

- [ ] **Step 8: Update Token Board registry entry**

Add imports to `registry.ts`:

```typescript
import { TokenBoardHistoryPage } from "./templates/token-board/history-page";
import { TokenBoardMainPage } from "./templates/token-board/main-page";
import { TokenBoardSettingsPage } from "./templates/token-board/settings-page";
```

Replace `pages: []` in the `token_board` entry:

```typescript
    pages: [
      { id: "main", label: "Board", icon: LayoutGrid, audience: "both", component: TokenBoardMainPage },
      { id: "settings", label: "Settings", icon: Settings2, audience: "slp", component: TokenBoardSettingsPage },
      { id: "history", label: "History", icon: BarChart3, audience: "slp", component: TokenBoardHistoryPage },
    ],
```

- [ ] **Step 9: Run Token Board tests**

```bash
npx vitest run src/features/tools/lib/templates/token-board/
```

Expected: All pass.

- [ ] **Step 10: Commit**

```bash
git add src/features/tools/lib/templates/token-board/ \
        src/features/tools/lib/registry.ts
git commit -m "feat: add Token Board pages (main, settings, history)"
```

---

### Task 9: Visual Schedule pages

**Files:**
- Create: `src/features/tools/lib/templates/visual-schedule/main-page.tsx`
- Create: `src/features/tools/lib/templates/visual-schedule/settings-page.tsx`
- Create: `src/features/tools/lib/templates/visual-schedule/history-page.tsx`
- Modify: `src/features/tools/lib/registry.ts`

- [ ] **Step 1: Create main-page.tsx**

```tsx
// src/features/tools/lib/templates/visual-schedule/main-page.tsx
"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { VisualScheduleRuntime } from "./runtime";
import type { VisualScheduleConfig } from "./schema";
import { VisualScheduleConfigSchema } from "./schema";

export function VisualScheduleMainPage({
  data,
  config: initialConfig,
  ...rest
}: PageProps<VisualScheduleConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = VisualScheduleConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return <VisualScheduleRuntime {...rest} config={config} />;
}
```

- [ ] **Step 2: Create settings-page.tsx**

```tsx
// src/features/tools/lib/templates/visual-schedule/settings-page.tsx
"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { VisualScheduleEditor } from "./editor";
import type { VisualScheduleConfig } from "./schema";
import { VisualScheduleConfigSchema } from "./schema";

export function VisualScheduleSettingsPage({
  config: initialConfig,
  data,
}: PageProps<VisualScheduleConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = VisualScheduleConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return (
    <div className="overflow-y-auto">
      <VisualScheduleEditor
        config={config}
        onChange={(updated) => data.set("config", updated)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create history-page.tsx**

```tsx
// src/features/tools/lib/templates/visual-schedule/history-page.tsx
"use client";

import { HistoryPage } from "@/features/tools/lib/runtime/history-page";
import type { PageProps } from "@/features/tools/lib/registry";

import type { VisualScheduleConfig } from "./schema";

export function VisualScheduleHistoryPage({ data }: PageProps<VisualScheduleConfig>) {
  // No template-specific stats — generic session/event timeline is sufficient
  return <HistoryPage data={data} />;
}
```

- [ ] **Step 4: Update Visual Schedule registry entry**

Add imports to `registry.ts`:

```typescript
import { VisualScheduleHistoryPage } from "./templates/visual-schedule/history-page";
import { VisualScheduleMainPage } from "./templates/visual-schedule/main-page";
import { VisualScheduleSettingsPage } from "./templates/visual-schedule/settings-page";
```

Replace `pages: []` in the `visual_schedule` entry:

```typescript
    pages: [
      { id: "main", label: "Schedule", icon: LayoutGrid, audience: "both", component: VisualScheduleMainPage },
      { id: "settings", label: "Settings", icon: Settings2, audience: "slp", component: VisualScheduleSettingsPage },
      { id: "history", label: "History", icon: BarChart3, audience: "slp", component: VisualScheduleHistoryPage },
    ],
```

- [ ] **Step 5: Verify TypeScript + run tests**

```bash
npx tsc --noEmit && npx vitest run src/features/tools/lib/templates/visual-schedule/
```

Expected: 0 TypeScript errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/lib/templates/visual-schedule/ \
        src/features/tools/lib/registry.ts
git commit -m "feat: add Visual Schedule pages (main, settings, history)"
```

---

### Task 10: First/Then Board pages

**Files:**
- Create: `src/features/tools/lib/templates/first-then-board/main-page.tsx`
- Create: `src/features/tools/lib/templates/first-then-board/settings-page.tsx`
- Create: `src/features/tools/lib/templates/first-then-board/history-page.tsx`
- Modify: `src/features/tools/lib/registry.ts`

- [ ] **Step 1: Create main-page.tsx**

```tsx
// src/features/tools/lib/templates/first-then-board/main-page.tsx
"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { FirstThenBoardRuntime } from "./runtime";
import type { FirstThenBoardConfig } from "./schema";
import { FirstThenBoardConfigSchema } from "./schema";

export function FirstThenBoardMainPage({
  data,
  config: initialConfig,
  ...rest
}: PageProps<FirstThenBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = FirstThenBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return <FirstThenBoardRuntime {...rest} config={config} />;
}
```

- [ ] **Step 2: Create settings-page.tsx**

```tsx
// src/features/tools/lib/templates/first-then-board/settings-page.tsx
"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { FirstThenBoardEditor } from "./editor";
import type { FirstThenBoardConfig } from "./schema";
import { FirstThenBoardConfigSchema } from "./schema";

export function FirstThenBoardSettingsPage({
  config: initialConfig,
  data,
}: PageProps<FirstThenBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = FirstThenBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return (
    <div className="overflow-y-auto">
      <FirstThenBoardEditor
        config={config}
        onChange={(updated) => data.set("config", updated)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create history-page.tsx**

```tsx
// src/features/tools/lib/templates/first-then-board/history-page.tsx
"use client";

import { HistoryPage } from "@/features/tools/lib/runtime/history-page";
import type { PageProps } from "@/features/tools/lib/registry";

import type { FirstThenBoardConfig } from "./schema";

export function FirstThenBoardHistoryPage({ data }: PageProps<FirstThenBoardConfig>) {
  return <HistoryPage data={data} />;
}
```

- [ ] **Step 4: Update First/Then Board registry entry**

Add imports to `registry.ts`:

```typescript
import { FirstThenBoardHistoryPage } from "./templates/first-then-board/history-page";
import { FirstThenBoardMainPage } from "./templates/first-then-board/main-page";
import { FirstThenBoardSettingsPage } from "./templates/first-then-board/settings-page";
```

Replace `pages: []` in the `first_then_board` entry:

```typescript
    pages: [
      { id: "main", label: "Board", icon: LayoutGrid, audience: "both", component: FirstThenBoardMainPage },
      { id: "settings", label: "Settings", icon: Settings2, audience: "slp", component: FirstThenBoardSettingsPage },
      { id: "history", label: "History", icon: BarChart3, audience: "slp", component: FirstThenBoardHistoryPage },
    ],
```

- [ ] **Step 5: Verify TypeScript + run tests**

```bash
npx tsc --noEmit && npx vitest run src/features/tools/lib/templates/first-then-board/
```

Expected: 0 errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/lib/templates/first-then-board/ \
        src/features/tools/lib/registry.ts
git commit -m "feat: add First/Then Board pages (main, settings, history)"
```

---

### Task 11: Matching Game pages

**Files:**
- Create: `src/features/tools/lib/templates/matching-game/main-page.tsx`
- Create: `src/features/tools/lib/templates/matching-game/settings-page.tsx`
- Create: `src/features/tools/lib/templates/matching-game/history-stats.ts`
- Create: `src/features/tools/lib/templates/matching-game/__tests__/history-stats.test.ts`
- Create: `src/features/tools/lib/templates/matching-game/history-page.tsx`
- Modify: `src/features/tools/lib/registry.ts`

- [ ] **Step 1: Write failing history-stats tests**

```typescript
// src/features/tools/lib/templates/matching-game/__tests__/history-stats.test.ts
import { describe, expect, it } from "vitest";

import { matchingHistoryStats } from "../history-stats";
import type { ToolEvent } from "@/features/tools/lib/runtime/page-types";

function correctEvent(prompt: string): ToolEvent {
  return {
    _id: Math.random().toString(),
    _creationTime: Date.now(),
    appInstanceId: "app1",
    eventType: "answer_correct",
    eventPayloadJson: JSON.stringify({ prompt }),
  };
}

function incorrectEvent(prompt: string): ToolEvent {
  return {
    _id: Math.random().toString(),
    _creationTime: Date.now(),
    appInstanceId: "app1",
    eventType: "answer_incorrect",
    eventPayloadJson: JSON.stringify({ prompt }),
  };
}

describe("matchingHistoryStats", () => {
  it("returns empty array when no answer events", () => {
    const events: ToolEvent[] = [
      { _id: "1", _creationTime: 1, appInstanceId: "a", eventType: "app_opened" },
    ];
    expect(matchingHistoryStats(events)).toEqual([]);
  });

  it("returns overall accuracy stat", () => {
    const events = [
      correctEvent("Dog"),
      correctEvent("Dog"),
      incorrectEvent("Dog"),
    ];
    const stats = matchingHistoryStats(events);
    const accuracy = stats.find((s) => s.label === "Accuracy");
    expect(accuracy?.value).toBe("67%");
  });

  it("returns 100% accuracy when all correct", () => {
    const events = [correctEvent("Cat"), correctEvent("Dog")];
    const stats = matchingHistoryStats(events);
    const accuracy = stats.find((s) => s.label === "Accuracy");
    expect(accuracy?.value).toBe("100%");
  });

  it("returns total attempts stat", () => {
    const events = [correctEvent("A"), incorrectEvent("A"), correctEvent("B")];
    const stats = matchingHistoryStats(events);
    const attempts = stats.find((s) => s.label === "Attempts");
    expect(Number(attempts?.value)).toBe(3);
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run src/features/tools/lib/templates/matching-game/__tests__/history-stats.test.ts
```

Expected: All fail with `Cannot find module '../history-stats'`.

- [ ] **Step 3: Create history-stats.ts**

```typescript
// src/features/tools/lib/templates/matching-game/history-stats.ts
import type { HistoryStat, ToolEvent } from "@/features/tools/lib/runtime/page-types";

export function matchingHistoryStats(events: ToolEvent[]): HistoryStat[] {
  const correct = events.filter((e) => e.eventType === "answer_correct").length;
  const incorrect = events.filter((e) => e.eventType === "answer_incorrect").length;
  const total = correct + incorrect;

  if (total === 0) return [];

  const accuracy = Math.round((correct / total) * 100);

  return [
    { label: "Accuracy", value: `${accuracy}%` },
    { label: "Attempts", value: total },
  ];
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/features/tools/lib/templates/matching-game/__tests__/history-stats.test.ts
```

Expected: All pass.

- [ ] **Step 5: Create main-page.tsx**

```tsx
// src/features/tools/lib/templates/matching-game/main-page.tsx
"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { MatchingGameRuntime } from "./runtime";
import type { MatchingGameConfig } from "./schema";
import { MatchingGameConfigSchema } from "./schema";

export function MatchingGameMainPage({
  data,
  config: initialConfig,
  ...rest
}: PageProps<MatchingGameConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = MatchingGameConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return <MatchingGameRuntime {...rest} config={config} />;
}
```

- [ ] **Step 6: Create settings-page.tsx**

```tsx
// src/features/tools/lib/templates/matching-game/settings-page.tsx
"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { MatchingGameEditor } from "./editor";
import type { MatchingGameConfig } from "./schema";
import { MatchingGameConfigSchema } from "./schema";

export function MatchingGameSettingsPage({
  config: initialConfig,
  data,
}: PageProps<MatchingGameConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = MatchingGameConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return (
    <div className="overflow-y-auto">
      <MatchingGameEditor
        config={config}
        onChange={(updated) => data.set("config", updated)}
      />
    </div>
  );
}
```

- [ ] **Step 7: Create history-page.tsx**

```tsx
// src/features/tools/lib/templates/matching-game/history-page.tsx
"use client";

import { HistoryPage } from "@/features/tools/lib/runtime/history-page";
import type { PageProps } from "@/features/tools/lib/registry";

import { matchingHistoryStats } from "./history-stats";
import type { MatchingGameConfig } from "./schema";

export function MatchingGameHistoryPage({ data }: PageProps<MatchingGameConfig>) {
  return <HistoryPage data={data} historyStats={matchingHistoryStats} />;
}
```

- [ ] **Step 8: Update Matching Game registry entry**

Add imports to `registry.ts`:

```typescript
import { MatchingGameHistoryPage } from "./templates/matching-game/history-page";
import { MatchingGameMainPage } from "./templates/matching-game/main-page";
import { MatchingGameSettingsPage } from "./templates/matching-game/settings-page";
```

Replace `pages: []` in the `matching_game` entry:

```typescript
    pages: [
      { id: "main", label: "Game", icon: LayoutGrid, audience: "both", component: MatchingGameMainPage },
      { id: "settings", label: "Settings", icon: Settings2, audience: "slp", component: MatchingGameSettingsPage },
      { id: "history", label: "History", icon: BarChart3, audience: "slp", component: MatchingGameHistoryPage },
    ],
```

- [ ] **Step 9: Run contract test — expect it to now pass**

```bash
npx vitest run src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx
```

Expected: All tests pass including the pages contract assertion added in Task 6.

- [ ] **Step 10: Run all tools tests**

```bash
npx vitest run src/features/tools/
```

Expected: All pass.

- [ ] **Step 11: Commit**

```bash
git add src/features/tools/lib/templates/matching-game/ \
        src/features/tools/lib/registry.ts
git commit -m "feat: add Matching Game pages (main, settings, history)"
```

---

### Task 12: Wire up `ToolRuntimePage` and `AppRuntimePage`

**Files:**
- Modify: `src/app/apps/[shareToken]/page.tsx`
- Modify: `src/features/tools/components/runtime/tool-runtime-page.tsx`

- [ ] **Step 1: Pass `appInstanceId` from the server page**

Open `src/app/apps/[shareToken]/page.tsx`. The `result.instance._id` is already available. Pass it to `ToolRuntimePage`:

```tsx
// src/app/apps/[shareToken]/page.tsx
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

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
          <p className="text-lg font-medium">App not found</p>
          <p className="text-sm mt-1">This app link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <ToolRuntimePage
      shareToken={shareToken}
      appInstanceId={result.instance._id}
      templateType={result.instance.templateType}
      configJson={result.configJson}
    />
  );
}
```

- [ ] **Step 2: Update ToolRuntimePage to use pages**

Replace the entire `src/features/tools/components/runtime/tool-runtime-page.tsx`:

```tsx
// src/features/tools/components/runtime/tool-runtime-page.tsx
"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { templateRegistry } from "../../lib/registry";
import { DEFAULT_APP_SHELL } from "../../lib/runtime/app-shell-types";
import { RuntimeShell } from "../../lib/runtime/runtime-shell";
import { useTemplateData } from "../../lib/runtime/use-template-data";
import { useVoiceController } from "../../lib/runtime/runtime-voice-controller";
import { SessionBanner } from "./session-banner";
import { type SessionEvent, SessionOverlay } from "./session-overlay";

interface ToolRuntimePageProps {
  shareToken: string;
  appInstanceId: string;
  templateType: string;
  configJson: string;
  patientName?: string;
}

export function ToolRuntimePage({
  shareToken,
  appInstanceId,
  templateType,
  configJson,
  patientName,
}: ToolRuntimePageProps) {
  const logEvent = useMutation(api.tools.logEvent);
  const voice = useVoiceController();
  const searchParams = useSearchParams();
  const isSession = searchParams.get("session") === "true";

  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const sessionStartMs = useRef(Date.now());
  const [showSummary, setShowSummary] = useState(false);

  const data = useTemplateData(
    appInstanceId as Id<"app_instances">,
    "published"
  );

  const registration = templateRegistry[templateType];
  if (!registration) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Unknown tool type.
      </div>
    );
  }

  const config = registration.parseConfig(configJson);
  const title = (config as { title?: string }).title ?? registration.meta.name;

  const handleEvent = (eventType: string, payloadJson?: string) => {
    void logEvent({
      shareToken,
      eventType: eventType as Parameters<typeof logEvent>[0]["eventType"],
      eventPayloadJson: payloadJson,
    });
    if (isSession) {
      setSessionEvents((prev) => [
        ...prev,
        { type: eventType, payloadJson, timestamp: Date.now() },
      ]);
    }
  };

  const handleExit = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/");
  };

  const runtimeProps = {
    config,
    appInstanceId,
    mode: "published" as const,
    onEvent: handleEvent,
    voice,
  };

  return (
    <div className="flex flex-col min-h-screen">
      {isSession && <SessionBanner patientName={patientName} />}

      <RuntimeShell
        mode="published"
        shell={registration.shell ?? DEFAULT_APP_SHELL}
        title={title}
        onExit={handleExit}
        pages={registration.pages}
        runtimeProps={runtimeProps}
        data={data}
      />

      {isSession && !showSummary && (
        <SessionOverlay
          events={sessionEvents}
          startTimeMs={sessionStartMs.current}
          toolTitle={title}
          templateType={templateType}
          onEndSession={() => {
            handleEvent("app_closed");
            setShowSummary(true);
          }}
        />
      )}

      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="bg-background rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl">
            <h2 className="font-headline text-xl font-semibold">Session summary</h2>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>Tool: {title}</p>
              <p>Events: {sessionEvents.length}</p>
              <p>
                Completions:{" "}
                {sessionEvents.filter((e) => e.type === "activity_completed").length}
              </p>
              <p>
                Duration:{" "}
                {Math.floor((Date.now() - sessionStartMs.current) / 60000)} min{" "}
                {Math.floor(((Date.now() - sessionStartMs.current) % 60000) / 1000)} sec
              </p>
            </div>
            <button
              type="button"
              onClick={handleExit}
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run src/features/tools/
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/apps/[shareToken]/page.tsx \
        src/features/tools/components/runtime/tool-runtime-page.tsx
git commit -m "feat: wire up ToolRuntimePage with multi-page shell and useTemplateData"
```

---

### Task 13: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass. The two pre-existing failing tests (ElevenLabs voice ID, settings bg-white) may still fail — those are pre-existing, not regressions.

- [ ] **Step 2: TypeScript final check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Convex deploy check**

```bash
npx convex dev --once
```

Expected: No errors. The new `app_instance_data` table and functions deploy cleanly.

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "chore: full-stack template runtime complete — tabs, persistence, history"
```
