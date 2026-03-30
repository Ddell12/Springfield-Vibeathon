# Fix All E2E Testing Issues

## Context

E2E testing of Bridges uncovered 10 actionable issues across security, data integrity, and performance. The bug hunt identified critical auth bypass on `/api/generate`, unbounded Convex queries risking OOM, missing ownership validation allowing cross-user mutations, and a flashcard deletion bug that silently drops cards. This plan addresses all confirmed issues in 4 logical commits.

## Commit 1: Auth hardening & rate-limit fix on `/api/generate`

**File:** `src/app/api/generate/route.ts`

### Fix 1 — Require auth (lines 61-71)

Replace the silent try/catch with strict auth. Add `ALLOW_UNAUTHENTICATED_GENERATE` env var for demo mode.

```typescript
// Replace lines 61-71 with:
let clerkUserId: string | undefined;

const { userId, getToken } = await auth();
clerkUserId = userId ?? undefined;
if (!clerkUserId && process.env.ALLOW_UNAUTHENTICATED_GENERATE !== "true") {
  return jsonErrorResponse("Authentication required", 401);
}
if (clerkUserId) {
  const token = await getToken({ template: "convex" });
  if (token) convex.setAuth(token);
}
```

### Fix 2 — User-based rate limiting (lines 85-91)

Use `clerkUserId` as rate limit key when available, fall back to IP.

```typescript
// Replace lines 85-91 with:
const rateLimitKey = clerkUserId
  ?? request.headers.get("x-real-ip")
  ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  ?? "anonymous";
try {
  await convex.mutation(api.rate_limit_check.checkGenerateLimit, { key: rateLimitKey });
} catch (e) {
  return jsonErrorResponse(e instanceof Error ? e.message : "Rate limited", 429);
}
```

---

## Commit 2: Ownership validation fixes in Convex

### Fix 3 — Doc comment on assertSLP (convex/lib/auth.ts:60)

Add doc comment above `assertSLP` explaining why null role defaults to SLP:

```typescript
/**
 * Assert the caller has SLP privileges.
 * Design: null role (no Clerk metadata) defaults to SLP because new
 * sign-ups start as SLPs. Caregivers get role set via acceptInvite →
 * clerkActions.setCaregiverRole. Patient ownership checks in every
 * SLP-only mutation provide a secondary gate.
 */
```

### Fix 4 — TODO on legacy sessions (convex/lib/auth.ts:31)

```typescript
// TODO(cleanup): Legacy/demo sessions created before auth. Migrate to
// a demo user or delete, then remove this world-readable branch.
```

### Fix 5 — Block unowned item updates

**convex/apps.ts:81** — Change:
```typescript
// FROM:
if (app.userId && app.userId !== identity.subject) throw new Error("Not authorized");
// TO:
if (!app.userId || app.userId !== identity.subject) throw new Error("Not authorized");
```

**convex/flashcard_decks.ts:97** (update) and **:116** (remove) — Same pattern:
```typescript
// FROM:
if (deck.userId && deck.userId !== identity.subject) throw new Error("Not authorized");
// TO:
if (!deck.userId || deck.userId !== identity.subject) throw new Error("Not authorized");
```

### Fix 6 — goalId ownership in patientMaterials.assign (convex/patientMaterials.ts)

Add after line 23 (after the patient ownership check, before the insert):
```typescript
if (args.goalId) {
  const goal = await ctx.db.get(args.goalId);
  if (!goal) throw new ConvexError("Goal not found");
  if (goal.patientId !== args.patientId)
    throw new ConvexError("Goal does not belong to this patient");
  if (goal.slpUserId !== slpUserId)
    throw new ConvexError("Not authorized to use this goal");
}
```

### Fix 7 — Clarifying comment on acceptInvite (convex/caregivers.ts)

Add comment before the status checks explaining no race condition exists:
```typescript
// Convex mutations run with serializable isolation — concurrent calls
// are serialized per-document, so only one can pass the status checks.
```

---

## Commit 3: flashcard_cards deleteByDeck loop fix

**File:** `convex/flashcard_cards.ts` (lines 84-114)

Replace single `.take(500)` with batched while loop (matching the pattern in `flashcard_decks.ts:remove()`):

```typescript
handler: async (ctx, args) => {
  await assertDeckOwner(ctx, args.deckId);
  let totalDeleted = 0;

  if (args.labels) {
    while (true) {
      const batch = await ctx.db
        .query("flashcards")
        .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
        .take(200);
      if (batch.length === 0) break;
      const toDelete = batch.filter((c) => args.labels!.includes(c.label));
      if (toDelete.length === 0) break;
      for (const card of toDelete) { await ctx.db.delete(card._id); }
      totalDeleted += toDelete.length;
    }
  } else {
    while (true) {
      const batch = await ctx.db
        .query("flashcards")
        .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
        .take(200);
      if (batch.length === 0) break;
      for (const card of batch) { await ctx.db.delete(card._id); }
      totalDeleted += batch.length;
    }
  }

  const deck = await ctx.db.get(args.deckId);
  if (deck) {
    await ctx.db.patch(args.deckId, {
      cardCount: Math.max(0, deck.cardCount - totalDeleted),
    });
  }
  return { deleted: totalDeleted };
},
```

