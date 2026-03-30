# Convex Best-Practices Audit & Migration Plan

## Context

A full audit of `convex/` was performed against three skill guides (convex-dev, convex-helpers, convex-components), the generated AI guidelines, and Convex v1.34.0 docs. The audit found:

1. **One active bug**: `aiActions.ts` uses `anyApi` to call public query/mutation functions instead of `internal.*` — exposing internal cache functions to the client.
2. **convex-helpers is installed (v0.1.114) but completely unused** — custom auth boilerplate in every function can be replaced with typed wrappers.
3. **Three index names violate the `by_fieldName` camelCase convention** in schema.ts.
4. **All four components** (rag, rateLimiter, resend, stripe) are correctly wired and used — no component changes needed.

The user has directed: **use convex-helpers over custom implementations whenever possible**.

---

## Critical Files

| File | Role |
|------|------|
| `convex/ai.ts` | TTS cache query + mutation (need → internal) |
| `convex/aiActions.ts` | `generateSpeech` action using `anyApi` (needs fix) |
| `convex/lib/auth.ts` | Existing auth helpers (reused in new wrappers) |
| `convex/lib/customFunctions.ts` | **NEW** — convex-helpers typed wrappers |
| `convex/schema.ts` | 3 index names to rename |
| `convex/patients.ts` | High-traffic mutations (migrate to wrappers) |
| `convex/goals.ts` | High-traffic mutations (migrate to wrappers) |
| `convex/appointments.ts` | High-traffic mutations (migrate to wrappers) |
| `convex/progressData.ts` | Uses `assertPatientAccess` (migrate) |
| `convex/caregivers.ts` | Uses `assertSLP` (migrate) |
| `convex/sessions.ts` | Uses `assertSessionOwner` (migrate) |
| `convex/flashcard_decks.ts` | Likely uses auth (migrate) |
| `convex/flashcard_cards.ts` | Likely uses auth (migrate) |
| `convex/homePrograms.ts` | Likely uses auth (migrate) |
| `convex/practiceLog.ts` | Likely uses auth (migrate) |
| `convex/patientMaterials.ts` | Uses dual-role access (migrate) |
| `convex/patientMessages.ts` | Uses dual-role access (migrate) |
| `convex/speechCoach.ts` | Uses auth (migrate) |
| `convex/meetingRecords.ts` | Uses auth (migrate) |
| `convex/childApps.ts` | Uses auth (migrate) |

---

## Task 1 — Fix `anyApi` Bug in ai.ts + aiActions.ts

**Why:** `anyApi` bypasses Convex's access control model. `getTtsCache` and `saveTtsCache` are internal implementation details of `generateSpeech` — no client should ever call them. Using `anyApi` means they are registered as public endpoints.

### `convex/ai.ts`
```diff
- import { mutation, query } from "./_generated/server";
+ import { internalMutation, internalQuery } from "./_generated/server";

- export const getTtsCache = query({
+ export const getTtsCache = internalQuery({

- export const saveTtsCache = mutation({
+ export const saveTtsCache = internalMutation({
```

### `convex/aiActions.ts`
```diff
- import { anyApi } from "convex/server";
+ import { internal } from "./_generated/api";

- const cached = await ctx.runQuery(anyApi.ai.getTtsCache, {
+ const cached = await ctx.runQuery(internal.ai.getTtsCache, {

- await ctx.runMutation(anyApi.ai.saveTtsCache, {
+ await ctx.runMutation(internal.ai.saveTtsCache, {
```

---

## Task 2 — Create convex-helpers Typed Wrappers

**Why:** Every mutation currently begins with 2–3 boilerplate lines (`await assertSLP(ctx)`, `await getAuthUserId(ctx)`, etc.). convex-helpers' `customQuery`/`customMutation` lets us inject auth context once into a typed wrapper so every function gets it automatically — less boilerplate, stronger type safety.

### Create `convex/lib/customFunctions.ts` (new file)

```typescript
import { ConvexError } from "convex/values";
import { customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { assertSLP, getAuthUserId, getAuthRole, type UserRole } from "./auth";

// ─── authedQuery ──────────────────────────────────────────────
// Query that injects nullable userId. Returns null for unauthenticated callers.
export const authedQuery = customQuery(query, {
  args: {},
  input: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return { ctx: { ...ctx, userId }, args: {} };
  },
});

// ─── authedMutation ───────────────────────────────────────────
// Mutation that injects userId. Throws if unauthenticated.
export const authedMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    return { ctx: { ...ctx, userId }, args: {} };
  },
});

// ─── slpQuery ─────────────────────────────────────────────────
// Query that injects slpUserId. Returns null if not an SLP.
export const slpQuery = customQuery(query, {
  args: {},
  input: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ctx: { ...ctx, slpUserId: null as string | null }, args: {} };
    const role = await getAuthRole(ctx);
    if (role !== null && role !== "slp") {
      return { ctx: { ...ctx, slpUserId: null as string | null }, args: {} };
    }
    return { ctx: { ...ctx, slpUserId: userId }, args: {} };
  },
});

// ─── slpMutation ──────────────────────────────────────────────
// Mutation that injects slpUserId. Throws if not an SLP.
export const slpMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const slpUserId = await assertSLP(ctx);
    return { ctx: { ...ctx, slpUserId }, args: {} };
  },
});
```

