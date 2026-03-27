# Fix Share Flow E2E + Remove Publish

**Date:** 2026-03-27
**Status:** Approved

## Objective

Make the Share flow work end-to-end: when a user clicks Share and someone opens the `/tool/{slug}` link, they see the generated app rendered in an iframe. Remove the non-functional Publish (Vercel deploy) flow entirely.

## Current State

- **Share flow broken:** `/tool/{slug}` page tries to render `<iframe src={app.previewUrl}>`, but `previewUrl` is never populated on the app record. The builder preview works via client-side blob URL from Parcel-bundled HTML, which can't be shared.
- **Publish flow broken:** `convex/publish.ts` expects `VERCEL_TOKEN` env var that doesn't exist (configured as `VERCEL_DEPLOY_TOKEN`). Template file resolution via `fs.readFileSync` also won't work in Convex runtime. Not needed for vibeathon demo.

## Design

### Share Flow: Serve Bundle HTML via API Route

**Data flow:**
```
User clicks Share
  → ensureForSession creates app record with shareSlug (existing, works today)
  → ShareDialog shows /tool/{shareSlug} link + QR code

Recipient opens /tool/{shareSlug}
  → SharedToolPage renders <iframe src="/api/tool/{shareSlug}">
  → API route calls getPublicBundle(shareSlug)
  → Convex: look up app by slug → get sessionId → fetch _bundle.html from files table
  → Return HTML with Content-Type: text/html
```

### New: `getPublicBundle` query (`convex/generated_files.ts`)

Public query (no auth). Takes a `shareSlug` string. Joins through the `apps` table to find the session, then fetches `_bundle.html` from the `files` table. Returns the HTML string or `null`.

**Lookup chain:** `shareSlug → apps.by_share_slug → sessionId → files.by_session_path("_bundle.html") → contents`

**Indices used:** `apps.by_share_slug` (existing), `files.by_session_path` (existing)

```typescript
// convex/generated_files.ts — new export
export const getPublicBundle = query({
  args: { shareSlug: v.string() },
  handler: async (ctx, args) => {
    const app = await ctx.db
      .query("apps")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", args.shareSlug))
      .first();
    if (!app?.sessionId) return null;
    const file = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", app.sessionId).eq("path", "_bundle.html")
      )
      .first();
    return file?.contents ?? null;
  },
});
```

### New: `GET /api/tool/[slug]/route.ts` (`src/app/api/tool/[slug]/route.ts`)

Next.js API route handler. Uses `ConvexHttpClient` + `fetchQuery` to call `getPublicBundle`. Returns the HTML string as `Content-Type: text/html` with cache headers. Returns 404 if no bundle found.

The `_bundle.html` is a self-contained Parcel bundle with all CSS/JS inlined — no external dependencies. The iframe `sandbox="allow-scripts"` attribute on the shared tool page is sufficient.

### Modified: `shared-tool-page.tsx`

Replace the `previewUrl`/`publishedUrl` iframe logic. The iframe `src` now points at `/api/tool/${slug}`. Remove `isValidPreviewUrl` helper. Show "still being built" when no bundle is available (iframe load error or explicit check).

### Modified: `share-dialog.tsx`

Remove the "Preview Link / Published Link" segmented tab toggle. Show a single share link directly. Keep QR code, copy button, and native share API support.

### Publish Removal

**Delete files:**
- `convex/publish.ts` — Vercel deploy action
- `src/features/builder/hooks/use-publishing.ts` — publishing state hook
- `src/features/builder/components/publish-success-modal.tsx` — post-publish modal
- `src/features/builder/lib/template-files.ts` — WAB scaffold reader (dead code after publish removal)

**Modify files:**
- `builder-toolbar.tsx` — Remove Publish button, `isPublishing` prop, `onPublish` prop, `canPublish` logic
- `builder-page.tsx` — Remove `usePublishing` import/hook, `PublishSuccessModal` import/component, all `publish*` state passed to children
- `convex/apps.ts` — Remove `publishedUrl` from `create` and `update` mutation args
- `convex/schema.ts` — Remove `publishedUrl` from `apps` table definition

## Edge Cases

- **Bundle not yet generated:** API route returns 404; shared page shows "still being built" message
- **Existing app records with `publishedUrl`:** Field becomes unused; schema change removes it (Convex handles this gracefully for optional fields)
- **`ensureForSession` idempotency:** Unchanged, works correctly today
- **Auth:** The `getPublicBundle` query is intentionally public (no auth), matching the existing `getByShareSlug` pattern. Anyone with the slug can view the app.

## Files Changed

| Action | File | Notes |
|--------|------|-------|
| Add | `convex/generated_files.ts` (new export) | `getPublicBundle` public query |
| Add | `src/app/api/tool/[slug]/route.ts` | GET handler serving bundle HTML |
| Modify | `src/features/shared-tool/components/shared-tool-page.tsx` | iframe → API route |
| Modify | `src/features/sharing/components/share-dialog.tsx` | Remove tab toggle |
| Modify | `src/features/builder/components/builder-toolbar.tsx` | Remove Publish button |
| Modify | `src/features/builder/components/builder-page.tsx` | Remove publish hook/modal |
| Modify | `convex/apps.ts` | Remove publishedUrl from mutations |
| Modify | `convex/schema.ts` | Remove publishedUrl from apps |
| Delete | `convex/publish.ts` | Vercel deploy action |
| Delete | `src/features/builder/hooks/use-publishing.ts` | Publishing hook |
| Delete | `src/features/builder/components/publish-success-modal.tsx` | Publish modal |
| Delete | `src/features/builder/lib/template-files.ts` | WAB scaffold reader |
| Modify | `convex/__tests__/apps.test.ts` | Remove `publishedUrl` test case (line 63-77) |