---

## Commit 4: Unbounded .collect() limits + token buffer cap

### Fix 8 — Add .take() to all unbounded .collect() calls

| File | Line | Limit | Rationale |
|------|------|-------|-----------|
| `convex/patients.ts` | 73 | `.take(500)` | SLP caseload cap |
| `convex/apps.ts` | 25 | `.take(FREE_LIMITS.maxApps)` | Only need count >= limit |
| `convex/apps.ts` | 124 | `.take(FREE_LIMITS.maxApps)` | Same |
| `convex/flashcard_decks.ts` | 23 | `.take(FREE_LIMITS.maxDecks)` | Same |
| `convex/goals.ts` | 75 | `.take(100)` | Goals per patient |
| `convex/goals.ts` | 92 | `.take(100)` | Active goals |
| `convex/caregivers.ts` | 162 | `.take(50)` | Links per patient |
| `convex/caregivers.ts` | 176 | `.take(50)` | Links per caregiver |
| `convex/patientMaterials.ts` | 67 | `.take(200)` | Materials per patient |
| `convex/homePrograms.ts` | 64 | `.take(100)` | Programs per patient |
| `convex/homePrograms.ts` | 77 | `.take(100)` | Active programs |
| `convex/progressData.ts` | 27 | `.take(200)` | Progress per goal |
| `convex/progressData.ts` | 50 | `.take(200)` | Progress per patient |
| `convex/practiceLog.ts` | 72 | `.take(200)` | Logs per program |
| `convex/practiceLog.ts` | 93 | `.take(200)` | Logs per patient |
| `convex/practiceLog.ts` | 118 | `.take(200)` | Streak data (30 days) |
| `convex/progressReports.ts` | 61 | `.take(100)` | Reports per patient |
| `convex/patientMessages.ts` | 86 | `.take(500)` | Unread count |

### Fix 9 — Token buffer size cap (src/features/builder/hooks/use-streaming.ts:263)

Add max size check before appending to tokenBufferRef:

```typescript
case "token": {
  const MAX_BUFFER = 512 * 1024; // 500KB
  if (tokenBufferRef.current.length + sseEvent.token.length > MAX_BUFFER) {
    dispatch({ type: "SET_STREAMING_TEXT", text: tokenBufferRef.current });
    tokenBufferRef.current = "";
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = undefined;
    }
  }
  tokenBufferRef.current += sseEvent.token;
  // ... rest unchanged
}
```

---

## Not fixing (by design)

| Item | Reason |
|------|--------|
| assertSLP() defaults to SLP | Intentional — caregivers get role via acceptInvite |
| Legacy session access | Backward compat — needs data migration, not code fix |
| acceptInvite race condition | Convex serializable isolation prevents it |
| Persistent home program modal | Agent-browser interaction quirk, not user-facing |
| Dashboard tab truncation | Minor cosmetic at 375px, acceptable |
| Clerk session expiration | Dev mode config, not code |

---

## Verification

1. **Unit tests**: `npm test` — all 636 tests must pass. Tests for `apps.update`, `flashcard_decks.update/remove` may need fixture updates if they relied on unowned items being writable.
2. **Auth check**: `curl -X POST http://localhost:3000/api/generate -H "Content-Type: application/json" -d '{"query":"test"}'` should return 401.
3. **Rate limit**: Verify rate limit key uses userId (check via `npx convex data rate_limit_check` after triggering).
4. **Ownership**: Verify unowned apps/decks cannot be updated (test via `npx convex run apps:update` with no userId on the doc).
5. **Flashcard deletion**: Create a deck with >500 cards, call `deleteByDeck`, verify all deleted.
6. **E2E**: `npx playwright test` — full suite.

## Critical files

- `src/app/api/generate/route.ts`
- `convex/lib/auth.ts`
- `convex/apps.ts`
- `convex/flashcard_decks.ts`
- `convex/flashcard_cards.ts`
- `convex/patientMaterials.ts`
- `convex/caregivers.ts`
- `convex/patients.ts`
- `convex/goals.ts`
- `convex/homePrograms.ts`
- `convex/progressData.ts`
- `convex/practiceLog.ts`
- `convex/progressReports.ts`
- `convex/patientMessages.ts`
- `src/features/builder/hooks/use-streaming.ts`
