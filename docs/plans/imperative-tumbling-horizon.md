# Fix All E2E Testing Bugs in Tools Feature

## Context

E2E testing of the `/tools` feature (2026-04-04) uncovered 7 actionable bugs across the tools builder, shared tool runtime, and Convex backend. The most critical: **published tools' share URLs are completely broken** because `SharedToolPage` queries the old `apps` table instead of `app_instances`. Other issues range from unbounded Convex queries to missing mobile responsiveness.

Bug 8 (cross-session error boundary from `intakeForms:getByCaregiver` on role switch) is an auth/session concern outside the tools feature — documented but **not fixed in this PR**.

---

## Step 1: Defensive JSON.parse in tool-config-seed.ts

**File:** `src/features/tools/lib/tool-config-seed.ts:33`

Wrap `JSON.parse(instance.configJson)` in try-catch. On failure, log the error and seed with `{}` so the builder opens rather than crashing.

```typescript
// line 33 — replace:
config: JSON.parse(instance.configJson),
// with:
config: (() => {
  try { return JSON.parse(instance.configJson); }
  catch (err) { console.error("[seedState] bad configJson:", err); return {}; }
})(),
```

**Tests:** Add unit test in `src/features/tools/lib/__tests__/tool-config-seed.test.ts` — pass malformed JSON, assert `onSeed` is called with `config: {}`.

---

## Step 2: Bound unbounded `.collect()` calls in convex/tools.ts

Three queries have unbounded `.collect()`:

| Location | Line | Fix |
|----------|------|-----|
| `getEventSummaryByPatient` | 248 | `.collect()` → `.take(1000)` |
| `listPageBySLP` | 169 | `.collect()` → `.take(500)` |
| `listBySLP` | 131 | `.collect()` → `.take(200)` |

Also add a security-model comment above `logEvent` (line ~330):

```typescript
/**
 * Public mutation — shareToken acts as bearer credential.
 * Read-side queries cap results with .take() to prevent memory exhaustion.
 */
```

**Tests:** Existing `convex/__tests__/tools.test.ts` covers these queries. Run to confirm no behavioral change.

---

## Step 3: Flush pending saves on unmount (use-tool-builder.ts)

**File:** `src/features/tools/hooks/use-tool-builder.ts:86-90`

Replace the cleanup useEffect with a version that flushes the debounced save to Convex on unmount and `beforeunload`:

```typescript
useEffect(() => {
  const flush = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      const s = stateRef.current;
      if (s.instanceId && latestConfigRef.current !== null) {
        void updateInstance({
          id: s.instanceId,
          configJson: JSON.stringify(latestConfigRef.current),
        });
      }
    }
  };
  window.addEventListener("beforeunload", flush);
  return () => {
    window.removeEventListener("beforeunload", flush);
    flush();
  };
}, [updateInstance]);
```

**Tests:** Add test in `use-tool-builder.test.ts` — trigger `updateConfig`, unmount, assert `updateInstance` was called.

---

## Step 4: AAC grid overflow warning in editor

**File:** `src/features/tools/lib/templates/aac-board/editor.tsx`

After the buttons list, add a warning when `buttons.length > gridCols * gridRows`:

```tsx
{config.buttons.length > config.gridCols * config.gridRows && (
  <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
    {config.buttons.length - config.gridCols * config.gridRows} button(s) exceed
    the {config.gridCols}×{config.gridRows} grid and won&apos;t be visible.
  </p>
)}
```

Runtime behavior unchanged — `Array.from({ length: totalSlots })` correctly caps at grid size.

**Tests:** Render AAC editor with 7 buttons on a 3×2 grid, assert warning text is visible.

---

## Step 5: Mobile-responsive builder wizard

**File:** `src/features/tools/components/builder/tool-builder-wizard.tsx`

Three changes:

1. **Left panel** (line ~77): `w-[40%] min-w-[300px]` → `w-full md:w-[40%] md:min-w-[300px]`
2. **Right panel** (line ~137): Add `hidden md:flex` so preview hides on mobile
3. **Mobile preview button** — add below tabs in the left panel, visible only on mobile:
   ```tsx
   <div className="md:hidden p-4 border-t border-border">
     <Button variant="outline" className="w-full" onClick={() => setShowMobilePreview(true)}>
       Preview
     </Button>
   </div>
   ```
4. **Mobile preview dialog** — Dialog wrapping PreviewPanel, controlled by `showMobilePreview` state

**Tests:** Assert preview container has `hidden md:flex` classes. Assert mobile preview button renders.

---

## Step 6: Rewrite SharedToolPage to use new tools API (CRITICAL)

**File:** `src/features/shared-tool/components/shared-tool-page.tsx`

Full rewrite. Key changes:

| Before | After |
|--------|-------|
| `useQuery(api.apps.getByShareSlug, { shareSlug })` | `useQuery(api.tools.getByShareToken, { shareToken })` |
| Renders iframe `<iframe src="/api/tool/${slug}">` | Renders `<ToolRuntimePage>` inline |
| Old `apps` table (legacy WAB system) | New `app_instances` table (template registry) |

**New component structure:**
```
SharedToolPage
├── Loading state (skeleton — keep existing)
├── Not found (keep existing — "This tool doesn't exist")
├── Found:
│   ├── <ToolRuntimePage shareToken configJson templateType />
│   └── <footer> CTA "Build your own" (keep existing)
```

Import `ToolRuntimePage` from `@/features/tools/components/runtime/tool-runtime-page`. Pass `shareToken`, `instance.templateType`, and `configJson` from the query result.

The Vocali header is removed since `RuntimeShell` (inside ToolRuntimePage) provides its own chrome. The footer CTA is preserved.

Old `apps` table tools are deprecated — the 3 seed/demo records are not worth a dual code path.

**Test update:** Rewrite `src/features/shared-tool/components/__tests__/shared-tool-page.test.tsx`:
- Mock `api.tools.getByShareToken` instead of `api.apps.getByShareSlug`
- Mock `ToolRuntimePage` as stub, assert it receives correct props
- Keep loading/not-found test cases
- Remove iframe assertion

---

## Files Modified

| File | Change |
|------|--------|
| `src/features/tools/lib/tool-config-seed.ts` | try-catch JSON.parse |
| `convex/tools.ts` | `.take()` bounds on 3 queries + comment on logEvent |
| `src/features/tools/hooks/use-tool-builder.ts` | beforeunload flush |
| `src/features/tools/lib/templates/aac-board/editor.tsx` | grid overflow warning |
| `src/features/tools/components/builder/tool-builder-wizard.tsx` | mobile responsive |
| `src/features/shared-tool/components/shared-tool-page.tsx` | full rewrite |
| `src/features/shared-tool/components/__tests__/shared-tool-page.test.tsx` | test rewrite |
| `src/features/tools/lib/__tests__/tool-config-seed.test.ts` | new test file |

---

## Verification

1. `npx vitest run` — full test suite passes
2. `npx tsc --noEmit` — no type errors
3. Manual: publish a tool → open `/tool/{shareToken}` in incognito → tool renders (not "doesn't exist")
4. Manual: resize builder to mobile → preview hides, "Preview" button appears
5. Manual: add 7 buttons to 3×2 AAC board → warning visible in editor
