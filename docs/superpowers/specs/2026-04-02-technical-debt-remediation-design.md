# Technical Debt Remediation Design

**Date:** 2026-04-02  
**Approach:** Single branch, all findings  
**Scope:** 15 findings from static audit — 2 critical, 7 high, 6 medium

---

## Overview

This spec addresses boundary erosion across backend trust, schema validation, route boundaries, and feature boundaries. All findings are addressed in one branch. The remediation order follows risk tier: security first, structural second, quality signals last.

---

## Section 1: Backend Trust Boundaries

### 1a. `convex/tools.ts` — `get` query (Critical)

**Problem:** `tools.get` at line 87 returns `ctx.db.get(args.id)` with no auth check. Any caller with a valid `app_instances` document ID can read another clinician's draft config.

**Fix:**
- Unauthenticated callers → return `null`
- Authenticated callers → return the document only if `instance.slpUserId === identity.subject` OR `instance.status === "published"`
- Published instances are public by design (they power the share/embed flow). Draft and archived instances are owner-only.

```ts
export const get = query({
  args: { id: v.id("app_instances") },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.id);
    if (!instance) return null;
    if (instance.status === "published") return instance;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || instance.slpUserId !== identity.subject) return null;
    return instance;
  },
});
```

### 1b. `convex/app_state.ts` — open KV store (Critical)

**Problem:** `appState.set` and `appState.get` have no auth and accept any free string as `appId`. This is both a trust-boundary gap and an abuse surface (anyone can write to any key).

