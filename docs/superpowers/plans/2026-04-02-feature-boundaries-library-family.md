# Feature Boundaries, Library State, and Family Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the shared clinical boundary, move My Apps to a bounded backend contract, unify Library list state, and refactor the Family dashboard with bounded reads and complete Kid Mode coverage.

**Architecture:** Keep the existing vertical slices, but make `src/shared/clinical` a real boundary instead of a passthrough alias. Move therapist app listing concerns into Convex with explicit pagination/search/sort semantics, then reuse one small Library list-state helper across My Apps and Templates. For the Family dashboard, split UI sections into focused feature-local components while introducing purpose-built backend reads for caregiver-facing dashboard data and a fully specified Kid Mode state machine.

**Tech Stack:** Next.js App Router, React, Tailwind v4, Convex, Vitest, React Testing Library, Playwright

---

## File Structure

### Shared clinical boundary

- Modify: `src/shared/clinical/index.ts`
- Modify: `src/shared/clinical/patient-utils.ts`
- Modify: `src/shared/clinical/types.ts`
- Modify: `src/shared/clinical/__tests__/boundary.test.ts`
- Create: `src/shared/clinical/patient-hooks.ts`
- Create: `src/shared/clinical/goal-hooks.ts`
- Modify: `src/features/session-notes/components/structured-data-form.tsx`
- Modify: `src/features/session-notes/components/session-note-editor.tsx`
- Modify: `src/features/evaluations/components/evaluation-editor.tsx`
- Modify: `src/features/plan-of-care/components/poc-editor.tsx`
- Modify: `src/features/discharge/components/discharge-form.tsx`
- Modify: any remaining caller importing `usePatient`, `useActiveGoals`, or patient utils directly from feature slices

### My Apps backend contract and Library state

- Modify: `convex/schema.ts`
- Modify: `convex/tools.ts`
- Modify: `convex/__tests__/tools.test.ts`
- Create: `src/features/library/hooks/use-library-list-state.ts`
- Modify: `src/features/library/components/library-page.tsx`
- Modify: `src/features/library/components/__tests__/library-page.test.tsx`
- Modify: `src/features/my-tools/components/my-tools-page.tsx`
- Modify: `src/features/my-tools/components/__tests__/my-tools-page.test.tsx`
- Modify: `src/features/templates/components/templates-page.tsx`
- Modify: `src/features/templates/components/__tests__/templates-page.test.tsx`

### Family dashboard extraction and bounded caregiver reads

- Modify: `convex/schema.ts`
- Modify: `convex/childApps.ts`
- Modify: `convex/intakeForms.ts`
- Modify: `convex/homePrograms.ts`
- Modify: `convex/tools.ts`
- Modify: `convex/__tests__/childApps.test.ts`
- Modify: `convex/__tests__/intakeForms.test.ts`
- Modify: `convex/__tests__/homePrograms.test.ts`
- Modify: `convex/__tests__/tools.test.ts`
- Create: `src/features/family/components/family-dashboard-header.tsx`
- Create: `src/features/family/components/family-intake-banner.tsx`
- Create: `src/features/family/components/family-kid-mode-entry.tsx`
- Create: `src/features/family/components/family-messages-card.tsx`
- Create: `src/features/family/components/family-speech-coach-cards.tsx`
- Modify: `src/features/family/components/family-dashboard.tsx`
- Modify: `src/features/family/components/published-tools-section.tsx`
- Modify: `src/features/family/components/app-picker.tsx`
- Modify: `src/features/family/components/pin-setup-modal.tsx`
- Modify: `src/features/family/components/kid-mode-exit.tsx`
- Create: `src/features/family/components/__tests__/family-dashboard.test.tsx`
- Create: `src/features/family/components/__tests__/family-kid-mode-entry.test.tsx`
- Create: `src/features/family/components/__tests__/family-speech-coach-cards.test.tsx`
- Modify: `src/features/family/components/__tests__/published-tools-section.test.tsx`

### End-to-end coverage

- Modify: `tests/e2e/family-kid-mode.spec.ts` if it exists, otherwise create it
- Modify: shared Playwright fixtures only if needed

---

### Task 1: Lock the Canonical Shared Clinical Boundary

**Files:**
- Modify: `src/shared/clinical/__tests__/boundary.test.ts`
- Test: `src/shared/clinical/__tests__/boundary.test.ts`

- [ ] **Step 1: Write the failing boundary tests**

