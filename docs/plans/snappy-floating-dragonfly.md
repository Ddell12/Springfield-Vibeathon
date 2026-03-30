# Fix All E2E Testing Bugs & Security Issues

## Context

During comprehensive E2E testing on 2026-03-26, we identified **3 critical**, **2 high**, and **10 moderate** issues across the Bridges codebase. The most severe are authorization gaps in Convex mutations — any authenticated user can modify any other user's sessions, messages, and files by knowing the session ID. These must be fixed before any public launch.

### Design Decision: Public Mutations with Auth Checks (Not Internal)

The SSE route (`src/app/api/generate/route.ts`) uses `ConvexHttpClient` (unauthenticated) to call `startGeneration`, `setLive`, `setFailed`, `messages.create`, and `generated_files.upsertAutoVersion`. Converting these to `internalMutation` would require switching to a Convex admin client with `CONVEX_DEPLOY_KEY`, which is a larger architectural change.

**Chosen approach:** Keep mutations public but add `assertSessionOwner()` checks. The SSE route already validates the Clerk JWT (line 61: `const { userId } = await auth()`) and passes `sessionId` from a verified session, so ownership checks won't break the flow — the route's Convex client just needs to be authenticated by setting the auth token.

---

## Step 1: Authenticate the SSE Route's Convex Client

**File:** `src/app/api/generate/route.ts`

The `ConvexHttpClient` at line 29 is unauthenticated. After we add auth checks to mutations, the SSE route's calls will fail. Fix by setting the Clerk token on the client.

**Change (around line 61-65):**
```typescript
const { userId, getToken } = await auth();
if (!userId) return new Response("Unauthorized", { status: 401 });

// Authenticate the Convex client with the Clerk JWT
const token = await getToken({ template: "convex" });
if (token) convex.setAuth(token);
```

This ensures all subsequent `convex.mutation()` calls carry the user's identity.

---

## Step 2: Add Auth to Session State Mutations (CRITICAL)

**File:** `convex/sessions.ts`

Add `assertSessionOwner` to 5 unprotected mutations. The helper already exists at `convex/lib/auth.ts:19`.

### 2a. `startGeneration` (line 43)
```typescript
handler: async (ctx, args) => {
  await assertSessionOwner(ctx, args.sessionId);  // ADD
  const session = await ctx.db.get(args.sessionId);
  // ... rest unchanged
```

### 2b. `setLive` (line 55)
```typescript
handler: async (ctx, args) => {
  await assertSessionOwner(ctx, args.sessionId);  // ADD
  const session = await ctx.db.get(args.sessionId);
  // ... rest unchanged
```

### 2c. `setFailed` (line 69)
```typescript
handler: async (ctx, args) => {
  await assertSessionOwner(ctx, args.sessionId);  // ADD
  const session = await ctx.db.get(args.sessionId);
  // ... rest unchanged
```

### 2d. `updateTitle` (line 145)
```typescript
handler: async (ctx, args) => {
  await assertSessionOwner(ctx, args.sessionId);  // ADD
  const session = await ctx.db.get(args.sessionId);
  // ... rest unchanged
```

### 2e. `setBlueprint` (line 172)
```typescript
handler: async (ctx, args) => {
  await assertSessionOwner(ctx, args.sessionId);  // ADD
  const session = await ctx.db.get(args.sessionId);
  // ... rest unchanged
```

### 2f. `get` query (line 23) — add soft ownership check
```typescript
handler: async (ctx, args) => {
  const session = await assertSessionOwner(ctx, args.sessionId, { soft: true });
  return session;
```

### 2g. Add state transition validation

**File:** `convex/lib/session_states.ts` — add valid transitions map:
```typescript
export const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  idle: ["generating"],
  generating: ["live", "failed"],
  live: ["generating"],  // Allow re-generation from live
  failed: ["generating"], // Allow retry from failed
};
```

