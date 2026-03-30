# Fix All E2E Testing Bugs

## Context

During comprehensive E2E testing of the Bridges therapy app builder, 10 bugs were discovered across authentication, session management, security, performance, and UX. These range from a critical dual-role bug that locks SLP users out of their dashboard, to performance issues with unbounded database queries, to UX polish items. This plan addresses all of them in priority order.

**Note:** One reported issue (interest count validation on update) was investigated and found to already be correctly implemented — no fix needed.

---

## Bug 1 (CRITICAL): SLP role overwritten to caregiver on invite accept

**Problem:** When an SLP visits `/invite/[token]`, their Clerk `publicMetadata.role` gets overwritten to `"caregiver"`, locking them out of the SLP dashboard.

**Root cause:** `acceptInvite` mutation only blocks SLPs who own patients (line 84-89). A new SLP or one in a race condition bypasses the guard. `setCaregiverRole` action only skips if role is exactly `"slp"`.

**Files:**
- `convex/caregivers.ts` (lines 82-92)
- `convex/clerkActions.ts` (line 23)

**Changes:**

1. In `caregivers.ts:acceptInvite`, change the SLP guard to throw unconditionally when `role === "slp"`:
   ```
   Line 84: if (role === "slp") {
     throw new ConvexError("Therapists cannot accept caregiver invites...");
   }
   // Keep the null-role + owns-patients check as a secondary guard
   ```

2. In `clerkActions.ts:setCaregiverRole`, broaden the skip from `existingRole === "slp"` to `existingRole` (any existing role):
   ```
   Line 23: if (existingRole) { // was: existingRole === "slp"
   ```

---

## Bug 2 (HIGH): Sessions stuck in "generating" state forever

**Problem:** If the client disconnects during code generation, the session stays in "generating" state permanently with no recovery.

**Root cause:** `route.ts:145-146` logs client disconnects but never calls `failSession`. The `finally` block doesn't check session state.

**Files:**
- `src/app/api/generate/route.ts` (lines 145-158)
- `convex/sessions.ts` (new mutation)

**Changes:**

1. In `route.ts` catch block (line 145-146), fail the session on client disconnect:
   ```
   if (isClientDisconnect) {
     console.log(`[generate] Client disconnected: ${errSummary.slice(0, 200)}`);
     await failSession(convex, sessionId, new Error("Client disconnected"));
   }
   ```

2. Add `recoverStuckSessions` mutation to `convex/sessions.ts` — finds sessions stuck in "generating" for >5 minutes and fails them. Can be called manually or via cron.

---

## Bug 3 (HIGH): Blank preview on session resume

**Problem:** Resuming some sessions shows a blank preview even when the app generated successfully.

**Root cause:** Bundle persist to Convex can silently fail (try/catch swallows error in `bundle-and-persist.ts:64-72`). Preview panel has no UI for `state === "live"` with missing bundle.

**Files:**
- `src/app/api/generate/lib/bundle-and-persist.ts` (lines 64-72)
- `src/features/builder/components/preview-panel.tsx` (after line 149)

**Changes:**

1. In `bundle-and-persist.ts`, remove the try/catch around the bundle persist mutation so failures propagate and `buildSucceeded` stays false.

2. In `preview-panel.tsx`, add a fallback UI block for `state === "live" && !hasPreview`:
   - Show "Preview is loading..." with a spinner
   - Add a Retry button that triggers bundle recovery

---

## Bug 4 (HIGH): Unbounded `.collect()` calls (9 instances)

**Problem:** Several Convex queries use `.collect()` without limits, risking memory exhaustion and slow responses.

**Files & changes (each is a one-line fix):**

| File | Line | Fix |
|------|------|-----|
| `convex/apps.ts` | 163 | `.collect()` → `.take(100)` |
| `convex/apps.ts` | 182 | `.collect()` → `.take(200)` |
| `convex/childApps.ts` | 21 | `.collect()` → `.take(200)` |
| `convex/childApps.ts` | 54 | `.collect()` → `.take(100)` |
| `convex/childApps.ts` | 78-82 | Replace `.collect()` + `.some()` with `.filter().first()` |
| `convex/patients.ts` | 323 | `.collect()` → `.take(500)` |
| `convex/patientMessages.ts` | 94 | `.collect()` → `.take(1000)` |
| `convex/speechCoach.ts` | 128 | `.collect()` → `.take(50)` |
| `convex/speechCoach.ts` | 142 | `.collect()` → `.take(200)` |

Special case — `childApps.ts:78-82` (`getBundleForApp`): Replace collecting all apps + `.some()` check with a targeted `.filter(q => q.eq("appId", args.appId)).first()`.