```ts
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "__tests__") {
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("shared clinical boundary", () => {
  it("does not import feature modules", () => {
    const dir = path.resolve(process.cwd(), "src/shared/clinical");
    for (const file of collectSourceFiles(dir)) {
      const source = readFileSync(file, "utf8");
      expect(source, `${file} must not import from @/features/`).not.toContain("@/features/");
    }
  });

  it("session notes uses the shared clinical boundary for clinical hooks", () => {
    const file = path.resolve(process.cwd(), "src/features/session-notes/components/structured-data-form.tsx");
    const source = readFileSync(file, "utf8");
    expect(source).toContain('from "@/shared/clinical"');
    expect(source).not.toContain('from "@/features/goals/hooks/use-goals"');
  });

  it("feature components do not use relative imports for shared clinical hooks", () => {
    const featureDirs = [
      "src/features/session-notes",
      "src/features/plan-of-care",
      "src/features/evaluations",
      "src/features/discharge",
    ];
    for (const dir of featureDirs) {
      for (const file of collectSourceFiles(path.resolve(process.cwd(), dir))) {
        const source = readFileSync(file, "utf8");
        expect(source, `${file} must not use relative imports for goals/hooks`).not.toMatch(/from ['"]\.\..*goals\/hooks/);
        expect(source, `${file} must not use relative imports for patients\/hooks`).not.toMatch(/from ['"]\.\..*patients\/hooks/);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/shared/clinical/__tests__/boundary.test.ts`

Expected: FAIL because `structured-data-form.tsx` still imports `useActiveGoals` from `@/features/goals/hooks/use-goals`.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/shared/clinical/__tests__/boundary.test.ts
git commit -m "test: lock shared clinical boundary contract"
```

### Task 2: Implement Shared Clinical Hooks and Migrate Callers

**Files:**
- Create: `src/shared/clinical/patient-hooks.ts`
- Create: `src/shared/clinical/goal-hooks.ts`
- Modify: `src/shared/clinical/index.ts`
- Modify: `src/features/session-notes/components/structured-data-form.tsx`
- Modify: `src/features/session-notes/components/session-note-editor.tsx`
- Modify: `src/features/evaluations/components/evaluation-editor.tsx`
- Modify: `src/features/plan-of-care/components/poc-editor.tsx`
- Modify: `src/features/discharge/components/discharge-form.tsx`
- Test: `src/shared/clinical/__tests__/boundary.test.ts`

- [ ] **Step 1: Write the minimal shared clinical hook modules**

```ts
// src/shared/clinical/patient-hooks.ts
"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function usePatient(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.patients.get, isAuthenticated ? { patientId } : "skip");
}
```

```ts
// src/shared/clinical/goal-hooks.ts
"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function useActiveGoals(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.goals.listActive, isAuthenticated ? { patientId } : "skip");
}
```

```ts
// src/shared/clinical/index.ts
export { usePatient } from "./patient-hooks";
export { useActiveGoals } from "./goal-hooks";
export { calculateAge, formatAge, getInitials } from "./patient-utils";
export type { Goal, Patient } from "./types";
```

- [ ] **Step 2: Migrate callers to the canonical import**

```ts
// src/features/session-notes/components/structured-data-form.tsx
import { formatAge, useActiveGoals } from "@/shared/clinical";
```

```ts
// src/features/plan-of-care/components/poc-editor.tsx
import { useActiveGoals, usePatient } from "@/shared/clinical";
```

```ts
// src/features/evaluations/components/evaluation-editor.tsx
import { usePatient } from "@/shared/clinical";
```

```ts
// src/features/discharge/components/discharge-form.tsx
// Replace the relative import: import { useActiveGoals } from "../../goals/hooks/use-goals";
import { useActiveGoals } from "@/shared/clinical";
```

- [ ] **Step 3: Run the boundary tests**

Run: `npm test -- src/shared/clinical/__tests__/boundary.test.ts`

Expected: PASS

- [ ] **Step 4: Run the directly affected component tests**

Run: `npm test -- src/features/session-notes src/features/plan-of-care src/features/evaluations src/features/discharge`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/clinical src/features/session-notes src/features/plan-of-care src/features/evaluations src/features/discharge
git commit -m "refactor: make shared clinical hooks canonical"
```

### Task 3: Add Failing Convex Tests for the My Apps Backend Contract

**Files:**
- Modify: `convex/__tests__/tools.test.ts`
- Test: `convex/__tests__/tools.test.ts`

- [ ] **Step 1: Write failing tests for the new paginated query**

