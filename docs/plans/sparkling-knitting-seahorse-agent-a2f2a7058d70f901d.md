# Fix 3 Remaining E2E Bugs in Bridges App

## Bug 1: Title rename doesn't update in toolbar UI

### Root Cause
In `builder-page.tsx` line 173, `appName` is derived solely from `blueprint.title` (set during AI generation via `resumeSession()`). When the user renames via `handleNameEditEnd()`, it calls `updateTitle` on the Convex sessions table, but `blueprint.title` never updates reactively — it's local React state in the `useStreaming` hook.

### Fix — File: `src/features/builder/components/builder-page.tsx`

**Change 1:** Add a reactive Convex query for the current session (after line 59, near the existing `resumeSessionData` query):

```typescript
// Reactive session query for live title updates (covers both URL-loaded and freshly-created sessions)
const activeSessionId = sessionId ?? sessionIdFromUrl;
const currentSession = useQuery(
  api.sessions.get,
  activeSessionId ? { sessionId: activeSessionId as Id<"sessions"> } : "skip"
);
```

**Change 2:** Replace line 173:
```typescript
// OLD:
const appName = typeof blueprint?.title === "string" ? blueprint.title : "Untitled App";

// NEW:
const appName = currentSession?.title
  ?? (typeof blueprint?.title === "string" ? blueprint.title : "Untitled App");
```

**Why this works:** `useQuery(api.sessions.get, ...)` is a live Convex subscription. When `updateTitle` patches the session document, the query automatically re-fires, updating `currentSession.title` and thus `appName`. This also fixes the stale title in the ShareDialog since `appName` flows to both `BuilderToolbar` (line 254) and `ShareDialog` (line 353) as props.

---

## Bug 2: Share preview links are broken

### Root Cause
`ShareDialog` receives `shareSlug={sessionId ?? "preview"}` (line 351) and builds a URL `/tool/{shareSlug}`. The `SharedToolPage` component queries `apps.getByShareSlug` to find the app record — but **no `apps` record is ever created** when sharing. The raw `sessionId` is not a valid share slug because no row in the `apps` table has it.

### Fix — Two files

#### File: `convex/apps.ts` — Add `ensureForSession` mutation

Add this new mutation after the existing `getBySession` query (after line 85):

```typescript
export const ensureForSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if an app already exists for this session
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (existing) {
      return existing;
    }

    // Generate a short random slug (8 alphanumeric chars)
    const shareSlug = Math.random().toString(36).slice(2, 10);
    const now = Date.now();
    const appId = await ctx.db.insert("apps", {
      title: args.title,
      description: args.description ?? "",
      sessionId: args.sessionId,
      shareSlug,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(appId);
  },
});
```

#### File: `src/features/builder/components/builder-page.tsx` — Wire up share flow

**Change 3:** Add a reactive query for the app record and the mutation (near other hooks, around line 43):

```typescript
const ensureApp = useMutation(api.apps.ensureForSession);

// Reactive query: get the app record for the current session (if one exists)
const appRecord = useQuery(
  api.apps.getBySession,
  activeSessionId ? { sessionId: activeSessionId as Id<"sessions"> } : "skip"
);
```

**Change 4:** Add a handler to ensure the app record exists when opening the share dialog. Replace the inline `onShare` callback (line 258):

```typescript
// OLD:
onShare={() => setShareDialogOpen(true)}

// NEW:
onShare={async () => {
  if (activeSessionId && !appRecord) {
    try {
      await ensureApp({
        sessionId: activeSessionId as Id<"sessions">,
        title: appName,
      });
    } catch {
      toast.error("Failed to prepare share link");
      return;
    }
  }
  setShareDialogOpen(true);
}}
```

**Change 5:** Pass the real `shareSlug` from the app record to `ShareDialog` (line 351):

```typescript
// OLD:
shareSlug={sessionId ?? "preview"}

// NEW:
shareSlug={appRecord?.shareSlug ?? sessionId ?? "preview"}
```

**Why this works:** When the user clicks Share, the `ensureForSession` mutation atomically creates an `apps` row (or returns the existing one). The `appRecord` reactive query then picks up the new row and its `shareSlug`. The `SharedToolPage` at `/tool/{slug}` queries `apps.getByShareSlug` which now finds the record, loads `previewUrl`/`publishedUrl`, and renders the tool.

**Note on previewUrl:** The `SharedToolPage` (line 47) falls back to "still being built" if neither `publishedUrl` nor `previewUrl` exists on the app record. To make unpublished share links actually render the tool, we should also store the preview data. However, this depends on how the app stores its bundled HTML. For the MVP fix, the share link will at minimum correctly resolve (no more "doesn't exist" error). If the tool has been published, `publishedUrl` will already be on the apps record from the publish flow. For a complete solution, the `ensureForSession` mutation could also copy the session's `previewUrl` to the app record if it exists on the session.

**Enhancement to `ensureForSession`** (optional but recommended for full share functionality):

```typescript
// Inside ensureForSession handler, before inserting:
const session = await ctx.db.get(args.sessionId);
const appId = await ctx.db.insert("apps", {
  title: args.title,
  description: args.description ?? "",
  sessionId: args.sessionId,
  shareSlug,
  previewUrl: session?.previewUrl,  // carry over from session if available
  createdAt: now,
  updatedAt: now,
});
```

---

## Bug 3: No message content length validation

### Root Cause
In `convex/messages.ts`, both `create` (line 5) and `addUserMessage` (line 33) accept `content: v.string()` with no length limit. Convex's `v.string()` does not support max-length constraints — validation must be done in the handler.

### Fix — File: `convex/messages.ts`

**Change 6:** Add validation at the top of the `create` mutation handler (after line 12):

```typescript
handler: async (ctx, args) => {
  if (args.content.length > 50_000) {
    throw new Error("Message content exceeds maximum length of 50,000 characters");
  }
  return await ctx.db.insert("messages", {
    // ... existing code
  });
},
```

**Change 7:** Add validation at the top of the `addUserMessage` mutation handler (after line 38), with a tighter limit for user-submitted content:

```typescript
handler: async (ctx, args) => {
  if (args.content.length > 10_000) {
    throw new Error("Message content exceeds maximum length of 10,000 characters");
  }
  return await ctx.db.insert("messages", {
    // ... existing code
  });
},
```

**Optional frontend enhancement:** Add a character counter or pre-submit check in the chat input component to provide immediate feedback before the mutation is called. This is a UX improvement, not required for the bug fix.

---

## Implementation Order

1. **Bug 3 (messages.ts)** — Smallest, safest change. No UI impact. Deploy first.
2. **Bug 1 (builder-page.tsx title reactivity)** — Adds the `currentSession` query. Requires `activeSessionId` variable which Bug 2 also uses.
3. **Bug 2 (apps.ts + builder-page.tsx share flow)** — Depends on the `activeSessionId` variable introduced in Bug 1's fix.

## Testing Checklist

- [ ] Rename a project title via the toolbar inline edit -> title updates immediately in toolbar AND share dialog
- [ ] Click Share -> visit the `/tool/{slug}` link in a new browser/incognito -> page loads (not "doesn't exist")
- [ ] Share the same project twice -> same slug is reused (idempotent)
- [ ] Send a message with >10,000 characters -> error is returned to user
- [ ] Send a message with <10,000 characters -> succeeds normally
- [ ] System/assistant messages up to 50,000 characters -> succeed normally
