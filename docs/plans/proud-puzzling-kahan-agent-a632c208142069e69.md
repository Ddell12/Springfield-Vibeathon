# Plan: Remove Legacy Session Auth Bypass + Create Migration

## Status: READY TO EXECUTE

## What We're Fixing

`convex/lib/auth.ts` lines 31-35 contains a legacy bypass that makes any session with `userId === undefined` world-readable and world-writable to any caller, including unauthenticated ones. This is a critical security vulnerability in a therapy app handling patient data.

## Files to Change

### 1. `convex/lib/auth.ts` — Replace the bypass

**Change lines 31-35** from:
```typescript
// TODO(cleanup): Legacy/demo sessions created before auth. Migrate to
// a demo user or delete, then remove this world-readable branch.
if (!session.userId) {
  return session;
}
```

To:
```typescript
// Legacy sessions without a userId are not accessible.
if (!session.userId) {
  if (opts?.soft) return null;
  throw new Error("Session has no owner — legacy session access denied");
}
```

Also update the JSDoc comment on `assertSessionOwner` to remove the outdated "Legacy sessions are allowed through" note.

### 2. `convex/seeds/backfill-legacy-sessions.ts` — New file

Create a one-time `internalMutation` that:
- Queries sessions via `by_user` index (no filter needed — the index key is `userId`, querying without `.eq()` does a range scan)
- Actually: use `.take(500)` and filter `s => !s.userId` in JS (since we can't index-query for undefined)
- Deletes all found legacy sessions
- Returns `{ deleted: count }`

Pattern (from task spec):
```typescript
import { internalMutation } from "../_generated/server";

export const deleteLegacySessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user")
      .take(500);
    const legacy = sessions.filter(s => !s.userId);
    for (const s of legacy) {
      await ctx.db.delete(s._id);
    }
    return { deleted: legacy.length };
  },
});
```

Note: `by_user` index on `["userId"]` — calling `.withIndex("by_user")` with no further filter scans from the beginning of the index, which will surface `undefined` userId entries first (Convex sorts undefined/null before defined values). `.take(500)` is a safe bounded read.

### 3. `convex/__tests__/sessions.test.ts` — Add test case

Review: The existing tests all use `withIdentity(TEST_IDENTITY)` when creating sessions, so all created sessions have a `userId`. The existing auth tests already cover:
- `get` returning null for another user (cross-user)
- `get` returning null when unauthenticated

There are no tests that create sessions without a userId (which would require direct `ctx.db.insert` bypassing the public API).

**Add one new test** to the `"authorization — cross-user rejection"` describe block:

```typescript
it("assertSessionOwner rejects sessions with no userId (legacy sessions)", async () => {
  const t = convexTest(schema, modules);
  // Insert a legacy session directly (no userId)
  const legacyId = await t.run(async (ctx) => {
    return await ctx.db.insert("sessions", {
      title: "Legacy Demo",
      query: "test",
      state: "idle",
    });
  });
  // Unauthenticated get should return null (soft path)
  const session = await t.query(api.sessions.get, { sessionId: legacyId });
  expect(session).toBeNull();
  // Any user's get should also return null
  const sessionAsUser = await t.withIdentity(TEST_IDENTITY).query(api.sessions.get, { sessionId: legacyId });
  expect(sessionAsUser).toBeNull();
});
```

Note: `t.run()` is convex-test's escape hatch for direct DB access. Need to verify this API is available in the version used.

## Execution Order

1. Edit `convex/lib/auth.ts` — swap the bypass for the rejection
2. Create `convex/seeds/backfill-legacy-sessions.ts`
3. Edit `convex/__tests__/sessions.test.ts` — add the legacy session test
4. Run `npx vitest run` from the worktree root to verify
5. Commit all three files

## Risks / Concerns

- The `t.run()` API in convex-test: need to check how the existing tests do direct DB inserts (they don't — everything goes through public API). May need to use `t.run` or find the correct convex-test escape hatch.
- The `.withIndex("by_user")` without `.eq()` call: valid Convex pattern — returns all documents sorted by the index key. This is correct for finding legacy (undefined userId) sessions.
- No callers in the codebase create sessions without userId via the public API (sessions.create always sets userId from auth). The only legacy sessions are pre-auth database records.