```ts
it("listPageBySLP returns only non-archived results by default", async () => {
  await t.mutation(api.tools.create, {
    templateType: "visual_schedule",
    title: "Alpha Board",
    configJson: SAMPLE_CONFIG,
  });
  const archivedId = await t.mutation(api.tools.create, {
    templateType: "token_board",
    title: "Archived Board",
    configJson: SAMPLE_CONFIG,
  });
  await t.mutation(api.tools.archive, { id: archivedId });

  const page = await t.query(api.tools.listPageBySLP, {
    page: 1,
    pageSize: 12,
    search: "",
    sortBy: "recent",
  });

  expect(page.items.map((item) => item.title)).toEqual(["Alpha Board"]);
  expect(page.totalCount).toBe(1);
});

it("listPageBySLP returns correct items on page 2", async () => {
  for (let i = 1; i <= 13; i++) {
    await t.mutation(api.tools.create, {
      templateType: "visual_schedule",
      title: `App ${String(i).padStart(2, "0")}`,
      configJson: SAMPLE_CONFIG,
    });
  }

  const page2 = await t.query(api.tools.listPageBySLP, {
    page: 2,
    pageSize: 12,
    search: "",
    sortBy: "alphabetical",
  });

  expect(page2.totalCount).toBe(13);
  expect(page2.items).toHaveLength(1);
  expect(page2.items[0].title).toBe("App 13");
});

it("listPageBySLP applies search and alphabetical sort", async () => {
  await t.mutation(api.tools.create, {
    templateType: "visual_schedule",
    title: "Banana Board",
    configJson: SAMPLE_CONFIG,
  });
  await t.mutation(api.tools.create, {
    templateType: "visual_schedule",
    title: "Apple Board",
    configJson: SAMPLE_CONFIG,
  });

  const page = await t.query(api.tools.listPageBySLP, {
    page: 1,
    pageSize: 12,
    search: "Board",
    sortBy: "alphabetical",
  });

  expect(page.items.map((item) => item.title)).toEqual(["Apple Board", "Banana Board"]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- convex/__tests__/tools.test.ts`

Expected: FAIL with `api.tools.listPageBySLP` missing.

- [ ] **Step 3: Commit the failing tests**

```bash
git add convex/__tests__/tools.test.ts
git commit -m "test: define paginated my apps query contract"
```

### Task 4: Implement the My Apps Query, Schema Support, and Archived Filtering on the Server

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/tools.ts`
- Test: `convex/__tests__/tools.test.ts`

- [ ] **Step 1: Add schema support for stable server-side filtering**

```ts
// convex/schema.ts (app_instances table)
// titleLower is optional for deploy safety; Task 4.5 migration backfills existing docs.
app_instances: defineTable({
  templateType: v.string(),
  title: v.string(),
  titleLower: v.optional(v.string()),
  patientId: v.optional(v.id("patients")),
  slpUserId: v.string(),
  configJson: v.string(),
  status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  shareToken: v.optional(v.string()),
  publishedAt: v.optional(v.number()),
  version: v.number(),
})
  .index("by_slpUserId", ["slpUserId"])
  .index("by_slpUserId_status", ["slpUserId", "status"])
  .index("by_patientId", ["patientId"])
  .index("by_shareToken", ["shareToken"]);
```

- [ ] **Step 2: Update create, update, and duplicate to maintain `titleLower`**

```ts
function normalizeTitle(title: string) {
  return title.trim().toLowerCase();
}

return ctx.db.insert("app_instances", {
  templateType: args.templateType,
  title: args.title,
  titleLower: normalizeTitle(args.title),
  // ...
});

await ctx.db.patch(args.id, {
  configJson: args.configJson,
  ...(args.title !== undefined
    ? { title: args.title, titleLower: normalizeTitle(args.title) }
    : {}),
});
```

- [ ] **Step 3: Add the new paginated query**

```ts
export const listPageBySLP = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
    search: v.string(),
    sortBy: v.union(v.literal("recent"), v.literal("alphabetical")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { items: [], totalCount: 0, page: 1, pageSize: args.pageSize };
    }

    // Single query — no silent .take() cap. Filter archived in JS.
    const all = await ctx.db
      .query("app_instances")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", identity.subject))
      .collect();

    let items = all.filter((item) => item.status !== "archived");

    const search = args.search.trim().toLowerCase();
    if (search) {
      // titleLower may be undefined for docs written before the backfill migration ran.
      items = items.filter((item) =>
        (item.titleLower ?? item.title.toLowerCase()).includes(search)
      );
    }

    items.sort((a, b) =>
      args.sortBy === "alphabetical"
        ? a.title.localeCompare(b.title)
        : b._creationTime - a._creationTime
    );

    const totalCount = items.length;
    const page = Math.max(1, args.page);
    const pageSize = Math.min(Math.max(args.pageSize, 1), 24);
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      totalCount,
      page,
      pageSize,
    };
  },
});
```

- [ ] **Step 4: Run the Convex tests**

Run: `npm test -- convex/__tests__/tools.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/tools.ts convex/__tests__/tools.test.ts
git commit -m "feat: add bounded my apps query"
```

### Task 4.5: Backfill `titleLower` on Existing `app_instances`

**Files:**
- Create: `convex/migrations.ts` (or modify if it exists)
- Test: run once post-deploy, not part of the test suite

> **Why this exists:** `titleLower` is `v.optional()` in the schema so deployment is safe against existing documents. This migration backfills the field so all documents participate in server-side search. Run it once after Task 4 deploys, then it is complete.

- [ ] **Step 1: Add the one-shot migration mutation**

```ts
// convex/migrations.ts
"use node";

