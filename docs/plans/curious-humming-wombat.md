# Fix: Convex nanoid Crash + Builder E2E Verification

## Context

The builder workflow crashes with `TypeError: dynamic module import unsupported` when `createProject` is called after fragment generation. The root cause: **nanoid v5.1.7 is ESM-only** and incompatible with the Convex V8 runtime. While `convex/projects.ts` was already fixed (commit `8b5a587`), two other files still import nanoid — likely causing Convex deployment failures that leave the **entire backend stuck on a stale (broken) deploy**.

## Step 1: Remove nanoid from `convex/tools.ts`

**File:** `convex/tools.ts` (lines 2, 53)

- Remove `import { nanoid } from "nanoid";` (line 2)
- Replace `const shareSlug = nanoid(10);` (line 53) with inline random string:
  ```typescript
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let shareSlug = "";
  for (let i = 0; i < 10; i++) {
    shareSlug += chars[Math.floor(Math.random() * chars.length)];
  }
  ```

## Step 2: Remove nanoid from `convex/templates/seed.ts`

**File:** `convex/templates/seed.ts` (lines 1, 168)

- Remove `import { nanoid } from "nanoid";` (line 1)
- Replace `shareSlug: nanoid(10),` (line 168) with a local helper call or inline generation before the insert

## Step 3: Redeploy Convex

Run `npx convex dev` to push fixed functions. This is the critical step — without it, the deployed backend remains broken regardless of local fixes.

## Step 4: Verify builder E2E

1. Open `/builder`
2. Type a therapy tool description (e.g., "a token board for morning routine")
3. Wait for Claude to stream the FragmentResult (~15s)
4. Confirm **no Convex errors** in console — `createProject` mutation succeeds
5. Confirm sandbox preview loads in the iframe
6. Confirm share dialog shows a valid shareSlug
7. Test iteration: send a follow-up message, confirm `updateProject` succeeds

## Step 5: Check if nanoid can be uninstalled

After fixing, nanoid is only used outside `convex/` (ai-elements skill scripts, which are not runtime code). If no other runtime code imports it, run `npm uninstall nanoid` to clean up.

## Files to modify

| File | Change |
|------|--------|
| `convex/tools.ts` | Remove nanoid import, inline random string |
| `convex/templates/seed.ts` | Remove nanoid import, inline random string |

## Why not a shared utility?

The inline pattern is 4 lines, used in 3 places. Per CLAUDE.md: "Don't create helpers, utilities, or abstractions for one-time operations. Three similar lines of code is better than a premature abstraction."

## Verification

- `npx convex dev` deploys without errors
- Builder page: chat → generate → create project → sandbox → preview — full loop works
- No `dynamic module import unsupported` errors in browser console
