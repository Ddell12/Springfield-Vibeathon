# Fix: Convex projects:create dynamic import crash

## Context

`projects:create` mutation crashes with `TypeError: dynamic module import unsupported` because line 11 of `convex/projects.ts` uses `await import("nanoid")` — Convex's V8 runtime doesn't support dynamic `import()`.

## Fix

**File:** `convex/projects.ts`

Replace the dynamic `import("nanoid")` with an inline random slug generator. This avoids the need for any external dependency in the Convex runtime:

```typescript
// Replace lines 11-13:
const { customAlphabet } = await import("nanoid");
const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);
const shareSlug = nanoid();

// With:
const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
let shareSlug = "";
for (let i = 0; i < 10; i++) {
  shareSlug += chars[Math.floor(Math.random() * chars.length)];
}
```

No other files change. The inline approach is fine — `nanoid` was only used for random string generation, and `Math.random()` is sufficient for non-cryptographic share slugs.

## Verification

1. `npx tsc --noEmit` — 0 errors
2. `npx vitest run` — all tests pass
3. Manual: go to `/builder`, generate a tool, confirm no console error on project creation