import { internalMutation } from "./_generated/server";

export const backfillTitleLower = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("app_instances").collect();
    let patched = 0;
    for (const doc of all) {
      if (doc.titleLower === undefined) {
        await ctx.db.patch(doc._id, { titleLower: doc.title.trim().toLowerCase() });
        patched++;
      }
    }
    return { patched, total: all.length };
  },
});
```

- [ ] **Step 2: Run the migration after deploying Task 4**

```bash
npx convex run migrations:backfillTitleLower
```

Expected output: `{ patched: N, total: M }` where `patched` equals the number of pre-existing documents.

- [ ] **Step 3: Commit**

```bash
git add convex/migrations.ts
git commit -m "chore: add titleLower backfill migration for app_instances"
```

### Task 5: Add Failing Library State Tests Before Refactoring the UI

**Files:**
- Modify: `src/features/library/components/__tests__/library-page.test.tsx`
- Modify: `src/features/my-tools/components/__tests__/my-tools-page.test.tsx`
- Modify: `src/features/templates/components/__tests__/templates-page.test.tsx`
- Test: those three files

- [ ] **Step 1: Write failing Library URL-state tests**

```ts
it("resets page to 1 when the tab changes", async () => {
  const user = userEvent.setup();
  render(<LibraryPage />);
  await user.click(screen.getByRole("tab", { name: /templates/i }));
  expect(replace).toHaveBeenCalledWith("/library?tab=templates&page=1", { scroll: false });
});

it("passes URL-backed list state into My Apps", () => {
  searchParams = new URLSearchParams("tab=my-apps&page=2&search=board&sort=alphabetical");
  render(<LibraryPage />);
  expect(screen.getByText("My Apps Content")).toBeInTheDocument();
});
```

```ts
it("asks the backend for the requested page, search, and sort", () => {
  render(<MyToolsPage />);
  expect(mockUseQuery).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ page: 1, pageSize: 12, search: "", sortBy: "recent" })
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/features/library/components/__tests__/library-page.test.tsx src/features/my-tools/components/__tests__/my-tools-page.test.tsx src/features/templates/components/__tests__/templates-page.test.tsx`

Expected: FAIL because the pages do not share one URL-backed list-state helper yet.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/features/library/components/__tests__/library-page.test.tsx src/features/my-tools/components/__tests__/my-tools-page.test.tsx src/features/templates/components/__tests__/templates-page.test.tsx
git commit -m "test: define library url state contract"
```

### Task 6: Implement the Shared Library List-State Helper and Rewire My Apps and Templates

**Files:**
- Create: `src/features/library/hooks/use-library-list-state.ts`
- Modify: `src/features/library/components/library-page.tsx`
- Modify: `src/features/my-tools/components/my-tools-page.tsx`
- Modify: `src/features/templates/components/templates-page.tsx`
- Test: `src/features/library/components/__tests__/library-page.test.tsx`
- Test: `src/features/my-tools/components/__tests__/my-tools-page.test.tsx`
- Test: `src/features/templates/components/__tests__/templates-page.test.tsx`

- [ ] **Step 1: Add the shared state hook**

```ts
"use client";

import { useRouter, useSearchParams } from "next/navigation";

type LibrarySort = "recent" | "alphabetical" | "popular" | "newest";

// Hook owns URL-derived state and the update function only.
// Consumers own their own typed search state (useState + debounce timer).
export function useLibraryListState(defaultTab: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? defaultTab;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const search = searchParams.get("search") ?? "";
  const sort = (searchParams.get("sort") ?? "recent") as LibrarySort;

  function update(next: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    router.replace(`/library?${params.toString()}`, { scroll: false });
  }

  return { tab, page, search, sort, update };
}
```

