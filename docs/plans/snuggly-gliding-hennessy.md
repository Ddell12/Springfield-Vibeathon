# Fix Plan: Post-Pivot Bug Sweep

## Context

The 2026-04-01 config-driven template engine pivot retired the WAB/Parcel code-gen builder. New app data lives in `app_instances` (convex/tools.ts) and new routes live under `/tools/`. However, six surfaces in the app still reference the retired `sessions` table, the old `/builder` route, or have missing wiring from the pivot. This plan fixes all issues found during the April 1 E2E verification sweep.

---

## Bugs Being Fixed

| # | Severity | Surface | Problem |
|---|---|---|---|
| 1 | Critical | Library "My Apps" tab | Queries `api.sessions.list` (WAB) instead of `api.tools.listBySLP` (app_instances) |
| 2 | Critical | Sidebar recents | `api.sessions.listRecent` shows retired WAB sessions; links go to `/builder/[sessionId]` |
| 3 | High | Caregiver "Tools" nav | `CAREGIVER_NAV_ITEMS` "Tools" → `ROUTES.BUILDER` → sends caregiver to SLP builder wizard |
| 4 | High | `/tools/[id]` edit route | Missing — no way to re-open and edit a saved app_instance |
| 5 | Medium | Library pagination | Both tabs calculate `totalPages` but render no Prev/Next controls |
| 6 | Medium | Templates tab CTAs | All hrefs use `/builder?prompt=…` (dead with prompt ignored); should route to `/tools/new` |

---

## Implementation

### Fix 1 — Add `archive` mutation to Convex tools
**File:** `convex/tools.ts`

Add after `logEvent`:
```ts
export const archive = mutation({
  args: { id: v.id("app_instances") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const instance = await ctx.db.get(args.id);
    if (!instance) throw new Error("Not found");
    if (instance.slpUserId !== identity.subject) throw new Error("Forbidden");
    await ctx.db.patch(args.id, { status: "archived" });
  },
});
```

---

### Fix 2 — Add TOOLS_EDIT route constant
**File:** `src/core/routes.ts`

Add to the ROUTES object:
```ts
TOOLS_EDIT: (id: string) => `/tools/${id}` as const,
```

---

### Fix 3 — Rewrite Library "My Apps" to use app_instances
**File:** `src/features/my-tools/components/my-tools-page.tsx`

Key changes:
- Replace `useQuery(api.sessions.list)` → `useQuery(api.tools.listBySLP)`
- Replace `useMutation(api.sessions.archive)` → `useMutation(api.tools.archive)`
- Replace `useMutation(api.sessions.updateTitle)` → `useMutation(api.tools.update)` (pass `{ id, title }` since `update` accepts optional `title`)
- Remove `useMutation(api.sessions.duplicateSession)` and `fullscreenBundle` query — import `DuplicateToolDialog` from `@/features/tools/components/builder/duplicate-tool-dialog` instead
- Update `deleteTarget` type from `Id<"sessions">` → `Id<"app_instances">`
- Update card mapping:
  - `id: app._id`
  - `title: app.title`
  - `thumbnail: null` (no previewUrl on app_instances — initials fallback already in ProjectCard)
  - `updatedAt: app._creationTime`
  - `userInitial: app.title.charAt(0).toUpperCase()`
- Remove `FullscreenAppView` — replace "Play" button with link to `/apps/${app.shareToken}` (only shown when `app.status === "published"`)
- ProjectCard's click/link navigates to `ROUTES.TOOLS_EDIT(app._id)` for editing
- Filter out `status === "archived"` before display (same as `sessions` not returning archived)
- Empty state CTA link: `/tools/new` instead of `/builder`
- "Create New App" button: `/tools/new`

---

### Fix 4 — Add pagination UI to both library tabs

**File:** `src/features/my-tools/components/my-tools-page.tsx`

After the results grid (before the CTA section), add:
```tsx
{totalPages > 1 && (
  <div className="flex items-center justify-center gap-3 mt-8">
    <Button
      variant="outline" size="sm"
      disabled={safePage <= 1}
      onClick={() => router.replace(`/library?tab=my-apps&page=${safePage - 1}`, { scroll: false })}
    >
      Previous
    </Button>
    <span className="text-sm text-on-surface-variant">
      Page {safePage} of {totalPages}
    </span>
    <Button
      variant="outline" size="sm"
      disabled={safePage >= totalPages}
      onClick={() => router.replace(`/library?tab=my-apps&page=${safePage + 1}`, { scroll: false })}
    >
      Next
    </Button>
  </div>
)}
```

**File:** `src/features/templates/components/templates-page.tsx`

Same pattern after the template grid, using `tab=templates` in the replace URL. The component already has `router` from `useRouter` — add if missing.

---

### Fix 5 — Fix template card links to use `/tools/new`

**File:** `src/features/templates/components/templates-page.tsx`

- Line ~189: change `href={\`/builder?prompt=${encodeURIComponent(template.prompt)}\`}` → `href="/tools/new"`
- Line ~248 (CTA section `Link`): change `href="/builder"` → `href="/tools/new"`
- Update CTA button text from "Build a Custom App" → "Create a Tool"
- Note: `useRouter` import is already present; add `useRouter` call if not already used

---

### Fix 6 — Fix caregiver "Tools" nav + sidebar cleanup

**File:** `src/shared/lib/navigation.ts`

Line 15 — change:
```ts
{ icon: "auto_awesome", label: "Tools", href: ROUTES.BUILDER },
```
to:
```ts
{ icon: "auto_awesome", label: "Tools", href: ROUTES.FAMILY },
```