**Usage example (patients.ts before → after):**

```typescript
// BEFORE
export const create = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);  // boilerplate
    ...
  },
});

// AFTER
import { slpMutation } from "./lib/customFunctions";

export const create = slpMutation({
  args: { ... },
  handler: async (ctx, args) => {
    // ctx.slpUserId injected — typed as string
    ...
  },
});
```

---

## Task 3 — Migrate Existing Functions to Use Wrappers

Migrate the following files to use the new wrappers instead of manual `assertSLP`/`getAuthUserId` calls. Pattern per file:

1. Remove `import { assertSLP, getAuthUserId } from "./lib/auth"` (or keep if still needed for `assertPatientAccess`)
2. Add `import { slpMutation, slpQuery, authedMutation, authedQuery } from "./lib/customFunctions"`
3. Replace `mutation({...})` + `await assertSLP(ctx)` with `slpMutation({...})` + `ctx.slpUserId`
4. Replace `query({...})` + early-return null + `await getAuthUserId(ctx)` with `authedQuery({...})` + `ctx.userId`

**Files to migrate:**

| File | Primary wrapper needed |
|------|------------------------|
| `convex/patients.ts` | `slpMutation`, `slpQuery` |
| `convex/goals.ts` | `slpMutation` |
| `convex/appointments.ts` | `slpMutation`, `authedQuery` |
| `convex/progressData.ts` | `authedMutation` (uses assertPatientAccess — keep lib/auth import) |
| `convex/caregivers.ts` | `slpMutation`, `authedMutation` |
| `convex/sessions.ts` | `authedQuery`, `authedMutation` |
| `convex/flashcard_decks.ts` | `slpMutation`, `slpQuery` |
| `convex/flashcard_cards.ts` | `slpMutation` |
| `convex/homePrograms.ts` | `authedMutation` |
| `convex/practiceLog.ts` | `authedMutation` |
| `convex/patientMaterials.ts` | `authedQuery` (keeps assertPatientAccess for dual-role) |
| `convex/patientMessages.ts` | `authedMutation` |
| `convex/speechCoach.ts` | `authedMutation`, `authedQuery` |
| `convex/meetingRecords.ts` | `authedMutation` |
| `convex/childApps.ts` | `authedMutation`, `authedQuery` |

> **Note:** Functions using `assertPatientAccess` (dual SLP/caregiver access) retain the `lib/auth` import alongside the wrappers — the wrapper handles top-level auth, `assertPatientAccess` handles fine-grained ownership.

---

## Task 4 — Fix Index Naming Inconsistencies

Three indexes in `convex/schema.ts` use `by_snake_case` instead of `by_camelCase`:

| Table | Current name | Corrected name | Used in |
|-------|-------------|----------------|---------|
| `childApps` | `by_share_slug` | `by_shareSlug` | `convex/childApps.ts` |
| `appState` | `by_app_key` | `by_appKey` | `convex/app_state.ts` |
| `ttsCache` | `by_text_voice` | `by_textVoice` | `convex/ai.ts` |

For each: update `schema.ts` index definition **and** all `.withIndex()` call sites.

---

## Component Verification Summary (No Changes Required)

All four registered components are correctly implemented:

| Component | Registration | Usage |
|-----------|-------------|-------|
| `@convex-dev/rag` | `app.use(rag)` | `knowledge/seed.ts`, `knowledge/search.ts` — correct `rag.search()` pattern |
| `@convex-dev/rate-limiter` | `app.use(rateLimiter)` | `rate_limits.ts` → `rate_limit_check.ts` — correct `RateLimiter` class with `components.rateLimiter` |
| `@convex-dev/resend` | `app.use(resend)` | `emailActions.ts` — correct `new Resend(components.resend)` + `resend.sendEmail(ctx, ...)` |
| `@convex-dev/stripe` | `app.use(stripe)` | `subscriptions.ts`, `entitlements.ts`, `http.ts` — correct `registerRoutes`, `components.stripe.public.*` usage |

---

## Execution Order

1. **Task 1** — Fix `anyApi` bug (2 files, ~10 lines, zero risk)
2. **Task 4** — Fix index names (schema + 3 query files, low risk, do before migration)
3. **Task 2** — Create `convex/lib/customFunctions.ts` (new file)
4. **Task 3** — Migrate files one at a time, in order listed above

---

## Verification

After each task:
```bash
npx convex dev   # Confirms type generation succeeds with no Convex errors
npm test         # Run full Vitest suite (636 tests) to catch regressions
```

After full migration:
```bash
# Confirm no anyApi imports remain
grep -r "anyApi" convex/

# Confirm no direct assertSLP calls in migrated files
grep -r "assertSLP\|getAuthUserId" convex/ --include="*.ts" | grep -v "lib/auth.ts" | grep -v "lib/customFunctions.ts"
```