- [ ] **Step 2: Refactor My Apps to use the backend contract**

```ts
const state = useLibraryListState("my-apps");
const query = useQuery(api.tools.listPageBySLP, {
  page: state.page,
  pageSize: PAGE_SIZE,
  search: state.search,
  sortBy,
});

useEffect(() => {
  const timer = setTimeout(() => {
    state.update({ tab: "my-apps", page: 1, search: searchQuery || null, sort: sortBy });
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery, sortBy]);
```

- [ ] **Step 3: Refactor Templates to use the same state helper**

```ts
const state = useLibraryListState("templates");

useEffect(() => {
  const timer = setTimeout(() => {
    state.update({
      tab: "templates",
      page: 1,
      search: searchQuery || null,
      sort: sortBy,
      category: selectedCategory === "all" ? null : selectedCategory,
    });
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery, sortBy, selectedCategory]);
```

- [ ] **Step 4: Run the Library and component tests**

Run: `npm test -- src/features/library/components/__tests__/library-page.test.tsx src/features/my-tools/components/__tests__/my-tools-page.test.tsx src/features/templates/components/__tests__/templates-page.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/library src/features/my-tools src/features/templates
git commit -m "refactor: unify library list state"
```

### Task 7: Add Failing Family Dashboard and Kid Mode Tests

**Files:**
- Create: `src/features/family/components/__tests__/family-dashboard.test.tsx`
- Create: `src/features/family/components/__tests__/family-kid-mode-entry.test.tsx`
- Create: `src/features/family/components/__tests__/family-speech-coach-cards.test.tsx`
- Modify: `src/features/family/components/__tests__/published-tools-section.test.tsx`
- Test: those files

- [ ] **Step 1: Write failing family dashboard orchestration tests**

```ts
it("disables Kid Mode entry until PIN state resolves", () => {
  mockHasPIN.mockReturnValue(undefined);
  render(<FamilyDashboard paramsPromise={Promise.resolve({ patientId: "p1" })} />);
  expect(screen.getByRole("button", { name: /kid mode/i })).toBeDisabled();
});

it("shows the intake banner when required forms are incomplete", () => {
  mockRequiredFormProgress.mockReturnValue({ signed: 1, total: 4, isComplete: false });
  render(<FamilyDashboard paramsPromise={Promise.resolve({ patientId: "p1" })} />);
  expect(screen.getByText(/1 of 4 required forms signed/i)).toBeInTheDocument();
});
```

```ts
it("renders only speech-coach programs", () => {
  render(<FamilySpeechCoachCards patientId={"p1" as any} programs={[
    { _id: "hp1", title: "R practice", type: "speech-coach", speechCoachConfig: { targetSounds: ["r"] } },
    { _id: "hp2", title: "Paper handout", type: "standard" },
  ]} />);
  expect(screen.getByText("R practice")).toBeInTheDocument();
  expect(screen.queryByText("Paper handout")).not.toBeInTheDocument();
});

it("renders nothing when there are no speech-coach programs", () => {
  const { container } = render(
    <FamilySpeechCoachCards patientId={"p1" as any} programs={[]} />
  );
  expect(container.firstChild).toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/features/family/components/__tests__/family-dashboard.test.tsx src/features/family/components/__tests__/family-kid-mode-entry.test.tsx src/features/family/components/__tests__/family-speech-coach-cards.test.tsx src/features/family/components/__tests__/published-tools-section.test.tsx`

Expected: FAIL because the extracted components and disabled/loading behavior do not exist yet.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/features/family/components/__tests__
git commit -m "test: define family dashboard refactor coverage"
```

### Task 8: Tighten Caregiver Dashboard Queries and Extract Family Dashboard Sections

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/intakeForms.ts`
- Modify: `convex/homePrograms.ts`
- Modify: `convex/tools.ts`
- Create: `src/features/family/components/family-dashboard-header.tsx`
- Create: `src/features/family/components/family-intake-banner.tsx`
- Create: `src/features/family/components/family-kid-mode-entry.tsx`
- Create: `src/features/family/components/family-messages-card.tsx`
- Create: `src/features/family/components/family-speech-coach-cards.tsx`
- Modify: `src/features/family/components/family-dashboard.tsx`
- Modify: `src/features/family/components/published-tools-section.tsx`
- Modify: `src/features/family/components/app-picker.tsx`
- Modify: `src/features/family/hooks/use-family-data.ts`
- Test: family component tests and relevant Convex tests

