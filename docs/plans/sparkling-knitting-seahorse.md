# Fix E2E Testing Bugs: Stale Title, Broken Share Links, Message Validation

## Context

E2E testing revealed 7 issues. 4 were already fixed. The iframe sandbox issue was handled separately. **3 bugs remain:**

1. **Title rename doesn't reflect in UI** — toolbar and share dialog show "Untitled App" after rename
2. **Share preview links are broken** — `/tool/{slug}` returns "doesn't exist" because no `apps` record is created
3. **No message content length validation** — unbounded `v.string()` allows arbitrarily large messages

## Implementation Order

Bug 3 → Bug 1 → Bug 2 (each builds on the previous, lowest risk first)

---

## Bug 3: Message Content Length Validation

**File:** `convex/messages.ts`

**Problem:** Both `create` and `addUserMessage` accept `content: v.string()` with no length limit. Convex `v.string()` has a system 1MB cap but no app-level constraint.

**Fix:** Add handler-level validation before the `db.insert` call in both mutations:

```typescript
// In create mutation handler (before db.insert):
if (args.content.length > 50_000) {
  throw new Error("Message content exceeds maximum length of 50,000 characters");
}

// In addUserMessage mutation handler (before db.insert):
if (args.content.length > 10_000) {
  throw new Error("Message content exceeds maximum length of 10,000 characters");
}
```

**Why different limits:** `create` handles system/assistant messages (which include generated code — can be long). `addUserMessage` is user-facing input (10k is very generous for a chat prompt).

---

## Bug 1: Title Rename Not Reflected in Toolbar/ShareDialog

**File:** `src/features/builder/components/builder-page.tsx`

**Problem:** Line 173 derives `appName` from `blueprint.title` (local state in useStreaming hook, only set during AI generation). When user renames via `handleNameEditEnd`, it calls `updateTitle` mutation on sessions table, but `blueprint.title` doesn't update reactively.

**Fix:** Add a reactive Convex query for the current session and derive `appName` from it:

1. Compute an `activeSessionId` that works for both resumed and newly-created sessions:
```typescript
const activeSessionId = sessionId ?? sessionIdFromUrl;
```

2. Add a live query for the current session:
```typescript
const currentSession = useQuery(
  api.sessions.get,
  activeSessionId ? { sessionId: activeSessionId as Id<"sessions"> } : "skip"
);
```

3. Change `appName` derivation (line 173) to prefer the Convex session title:
```typescript
const appName = currentSession?.title
  ?? (typeof blueprint?.title === "string" ? blueprint.title : "Untitled App");
```

**Why this works:** `useQuery` is reactive — when `updateTitle` mutation changes the session's title in Convex, the query result automatically updates, `appName` changes, and both `BuilderToolbar` (receives `projectName={appName}`) and `ShareDialog` (receives `appTitle={appName}`) re-render with the new title. No changes needed in those child components.

---

## Bug 2: Share Preview Links Broken

**Files:** `convex/apps.ts`, `src/features/builder/components/builder-page.tsx`

**Problem:** ShareDialog generates `/tool/{sessionId}` URL, but `SharedToolPage` queries `apps.getByShareSlug` — and no `apps` record exists. The `apps` table is empty.

### Step 2a: New mutation in `convex/apps.ts`

Add `ensureForSession` — atomically checks for an existing app record and creates one if missing:

```typescript
export const ensureForSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if app already exists for this session
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (existing) return existing;

    // Generate a short random slug (8 chars, alphanumeric)
    const slug = Array.from({ length: 8 }, () =>
      "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]
    ).join("");

    const now = Date.now();
    const appId = await ctx.db.insert("apps", {
      title: args.title,
      description: args.description ?? "",
      sessionId: args.sessionId,
      shareSlug: slug,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(appId);
  },
});
```

**Why `Math.random` instead of nanoid:** Convex queries/mutations run in V8 runtime (no Node.js), so `crypto.randomUUID()` and `import("nanoid")` are unavailable. `Math.random` is fine for 8-char slugs in a single-user demo app. For production, use a deterministic seed or Convex's built-in ID generation.

### Step 2b: Wire up in `builder-page.tsx`

1. Add imports and hooks:
```typescript
const ensureApp = useMutation(api.apps.ensureForSession);
const appRecord = useQuery(
  api.apps.getBySession,
  activeSessionId ? { sessionId: activeSessionId as Id<"sessions"> } : "skip"
);
```

2. Update the share button handler to ensure the app record exists before opening the dialog:
```typescript
const handleShare = async () => {
  if (activeSessionId) {
    try {
      await ensureApp({
        sessionId: activeSessionId as Id<"sessions">,
        title: appName,
        description: "",
      });
    } catch (err) {
      console.error("Failed to create share link:", err);
    }
  }
  setShareDialogOpen(true);
};
```

3. Update the ShareDialog props to use the app's slug instead of raw sessionId:
```typescript
<ShareDialog
  open={shareDialogOpen}
  onOpenChange={setShareDialogOpen}
  shareSlug={appRecord?.shareSlug ?? sessionId ?? "preview"}
  appTitle={appName}
  publishedUrl={appRecord?.publishedUrl ?? publishedUrl ?? undefined}
/>
```

4. Update `onShare` prop on BuilderToolbar from `() => setShareDialogOpen(true)` to `handleShare`.

---

## Files Modified

| File | Change |
|------|--------|
| `convex/messages.ts` | Add content length validation in both mutation handlers |
| `convex/apps.ts` | Add `ensureForSession` mutation |
| `src/features/builder/components/builder-page.tsx` | Add `activeSessionId`, `currentSession` query, `appRecord` query, `ensureApp` mutation, `handleShare` function; update `appName` derivation and ShareDialog props |

## Files NOT Modified (confirmed correct as-is)

- `src/features/builder/components/builder-toolbar.tsx` — already displays `projectName` prop reactively
- `src/features/sharing/components/share-dialog.tsx` — already uses `shareSlug` prop correctly
- `src/features/shared-tool/components/shared-tool-page.tsx` — already queries `getByShareSlug` correctly
- `convex/sessions.ts` — `updateTitle` mutation already works correctly

## Verification

1. **Title rename:**
   - Open builder with a session → click title → type new name → press Enter
   - Toolbar should show new name immediately
   - Click Share → dialog should show "Share '{new name}'"

2. **Share links:**
   - Open builder → Click Share → copy the preview link
   - Open the link in a new tab → should show the tool (not "doesn't exist")
   - Check Convex: `npx convex data apps --limit 5` → should show the app record with shareSlug

3. **Message validation:**
   - Verify `addUserMessage` rejects content > 10,000 chars
   - Verify `create` rejects content > 50,000 chars
   - Run existing tests: `npm run test:run` to confirm no regressions
