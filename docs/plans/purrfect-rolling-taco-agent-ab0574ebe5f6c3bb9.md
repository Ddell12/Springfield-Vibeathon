# Plan: Fix assertDeckOwner + flashcard_decks.get Auth Pattern

## Status: READY_TO_EXECUTE

## Context
Flashcard decks and cards created without auth have `userId: undefined` (legacy/demo mode).
The current code blocks all unauthenticated access — but legacy decks should be accessible to anyone,
mirroring the `assertSessionOwner` pattern in `convex/lib/auth.ts`.

## Files to Change

### 1. `/Users/desha/Springfield-Vibeathon/.worktrees/fix-flashcard-auth/convex/flashcard_cards.ts`

Rewrite `assertDeckOwner` (lines 9-29):
- Fetch deck FIRST (before checking auth)
- If `!deck` → return null (soft) or throw "Deck not found"
- If `!deck.userId` → legacy deck, return it immediately (no auth needed)
- If deck has userId → check auth, reject if mismatch

### 2. `/Users/desha/Springfield-Vibeathon/.worktrees/fix-flashcard-auth/convex/flashcard_decks.ts`

Rewrite `get` query handler (lines 43-53):
- Fetch deck FIRST
- If `!deck` → return null
- If `!deck.userId` → legacy deck, return it
- If deck has userId → check auth, return null if mismatch

## Exact Changes

### flashcard_cards.ts — replace lines 9-29

```typescript
async function assertDeckOwner(
  ctx: QueryCtx | MutationCtx,
  deckId: Id<"flashcardDecks">,
  opts?: { soft?: boolean },
) {
  const deck = await ctx.db.get(deckId);
  if (!deck) {
    if (opts?.soft) return null;
    throw new Error("Deck not found");
  }

  // Legacy decks (no userId) are accessible to everyone
  if (!deck.userId) {
    return deck;
  }

  // Owned decks require matching auth
  const userId = await getAuthUserId(ctx);
  if (!userId || deck.userId !== userId) {
    if (opts?.soft) return null;
    throw new Error(userId ? "Not authorized" : "Not authenticated");
  }
  return deck;
}
```

### flashcard_decks.ts — replace lines 43-53

```typescript
export const get = query({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.deckId);
    if (!deck) return null;

    // Legacy decks (no userId) are accessible to everyone
    if (!deck.userId) return deck;

    // Owned decks require matching auth
    const userId = await getAuthUserId(ctx);
    if (!userId || deck.userId !== userId) return null;
    return deck;
  },
});
```

## Test Plan
- Run `npx vitest run` in the worktree directory
- Confirm existing tests pass (expect 636 tests, 77 files)
- No new tests needed — this is a permissive relaxation, not new behavior

## Commit Message
```
fix: allow legacy (no-userId) flashcard decks to be accessed without auth

Mirror the assertSessionOwner pattern: decks with no userId are demo/legacy
and accessible to everyone. Only decks with an explicit userId enforce
ownership checks.
```