- [ ] **Step 1: Add purpose-built caregiver queries**

```ts
// convex/intakeForms.ts
export const getRequiredProgressByCaregiver = authedQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.userId) return { signed: 0, total: 4, isComplete: false };
    await assertCaregiverAccess(ctx, args.patientId);

    const signed = await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    const signedTypes = new Set(
      signed.filter((form) => form.caregiverUserId === ctx.userId).map((form) => form.formType)
    );

    return {
      signed: REQUIRED_INTAKE_FORMS.filter((type) => signedTypes.has(type)).length,
      total: REQUIRED_INTAKE_FORMS.length,
      isComplete: REQUIRED_INTAKE_FORMS.every((type) => signedTypes.has(type)),
    };
  },
});
```

```ts
// convex/homePrograms.ts
export const listActiveSpeechCoachByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    const programs = await ctx.db
      .query("homePrograms")
      .withIndex("by_patientId_status", (q) =>
        q.eq("patientId", args.patientId).eq("status", "active")
      )
      .take(100);
    // type is optional (legacy docs without it default to "standard", not "speech-coach")
    return programs.filter((program) => program.type === "speech-coach");
  },
});
```

```ts
// convex/tools.ts
export const listPublishedByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("app_instances")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .take(100);
    return items.filter((item) => item.status === "published" && item.shareToken);
  },
});
```

- [ ] **Step 2: Extract the dashboard sections**

```ts
// src/features/family/components/family-kid-mode-entry.tsx
interface FamilyKidModeEntryProps {
  hasPIN: boolean | undefined;
  onEnter: () => void;
  onManageApps: () => void;
}

export function FamilyKidModeEntry({ hasPIN, onEnter, onManageApps }: FamilyKidModeEntryProps) {
  return (
    <div className="flex items-center gap-3">
      <Button onClick={onEnter} disabled={hasPIN === undefined} className="flex-1 gap-2">
        Kid Mode
      </Button>
      <Button variant="outline" size="icon" onClick={onManageApps} aria-label="Manage apps" />
    </div>
  );
}
```

```ts
// src/features/family/components/family-dashboard.tsx
<FamilyDashboardHeader patient={patient} />
<FamilyIntakeBanner patientId={typedPatientId} childName={childName} requiredFormProgress={requiredFormProgress} />
<FamilyKidModeEntry hasPIN={hasPIN} onEnter={handleKidMode} onManageApps={() => setShowAppPicker(true)} />
<PublishedToolsSection patientId={typedPatientId} />
<FamilySpeechCoachCards patientId={typedPatientId} />
<FamilyMessagesCard patientId={patientId} unreadCount={unreadCount} />
```

- [ ] **Step 3: Update hooks and sections to use the tighter queries**

```ts
// src/features/family/hooks/use-family-data.ts
// Do NOT add speechCoachPrograms here — FamilySpeechCoachCards owns its own data fetch.
// isLoading gate is unchanged: only blocks on activePrograms and streakData.
return {
  activePrograms,
  streakData,
  unreadCount,
  isLoading: activePrograms === undefined || streakData === undefined,
};
```

```ts
// src/features/family/components/family-speech-coach-cards.tsx
// Fetch independently so the component loads without blocking the rest of the dashboard.
const programs = useQuery(
  api.homePrograms.listActiveSpeechCoachByPatient,
  patientId ? { patientId } : "skip"
);
if (!programs || programs.length === 0) return null;
// ... render cards
```

```ts
// src/features/family/components/published-tools-section.tsx
const instances = useQuery(api.tools.listPublishedByPatient, { patientId });
```

- [ ] **Step 4: Add Convex unit tests for the three new queries**

```ts
// convex/__tests__/intakeForms.test.ts
it("getRequiredProgressByCaregiver returns correct counts for partial completion", async () => {
  // seed patient + caregiver access, sign 1 of the required form types
  // assert { signed: 1, total: REQUIRED_INTAKE_FORMS.length, isComplete: false }
});

it("getRequiredProgressByCaregiver returns isComplete true when all required forms signed", async () => {
  // sign all REQUIRED_INTAKE_FORMS form types for this caregiver
  // assert { isComplete: true }
});
```

```ts
// convex/__tests__/homePrograms.test.ts
it("listActiveSpeechCoachByPatient returns only speech-coach type programs", async () => {
  // create one "standard" active program and one "speech-coach" active program
  // assert only the speech-coach one is returned
});

it("listActiveSpeechCoachByPatient excludes programs with undefined type", async () => {
  // create a program without setting type (legacy doc)
  // assert it does not appear in results
});
```