**Decision:** Keep `appState` intentionally public (iframe apps don't have Clerk auth) but close the free-string attack surface by requiring `appId` to be a valid `app_instances` document ID.

**Schema change:**
```ts
// convex/schema.ts
appState: defineTable({
  appId: v.id("app_instances"),  // was: v.string()
  key: v.string(),
  value: v.any(), // intentional — sandbox KV, value shape varies by key
  updatedAt: v.number(),
}).index("by_appKey", ["appId", "key"]),
```

**Function changes:**
- `set` and `getAll`: change `appId: v.string()` → `appId: v.id("app_instances")` in args
- `set`: add existence check — `const app = await ctx.db.get(args.appId); if (!app) throw new Error("Unknown app");`
- `get`: same arg type change, no auth check needed (reads are read-only and keyed to a document ID)

**No behavior change for existing apps** — callers that currently pass a valid `app_instances._id` string will continue to work once typed correctly. Callers passing arbitrary strings will break; there should be none in production.

**Migration note:** Changing `appId` from `v.string()` to `v.id("app_instances")` in the schema requires a Convex schema migration. Existing `appState` rows with string `appId` values that are valid document IDs will survive the migration; rows with arbitrary string IDs (if any) will be orphaned. Run `npx convex dev --once` to verify migration succeeds before deploying.

---

## Section 2: Identity Standardization

**Problem:** `convex/sessions.ts:12` and `convex/tools.ts:11` write `identity.subject` directly. `convex/lib/auth.ts:getAuthUserId()` already returns `subject ?? tokenIdentifier` as the canonical identifier. Direct `identity.subject` writes can produce ownership mismatches if the token form ever differs.

**Fix:** Replace all direct `identity.subject` writes in mutations with `await getAuthUserId(ctx)`.

**Files to audit and update:**
- `convex/sessions.ts` — `userId: identity.subject` on insert
- `convex/tools.ts` — `slpUserId: identity.subject` on insert (already uses `identity.subject` in ownership checks too — update both)
- Run `grep -rn "identity\.subject" convex/` to catch any others

**No schema change.** `slpUserId` and `userId` columns stay `v.string()`. The value stored just becomes the output of `getAuthUserId()` consistently.

**Note:** `assertSLP`, `assertPatientAccess`, and `assertCaregiverAccess` in `auth.ts` already use `getAuthUserId()` / `getCurrentAuthIdentifiers()` — no changes needed there.

---

## Section 3: Practice Profile Consolidation + Schema Documentation

### 3a. Delete `convex/practiceProfile.ts`

**Problem:** Two files own the same `practiceProfiles` table with different field names:
- `convex/practiceProfile.ts` writes `practiceAddress`, `practicePhone` (schema-drifted)
- `convex/practiceProfiles.ts` writes `address`, `phone` (matches schema)

**Fix:**
1. `grep -rn "practiceProfile\."` to find all callers (frontend hooks, components)
2. Migrate all callers to `api.practiceProfiles.upsert` / `api.practiceProfiles.get`
3. Delete `convex/practiceProfile.ts`
4. Existing rows with `practiceAddress`/`practicePhone` are orphaned optional fields — no migration needed (they'll never be read)

### 3b. Schema validation documentation

Three `v.any()` fields are intentional but undocumented:

| Field | Decision |
|---|---|
| `sessions.blueprint` | Keep `v.any()`. Add inline comment: "Validated via Zod at app layer — see `src/features/builder/lib/blueprint-schema.ts`" |
| `appState.value` | Keep `v.any()`. Already documented per Section 1b decision |
| `app_instances.configJson` | Keep `v.string()` (JSON-encoded). Add parse-guard utility `parseConfigJson(json: string)` in `convex/lib/config.ts` used before insert/patch in any future write paths |

---

## Section 4: Oversized Files

### 4a. `convex/speechCoach.ts` (618 lines)

Split into three modules — no behavior changes, only extraction:

| File | Contents |
|---|---|
| `convex/speechCoach.ts` | Public API only: `create`, `get`, `list`, `end`, `getOrCreateStandalone` mutations/queries |
| `convex/speechCoach_lifecycle.ts` | Internal lifecycle helpers: state transitions, LiveKit room management, clinical vs standalone branching logic |
| `convex/speechCoach_templates.ts` | Template CRUD: `listTemplates`, `getTemplate`, `upsertTemplate`, `deleteTemplate` |

### 4b. `convex/appointments.ts` (465 lines)

Split into two modules:

| File | Contents |
|---|---|
| `convex/appointments.ts` | Scheduling + CRUD core: `create`, `get`, `list`, `update`, `cancel` |
| `convex/appointments_notifications.ts` | Notification scheduling helpers: reminder scheduling, cancellation notifications |

Remove any test hooks gated on `process.env.NODE_ENV === "test"` — replace with proper `convex-test` patterns.

### 4c. `src/features/session-notes/components/session-note-editor.tsx` (705 lines)

Extract into four focused units:

| File | Responsibility |
|---|---|
| `session-note-editor.tsx` | Rendering shell only (~150 lines). Composes the hooks below. |
| `hooks/use-session-note-autosave.ts` | Debounced autosave: dirty tracking, debounce timer, Convex mutation call |
| `hooks/use-session-note-signing.ts` | Sign flow + SOAP generation: sign mutation, AI generation trigger, status tracking |
| `hooks/use-session-note-lifecycle.ts` | Creation, routing, initial load: create-on-mount, navigate-on-create, load existing note |

### 4d. `src/features/tools/hooks/use-tool-builder.ts` (176 lines)

Extract JSON.parse + timer-seed logic into `src/features/tools/lib/tool-config-seed.ts`. The hook stays but becomes a thin orchestrator.

---

## Section 5: Test Signals

### 5a. Silent WAB scaffold failure

**Problem:** `postinstall` in `package.json` suppresses scaffold install failure with `|| true`. Runtime then assumes the scaffold is present.

**Fix:**
```json
"postinstall": "cd artifacts/wab-scaffold && npm install --omit=dev --legacy-peer-deps --no-audit --no-fund 2>/dev/null || (echo 'WAB scaffold install failed' >&2 && exit 1)"
```

### 5b. Coverage exclusions

Remove from `vitest.config.ts` coverage exclude list:
- `convex/aiActions.ts`
- `convex/image_generation.ts`
- `convex/tools_ai.ts`

These are production paths. If they require live API mocking to test, add mock stubs — don't exclude them.

Keep excluded (genuinely untestable without live external calls or not meaningful to unit-test):
- `convex/stt.ts`
- Seed scripts
- Generated files

### 5c. Skipped E2E tests

**`tests/e2e/builder.spec.ts:8`** — full-suite `test.skip`. Replace with:
```ts
test.skip(!process.env.E2E_BUILDER_ENABLED, "Set E2E_BUILDER_ENABLED=1 to run builder E2E tests");
```

**`tests/e2e/session-notes.spec.ts:8`** — same pattern with `E2E_SESSION_NOTES_ENABLED`.

**Inner `test.skip(true, "No patients in database")`** guards — these are runtime guards, acceptable as-is.

**Flashcards and shared-tool skipped tests** — audit: wire up with the `slpPage` / `caregiverPage` fixtures or delete if the feature is retired.

---

## Section 6: Opportunistic Cleanup (Touch-and-Fix)

These medium findings are addressed in any file already being modified — not tracked as separate tasks:

- **Query/index drift:** Replace `.collect()` + JS `.filter()` with proper `.withIndex()` chains in any session/tools/caregiver file being touched
- **Design-system drift:** Replace raw hex colors with design tokens in any component file being touched
- **Terminology drift:** Replace "tools" copy with "apps" in any UI file being touched
- **Route boundaries:** Enforce thin server wrapper pattern in any page file being touched

---

## Out of Scope

- **Legacy migration debt** (`sessions.userId` optional, TODO backfill comments) — these require a Convex schema migration and carry more risk than the debt they fix. Tracked separately.
- **`docs/plans` artifact cleanup** (218 tracked planning files) — git hygiene pass, separate from this branch
- **README/CLAUDE.md test count reconciliation** — update after test changes are complete

---

## Testing Plan

1. Run `npm test` — all 636 (+ newly uncovered) unit tests pass
2. Run `npx convex dev --once` — no TypeScript errors in Convex functions
3. Run `npx tsc --noEmit` — no Next.js type errors
4. Manual smoke: sign in as SLP, create a draft app, attempt to read it unauthenticated (expect null), publish it, read via share token (expect data)
5. Manual smoke: open a published therapy app in iframe, verify `appState.set` still works with the new `v.id("app_instances")` arg type
6. Run `E2E_BUILDER_ENABLED=1 npx playwright test tests/e2e/builder.spec.ts` once wired up