Then in each state mutation, validate the transition:
```typescript
import { VALID_TRANSITIONS } from "./lib/session_states";

// In startGeneration handler, after assertSessionOwner:
if (!VALID_TRANSITIONS[session.state as SessionState]?.includes("generating")) {
  throw new Error(`Cannot start generation from state "${session.state}"`);
}
```

Similar checks in `setLive` (must be `generating`) and `setFailed` (must be `generating`).

---

## Step 3: Add Auth to Messages (CRITICAL)

**File:** `convex/messages.ts`

Import `assertSessionOwner` and add checks:

### 3a. `create` (line 5)
```typescript
import { assertSessionOwner } from "./lib/auth";

export const create = mutation({
  // args unchanged
  handler: async (ctx, args) => {
    await assertSessionOwner(ctx, args.sessionId);  // ADD
    // ... rest unchanged
```

### 3b. `list` (line 25) — soft check for queries
```typescript
import { assertSessionOwner } from "./lib/auth";

export const list = query({
  // args unchanged
  handler: async (ctx, args) => {
    const session = await assertSessionOwner(ctx, args.sessionId, { soft: true });
    if (!session) return [];
    // ... rest unchanged
```

### 3c. `addUserMessage` (line 36)
```typescript
handler: async (ctx, args) => {
  await assertSessionOwner(ctx, args.sessionId);  // ADD
  // ... rest unchanged
```

---

## Step 4: Add Auth to Generated Files (HIGH)

**File:** `convex/generated_files.ts`

Import `assertSessionOwner` and add checks:

### 4a. `upsert` (line 6)
```typescript
import { assertSessionOwner } from "./lib/auth";

handler: async (ctx, args) => {
  await assertSessionOwner(ctx, args.sessionId);  // ADD
  // ... rest unchanged
```

### 4b. `upsertAutoVersion` (line 42)
```typescript
handler: async (ctx, args) => {
  await assertSessionOwner(ctx, args.sessionId);  // ADD
  // ... rest unchanged
```

### 4c. `list` (line 72) — soft check
```typescript
handler: async (ctx, args) => {
  const session = await assertSessionOwner(ctx, args.sessionId, { soft: true });
  if (!session) return [];
  // ... rest unchanged
```

### 4d. `getByPath` (line 82) — soft check
```typescript
handler: async (ctx, args) => {
  const session = await assertSessionOwner(ctx, args.sessionId, { soft: true });
  if (!session) return null;
  // ... rest unchanged
```

---

## Step 5: Add Flashcard Deck Delete with Cascade (MODERATE)

**File:** `convex/flashcard_decks.ts`

Add a `remove` mutation that cascades to flashcard cards:

```typescript
export const remove = mutation({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const deck = await ctx.db.get(args.deckId);
    if (!deck) throw new Error("Deck not found");
    if (deck.userId && deck.userId !== identity.subject) throw new Error("Not authorized");

    // Cascade delete all cards in this deck
    while (true) {
      const batch = await ctx.db
        .query("flashcards")
        .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
        .take(200);
      if (batch.length === 0) break;
      for (const card of batch) {
        await ctx.db.delete(card._id);
      }
    }

    await ctx.db.delete(args.deckId);
  },
});
```

Also update `convex/sessions.ts` `remove` handler (after line 138) to cascade-delete flashcard decks:

```typescript
// Cascade-delete flashcard decks and their cards
const decks = await ctx.db
  .query("flashcardDecks")
  .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
  .take(50);
for (const deck of decks) {
  // Delete cards for this deck
  const cards = await ctx.db
    .query("flashcards")
    .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
    .take(200);
  for (const card of cards) {
    await ctx.db.delete(card._id);
  }
  await ctx.db.delete(deck._id);
}
```

---

## Step 6: Harden CSP for Generated App Previews (MODERATE)

**File:** `src/app/api/generate/route.ts` (line 313)

The current CSP includes `'unsafe-eval'` which is required by Tailwind CDN's JIT compiler. We can't remove it without breaking generated apps. However, we can:

