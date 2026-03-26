# Plan: Harden Convex Authorization for Hackathon Submission

## Context

The hackathon judge audit found **critical authorization gaps** in Convex public functions. Multiple queries and mutations allow any authenticated user to access or modify any other user's data by guessing document IDs. This is the highest-ROI fix before submission — it transforms the security score from 73 → 85+.

**Scope**: Add ownership checks to 16 functions across 3 files, create a shared auth helper, increase share slug entropy, and add cross-user rejection tests.

## Files to Modify

| File | Changes |
|------|---------|
| `convex/lib/auth.ts` | **NEW** — shared `getAuthUserId` + `assertSessionOwner` helpers |
| `convex/sessions.ts` | Auth checks on 7 functions, remove unused `VALID_STATES` |
| `convex/apps.ts` | Auth checks on 4 functions, require auth on `create`, slug 8→12 chars |
| `convex/flashcard_decks.ts` | Auth checks on 5 functions, remove `userId` arg from `create`/`list` |
| `convex/__tests__/sessions.test.ts` | Add 5 cross-user rejection tests |
| `convex/__tests__/apps.test.ts` | Add 4 cross-user rejection tests, slug length test |

## Step 1: Create shared auth helper

**New file: `convex/lib/auth.ts`**

Two helpers following existing Convex patterns:

```typescript
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function getAuthUserId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;  // Keep identity.subject for consistency with existing data
}

export async function assertSessionOwner(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
  opts?: { soft?: boolean }
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    if (opts?.soft) return null;
    throw new Error("Not authenticated");
  }
  const session = await ctx.db.get(sessionId);
  if (!session) {
    if (opts?.soft) return null;
    throw new Error("Session not found");
  }
  // Legacy sessions (no userId) remain accessible
  if (session.userId && session.userId !== userId) {
    if (opts?.soft) return null;
    throw new Error("Not authorized");
  }
  return session;
}
```

**Design**: `soft: true` for queries (return null), omit for mutations (throw). Legacy sessions with `userId === undefined` are allowed through — this preserves backward compatibility.

## Step 2: Harden `convex/sessions.ts`

Add `import { assertSessionOwner, getAuthUserId } from "./lib/auth";`

| Function | Current | Fix | Pattern |
|----------|---------|-----|---------|
| `get` | No auth | `assertSessionOwner(ctx, sessionId, { soft: true })` | Query → null |
| `listByState` | Returns ALL sessions | Add `getAuthUserId`, filter `s.userId === userId` | Query → [] |
| `getMostRecent` | Returns ANY user's session | Use `by_user` index + in-memory state filter | Query → null |
| `updateTitle` | No auth | `assertSessionOwner(ctx, sessionId)` | Mutation → throw |
| `startGeneration` | No auth | `assertSessionOwner(ctx, sessionId)` | Mutation → throw |
| `setLive` | No auth | `assertSessionOwner(ctx, sessionId)` | Mutation → throw |
| `setFailed` | No auth | `assertSessionOwner(ctx, sessionId)` | Mutation → throw |
| `setBlueprint` | No auth | `assertSessionOwner(ctx, sessionId)` | Mutation → throw |

Also: Remove unused `const VALID_STATES` on line 79.

**`getMostRecent` redesign**: Switch from `by_state` index (returns all users' live sessions) to `by_user` index filtered by current user, then find first with `state === "live"`. More selective at scale.

**Why state mutations stay public**: `route.ts` calls them via `ConvexHttpClient` which only supports public API functions. The client already has `convex.setAuth(token)` set (line 60 of route.ts), so auth context flows through.

## Step 3: Harden `convex/apps.ts`

Add `import { assertSessionOwner, getAuthUserId } from "./lib/auth";`

| Function | Current | Fix |
|----------|---------|-----|
| `get` | No auth | `getAuthUserId` + ownership check → null |
| `update` | No auth | `getUserIdentity` + ownership check → throw |
| `ensureForSession` | No session check | `assertSessionOwner` before create |
| `getBySession` | No auth | `assertSessionOwner(soft)` on session → null |
| `create` | Optional auth | Require auth → throw |
| `getByShareSlug` | No auth | **NO CHANGE** — intentionally public |

**Slug entropy increase**: Change slug from 8 → 12 characters (36^12 = ~4.7 quintillion combinations).

**`publish.ts` compatibility**: The `publishApp` action (line 17) already has its own auth check and calls `ctx.runQuery`/`ctx.runMutation` which forward auth context. No changes needed there.

## Step 4: Harden `convex/flashcard_decks.ts`

Add `import { assertSessionOwner, getAuthUserId } from "./lib/auth";`

| Function | Current | Fix |
|----------|---------|-----|
| `create` | Accepts `userId` arg | Remove `userId` arg, derive from auth, add `assertSessionOwner` |
| `get` | No auth | `getAuthUserId` + ownership check → null |
| `list` | Accepts `userId` arg | Remove arg, derive from auth → [] |
| `listBySession` | No auth | `assertSessionOwner(soft)` → [] |
| `update` | No auth | `getUserIdentity` + ownership check → throw |

**Caller compatibility**:
- `flashcard-tools.ts:26` already passes only `{ title, description, sessionId }` — no `userId`
- `deck-list.tsx:17` already passes `{}` — no `userId`

## Step 5: Update tests

All existing tests already use `.withIdentity(TEST_IDENTITY)` and create+access their own sessions, so they will continue to pass with the new auth checks.

**New tests to add** (`sessions.test.ts`):
- `get` returns null for another user's session
- `get` returns null when not authenticated
- `startGeneration` throws for non-owner
- `updateTitle` throws for non-owner
- `listByState` only returns caller's sessions

**New tests to add** (`apps.test.ts`):
- `get` returns null for another user's app
- `update` throws for non-owner
- `getBySession` returns null for non-owner's session
- `ensureForSession` generates 12-char slug

Test pattern for cross-user scenarios:
```typescript
const OTHER_IDENTITY = { subject: "other-user-456", issuer: "clerk" };

// Same `t` instance, different identity = shared DB, different auth
const t = convexTest(schema, modules);
const t1 = t.withIdentity(TEST_IDENTITY);
const id = await t1.mutation(api.sessions.create, { ... });
const t2 = t.withIdentity(OTHER_IDENTITY);
const result = await t2.query(api.sessions.get, { sessionId: id });
expect(result).toBeNull();
```

## Verification

1. `npx vitest run convex/__tests__/sessions.test.ts` — all existing + new tests pass
2. `npx vitest run convex/__tests__/apps.test.ts` — all existing + new tests pass
3. `npm test` — full suite (625+ tests) still passes
4. Manual: Start dev server, create a session via builder, verify generation pipeline works end-to-end (create → generate → live → update title → publish)
5. Verify `getByShareSlug` still works without auth (public sharing)

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| `route.ts` mutations fail (no auth) | ConvexHttpClient has `setAuth(token)` on line 60 — auth is forwarded |
| `publish.ts` action fails | Action has own auth (line 17), `ctx.runQuery` forwards auth context |
| Legacy sessions inaccessible | `assertSessionOwner` allows access when `session.userId` is undefined |
| Test DB isolation | `convex-test` `.withIdentity()` shares same in-memory DB |