```ts
// convex/__tests__/tools.test.ts
it("listPublishedByPatient returns only published apps with a shareToken", async () => {
  // create draft app, published app without token, published app with token
  // assert only the last one is returned
});
```

- [ ] **Step 5: Run the Family and Convex tests**

Run: `npm test -- src/features/family/components/__tests__ convex/__tests__/intakeForms.test.ts convex/__tests__/homePrograms.test.ts convex/__tests__/tools.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/family src/features/family/hooks convex/schema.ts convex/intakeForms.ts convex/homePrograms.ts convex/tools.ts convex/__tests__
git commit -m "refactor: extract family dashboard and tighten caregiver reads"
```

### Task 9: Expand Kid Mode Unit Coverage for Setup, Wrong PIN, and Exit

**Files:**
- Modify: `src/features/family/components/pin-setup-modal.tsx`
- Modify: `src/features/family/components/kid-mode-exit.tsx`
- Create or modify: `src/features/family/components/__tests__/pin-setup-modal.test.tsx`
- Create or modify: `src/features/family/components/__tests__/kid-mode-exit.test.tsx`

- [ ] **Step 1: Write failing tests for the state machine edges**

```ts
it("shows an error and clears confirm input when confirmation PIN does not match", async () => {
  render(<PinSetupModal open onOpenChange={vi.fn()} onPinSet={vi.fn()} />);
  await enterDigits("1234");
  await user.click(screen.getByRole("button", { name: /next/i }));
  await enterDigits("9999");
  await user.click(screen.getByRole("button", { name: /set pin/i }));
  expect(screen.getByText(/PINs don't match/i)).toBeInTheDocument();
});

it("clears the pin after a wrong exit attempt", async () => {
  const onVerify = vi.fn().mockResolvedValue(false);
  render(<KidModeExit onVerify={onVerify} onExit={vi.fn()} />);
  await openExitPanel();
  await enterDigits("1111");
  await waitFor(() => expect(onVerify).toHaveBeenCalledWith("1111"));
  await waitFor(() => expect(screen.queryByText("1111")).not.toBeInTheDocument());
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/features/family/components/__tests__/pin-setup-modal.test.tsx src/features/family/components/__tests__/kid-mode-exit.test.tsx`

Expected: FAIL because the edge behaviors are not fully asserted yet.

- [ ] **Step 3: Implement any minimal accessibility and reset fixes needed**

```ts
// pin-setup-modal.tsx
function handleOpenChange(open: boolean) {
  if (!open) {
    setPin("");
    setConfirmPin("");
    setStep("enter");
    setError("");
  }
  onOpenChange(open);
}
```

```ts
// kid-mode-exit.tsx
if (valid) {
  setPin("");
  setIsOpen(false);
  onExit();
} else {
  setShake(true);
  setTimeout(() => {
    setShake(false);
    setPin("");
  }, 500);
}
```

- [ ] **Step 4: Run the unit tests**

Run: `npm test -- src/features/family/components/__tests__/pin-setup-modal.test.tsx src/features/family/components/__tests__/kid-mode-exit.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/family/components/pin-setup-modal.tsx src/features/family/components/kid-mode-exit.tsx src/features/family/components/__tests__/pin-setup-modal.test.tsx src/features/family/components/__tests__/kid-mode-exit.test.tsx
git commit -m "test: cover kid mode pin state machine"
```

### Task 10: Add Playwright Coverage for Kid Mode Setup, Correct PIN, Wrong PIN, and Exit

**Files:**
- Create or modify: `tests/e2e/family-kid-mode.spec.ts`

- [ ] **Step 1: Write the failing Playwright scenarios**