---

## Bug 5 (HIGH): CSP allows `unsafe-eval`

**Problem:** The CSP header for shared tools at `/api/tool/[slug]` includes `'unsafe-eval'`, which is unnecessary and weakens XSS protection.

**File:** `src/app/api/tool/[slug]/route.ts` (line 35)

**Changes:** Remove `'unsafe-eval'` from `script-src` and restrict `connect-src` to `'none'`:
```
script-src 'unsafe-inline' https://cdn.tailwindcss.com
connect-src 'none'
```
Keep `'unsafe-inline'` — required for Parcel-bundled output.

---

## Bug 6 (MEDIUM): Weak PIN hash — static salt

**Problem:** Kid-mode PIN uses a static salt for all users, making rainbow table attacks trivial for the 10,000 possible 4-digit PINs.

**File:** `convex/childApps.ts` (lines 97-105, 118, 151)

**Changes:**

1. Add `salt` parameter to `hashPIN(pin, salt)` — use `link._id` as per-link salt
2. Update `setPIN` (line 118) and `verifyPIN` (line 151) to pass `link._id`
3. For migration: try new hash first, fall back to old hash in `verifyPIN` (transition period)

---

## Bug 7 (MEDIUM): Goals cascade delete — document only

**Problem:** `goals:remove` soft-deletes (sets status="discontinued") without touching progressData.

**Analysis:** This is actually correct — the goal document remains, so progressData is not orphaned.

**File:** `convex/goals.ts` (line 264)

**Change:** Add clarifying comment only — no functional change needed.

---

## Bug 8 (MEDIUM): Blueprint accepts any size via `v.any()`

**Problem:** `setBlueprint` mutation accepts any object with no size limit.

**File:** `convex/sessions.ts` (lines 215-220)

**Change:** Add size guard after type check:
```typescript
const serialized = JSON.stringify(args.blueprint);
if (serialized && serialized.length > 50_000) {
  throw new ConvexError("Blueprint is too large (max 50KB)");
}
```

---

## Bug 9 (MEDIUM): Home program form — no loading spinner

**Problem:** Submit button changes text but has no visual spinner indicator.

**File:** `src/features/patients/components/home-program-form.tsx` (imports + lines 192-193)

**Changes:**
1. Import `Loader2` from `lucide-react`
2. Add spinner to button: `{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}`

---

## Implementation Order

| # | Branch | Bugs | Files | Priority |
|---|--------|------|-------|----------|
| 1 | `fix/dual-role-guard` | Bug 1 | 2 | CRITICAL |
| 2 | `fix/stuck-session-recovery` | Bug 2 | 2 | HIGH |
| 3 | `fix/preview-resume` | Bugs 3 | 2 | HIGH |
| 4 | `fix/unbounded-collect` | Bug 4 | 6 | HIGH |
| 5 | `fix/csp-tighten` | Bug 5 | 1 | HIGH |
| 6 | `fix/pin-salt` | Bug 6 | 1 | MEDIUM |
| 7 | `fix/blueprint-size` | Bug 8 | 1 | MEDIUM |
| 8 | `fix/spinner-ux` | Bug 9 | 1 | MEDIUM |
| 9 | `docs/goal-cascade` | Bug 7 | 1 | MEDIUM |

Branches 1-5 can run in parallel (different files). Branches 6-9 can also run in parallel.

---

## Verification

### Per-bug verification:

1. **Dual-role**: Sign in as SLP test account → verify `/dashboard` shows SLP view (not family). Try to call `acceptInvite` with SLP token → verify it throws.
2. **Stuck sessions**: Start generation → close browser tab mid-stream → verify session transitions to "failed" state. Run `recoverStuckSessions` mutation → verify stuck sessions are recovered.
3. **Blank preview**: Generate an app successfully → navigate away → return to session → verify preview loads. Simulate persist failure → verify retry UI appears.
4. **Unbounded collect**: `npx convex run` queries with large datasets → verify they return limited results (no timeouts).
5. **CSP**: Visit `/tool/[slug]` → check response headers → confirm no `unsafe-eval`. Test generated app still works (inline scripts).
6. **PIN salt**: Set a new PIN → verify it works. Verify old PINs still work (migration fallback).
7. **Blueprint size**: Try to set a >50KB blueprint via `npx convex run` → verify error thrown.
8. **Spinner**: Open home program form → submit → verify spinner appears and button is disabled.

### Full regression:
```bash
npm test                # Unit tests (636 tests)
npx playwright test     # E2E tests
```