1. **Remove `'self'` from default-src** (the iframe is a blob URL, 'self' has no meaning)
2. **Add explicit `script-src`** to limit eval to only Tailwind CDN
3. **Add `frame-ancestors 'none'`** to prevent the generated app from being re-embedded

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none';
    script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com;
    style-src 'unsafe-inline' https://fonts.googleapis.com;
    font-src https://fonts.gstatic.com;
    img-src blob: data: https:;
    connect-src blob: data:;" />
```

---

## Step 7: Fix Shared Tool Page Contrast (LOW)

**File:** `src/features/shared-tool/components/shared-tool-page.tsx`

### 7a. Line 86 — remove double-muted opacity
```diff
- <p className="text-on-surface-variant/60 text-sm">Check back soon!</p>
+ <p className="text-on-surface-variant text-sm">Check back soon!</p>
```

### 7b. Line 84 — make construction icon more visible
```diff
- <MaterialIcon icon="construction" className="text-5xl text-primary/40" />
+ <MaterialIcon icon="construction" className="text-5xl text-primary/60" />
```

---

## Step 8: Update Tests

**File:** `convex/__tests__/sessions.test.ts`

The tests at lines 243-263 currently expect "auth relaxed" behavior. Update them to expect rejection:

```typescript
test("startGeneration rejects cross-user access", async () => {
  const t = convexTest(schema, modules);
  const sessionId = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, { title: "Test", query: "test" });
  await expect(
    t.withIdentity(OTHER_IDENTITY).mutation(api.sessions.startGeneration, { sessionId })
  ).rejects.toThrow("Not authorized");
});

test("updateTitle rejects cross-user access", async () => {
  const t = convexTest(schema, modules);
  const sessionId = await t.withIdentity(TEST_IDENTITY).mutation(api.sessions.create, { title: "Test", query: "test" });
  await expect(
    t.withIdentity(OTHER_IDENTITY).mutation(api.sessions.updateTitle, { sessionId, title: "Hacked" })
  ).rejects.toThrow("Not authorized");
});
```

Add similar tests for:
- `messages.create` / `messages.list` / `messages.addUserMessage` cross-user rejection
- `generated_files.upsert` / `generated_files.list` cross-user rejection
- `sessions.setLive` / `setFailed` / `setBlueprint` cross-user rejection
- State transition validation (idle→live should throw, generating→live should succeed)
- Flashcard deck cascade delete

---

## Files Modified

| File | Changes |
|------|---------|
| `src/app/api/generate/route.ts` | Authenticate Convex client with Clerk JWT; harden CSP |
| `convex/sessions.ts` | Add `assertSessionOwner` to 5 mutations + `get` query; add state transition validation |
| `convex/messages.ts` | Add `assertSessionOwner` to all 3 functions |
| `convex/generated_files.ts` | Add `assertSessionOwner` to all 4 functions |
| `convex/flashcard_decks.ts` | Add `remove` mutation with cascade delete |
| `convex/lib/session_states.ts` | Add `VALID_TRANSITIONS` map |
| `src/features/shared-tool/components/shared-tool-page.tsx` | Fix text contrast |
| `convex/__tests__/sessions.test.ts` | Update cross-user tests to expect rejection |
| `convex/__tests__/messages.test.ts` | Add cross-user rejection tests |
| `convex/__tests__/generated_files.test.ts` | Add cross-user rejection tests |

---

## Verification

1. **Run unit tests:** `npm test` — all 636+ tests should pass (updated tests should now enforce auth)
2. **Run Convex dev:** `npx convex dev` — ensure no deployment errors
3. **Manual E2E verification:**
   - Sign in as test user → create a session → verify generation works end-to-end (auth token on Convex client)
   - From browser console, try calling `convex.mutation(api.sessions.startGeneration, { sessionId: "other-users-session" })` — should fail with "Not authorized"
   - Test the shared tool page at `/tool/[slug]` — verify contrast improvement
   - Test flashcard deck delete via dashboard UI
4. **Run E2E tests:** `npx playwright test` — verify no regressions in auth flow