```ts
import { expect } from "@playwright/test";

import { test } from "../fixtures"; // uses caregiverPage fixture

// Patient ID comes from the seeded caregiver's linked patient.
// Store it in E2E_CAREGIVER_PATIENT_ID env var (same pattern as E2E_CAREGIVER_EMAIL).
const PATIENT_ID = process.env.E2E_CAREGIVER_PATIENT_ID ?? "";

test("caregiver sets a PIN and enters Kid Mode", async ({ caregiverPage: page }) => {
  await page.goto(`/family/${PATIENT_ID}`);
  await page.getByRole("button", { name: /kid mode/i }).click();
  await page.getByRole("button", { name: "1" }).click();
  await page.getByRole("button", { name: "2" }).click();
  await page.getByRole("button", { name: "3" }).click();
  await page.getByRole("button", { name: "4" }).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("button", { name: "1" }).click();
  await page.getByRole("button", { name: "2" }).click();
  await page.getByRole("button", { name: "3" }).click();
  await page.getByRole("button", { name: "4" }).click();
  await page.getByRole("button", { name: /set pin/i }).click();
  await expect(page).toHaveURL(/\/family\/.*\/play/);
});

test("caregiver sees an error on wrong exit PIN and can exit with the correct one", async ({ caregiverPage: page }) => {
  await page.goto(`/family/${PATIENT_ID}/play`);
  await page.getByLabel("Exit kid mode").click();
  await page.getByRole("button", { name: "9" }).click();
  await page.getByRole("button", { name: "9" }).click();
  await page.getByRole("button", { name: "9" }).click();
  await page.getByRole("button", { name: "9" }).click();
  await expect(page.getByText(/enter pin to exit/i)).toBeVisible();
  await page.getByRole("button", { name: "1" }).click();
  await page.getByRole("button", { name: "2" }).click();
  await page.getByRole("button", { name: "3" }).click();
  await page.getByRole("button", { name: "4" }).click();
  await expect(page).not.toHaveURL(/\/play$/);
});
```

> **Setup note:** Add `E2E_CAREGIVER_PATIENT_ID` to `.env.local` pointing to the seeded caregiver's linked patient. Follow the same pattern as `E2E_CAREGIVER_EMAIL` in CLAUDE.md.

- [ ] **Step 2: Run the spec to verify the current flow fails or is incomplete**

Run: `npx playwright test tests/e2e/family-kid-mode.spec.ts`

Expected: FAIL until the app and fixtures line up with the new state-machine assertions.

- [ ] **Step 3: Adjust fixtures or selectors only as needed**

```ts
// Prefer role/label selectors already present in UI.
// Do not add test-only selectors unless the accessible names are unstable.
```

- [ ] **Step 4: Run the Playwright spec again**

Run: `npx playwright test tests/e2e/family-kid-mode.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/family-kid-mode.spec.ts
git commit -m "test: cover kid mode entry and exit flows"
```

### Task 11: Full Verification and Final Polish

**Files:**
- No new files expected

- [ ] **Step 1: Run the targeted unit and Convex suites together**

Run: `npm test -- src/shared/clinical/__tests__/boundary.test.ts src/features/library/components/__tests__/library-page.test.tsx src/features/my-tools/components/__tests__/my-tools-page.test.tsx src/features/templates/components/__tests__/templates-page.test.tsx src/features/family/components/__tests__ convex/__tests__/tools.test.ts convex/__tests__/intakeForms.test.ts convex/__tests__/homePrograms.test.ts`

Expected: PASS

- [ ] **Step 2: Run the E2E spec**

Run: `npx playwright test tests/e2e/family-kid-mode.spec.ts`

Expected: PASS

- [ ] **Step 3: Run a final regression sweep if time permits**

Run: `npm test`

Expected: PASS

- [ ] **Step 4: Commit the verification checkpoint**

```bash
git add -A
git commit -m "chore: verify boundary, library, and family dashboard changes"
```

---

## Spec Coverage Check

- Shared clinical boundary: covered by Tasks 1-2.
- Canonical import migration: covered by Task 2.
- My Apps bounded query with server-owned search/sort/page and archived filtering: covered by Tasks 3-4.
- Library URL-state ownership and shared helper: covered by Tasks 5-6.
- Family dashboard extraction into smaller components: covered by Task 8.
- Family dashboard performance widening to published apps and speech-coach visibility: covered by Task 8.
- Kid Mode disabled/loading policy, wrong-PIN branch, and exit flow: covered by Tasks 7, 9, and 10.
- Unit + E2E coverage expansion: covered by Tasks 7-11.

## Placeholder Scan

- No `TODO`, `TBD`, or “implement later” placeholders remain in this plan.
- Every code-changing task includes a concrete code snippet.
- Every test task includes an exact command and expected outcome.

## Type Consistency Check

- Canonical shared clinical hooks are named `usePatient` and `useActiveGoals`.
- New backend query is named `listPageBySLP`.
- Shared Library state helper is named `useLibraryListState`.
- Family speech-coach section is named `FamilySpeechCoachCards`.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | ISSUES_OPEN | 9 issues, 1 critical gap |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**UNRESOLVED:** 0 decisions unresolved
**VERDICT:** ENG CLEARED (all issues resolved during review) — ready to implement