**File:** `src/features/dashboard/components/dashboard-sidebar.tsx`

Three changes:
1. Remove `"/tools/new"` from `CAREGIVER_ALLOWED_PREFIXES` (line 23) — caregivers should not access the SLP builder
2. Replace `const recentSessions = useQuery(api.sessions.listRecent) ?? []` with:
   ```ts
   const allTools = useQuery(api.tools.listBySLP) ?? [];
   const recentSessions = [...allTools]
     .sort((a, b) => b._creationTime - a._creationTime)
     .slice(0, 5);
   ```
3. Update recents `Link` href from `ROUTES.BUILDER_SESSION(s._id)` → `ROUTES.TOOLS_EDIT(s._id)`
4. Update active check from `pathname === ROUTES.BUILDER_SESSION(s._id)` → `pathname === ROUTES.TOOLS_EDIT(s._id)`
5. Update the "generating" badge check — remove `s.state === "generating"` reference (app_instances have no `state` field); remove that conditional badge entirely

---

### Fix 7 — Create `/tools/[id]` edit route

**Step A:** Update `use-tool-builder.ts` to accept an optional existing instance ID.

**File:** `src/features/tools/hooks/use-tool-builder.ts`

Add `useQuery` import from convex/react. Add parameter to `useToolBuilder`:
```ts
export function useToolBuilder(initialId?: Id<"app_instances"> | null) {
  const existingInstance = useQuery(
    api.tools.get,
    initialId ? { id: initialId } : "skip"
  );
  // existing state/mutations unchanged...
  
  // Seed state once when existing instance loads
  const seeded = useRef(false);
  useEffect(() => {
    if (existingInstance && !seeded.current) {
      seeded.current = true;
      setState({
        step: 3,
        patientId: existingInstance.patientId,
        templateType: existingInstance.templateType,
        config: JSON.parse(existingInstance.configJson),
        instanceId: existingInstance._id,
        publishedShareToken: existingInstance.shareToken ?? null,
        isSaving: false,
      });
    }
  }, [existingInstance]);
}
```

The `newToolPage` call `useToolBuilder()` stays unchanged (no arg = create mode).

**Step B:** Create the edit page.

**File:** `src/app/(app)/tools/[id]/page.tsx` *(create new)*

```tsx
"use client";

import { useParams } from "next/navigation";
// ... same imports as tools/new/page.tsx ...
import type { Id } from "@convex/_generated/dataModel";

export default function EditToolPage() {
  const { id } = useParams<{ id: string }>();
  const builder = useToolBuilder(id as Id<"app_instances">);
  const patients = useQuery(api.patients.list, {}) ?? [];

  // identical JSX as NewToolPage — same steps 1-4
  // (The hook initializes to step 3 for existing instances,
  //  so steps 1-2 are navigable but pre-filled if user hits Back)
  return ( /* exact same JSX as NewToolPage */ );
}
```

To avoid duplication, extract the wizard JSX into a shared component:
- Create `src/features/tools/components/builder/tool-builder-wizard.tsx` that accepts `builder` and `patients` as props
- Have both `NewToolPage` and `EditToolPage` render `<ToolBuilderWizard builder={builder} patients={patients} />`

---

## Critical Files

| File | Change Type |
|---|---|
| `convex/tools.ts` | Add `archive` mutation |
| `src/core/routes.ts` | Add `TOOLS_EDIT` constant |
| `src/features/my-tools/components/my-tools-page.tsx` | Rewrite data source + pagination + links |
| `src/features/templates/components/templates-page.tsx` | Fix hrefs + add pagination |
| `src/shared/lib/navigation.ts` | Fix caregiver Tools href |
| `src/features/dashboard/components/dashboard-sidebar.tsx` | Fix recents data source + caregiver allowlist |
| `src/features/tools/hooks/use-tool-builder.ts` | Add `initialId` param + seed effect |
| `src/app/(app)/tools/[id]/page.tsx` | **Create new** — edit route |
| `src/features/tools/components/builder/tool-builder-wizard.tsx` | **Create new** — extracted shared wizard JSX |

---

## Verification

### E2E test sequence (run against `localhost:3001`):

1. **Library "My Apps"** — Sign in as SLP, go to `/library`. "My Apps" tab should show `app_instances` (e.g. "Ace's Dinosaur AAC Board"), not old WAB sessions. Initials badge instead of screenshot thumbnail is acceptable.

2. **Edit route** — Click a tool card in "My Apps". Should navigate to `/tools/[id]` and open the wizard at step 3 with existing config pre-loaded.

3. **Library pagination** — With >12 items (or temporarily reduce `PAGE_SIZE` to 2 for testing), confirm Prev/Next buttons appear and URL updates to `?page=2`.

4. **Templates tab links** — Click any template card. Should navigate to `/tools/new` (step 1 of wizard), not to the retired builder.

5. **Caregiver Tools nav** — Sign in as caregiver (`e2e+clerk_test+caregiver@bridges.ai`). Click "Tools" in sidebar. Should stay within `/family/…`, NOT go to `/tools/new`.

6. **Sidebar recents** — As SLP, sidebar recents should list recently created `app_instances` linking to `/tools/[id]`.

7. **Full create → publish → edit flow** — Create a new tool, publish it, copy shareToken. Navigate to `/tools/[id]` and verify config is editable. Navigate to `/apps/[shareToken]` and verify runtime still shows the published (immutable) version.

### Unit tests to run:
```bash
npm test -- --testPathPattern="use-tool-builder|my-tools|template-picker|duplicate-tool"
```
