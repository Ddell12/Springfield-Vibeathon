# Fix All E2E Testing Issues

## Context

E2E testing on 2026-03-30 uncovered 17 potential issues across security, data integrity, UX, and reliability. After deep code exploration, **5 were false positives** (already fixed or not real issues), leaving **10 actionable fixes** and **2 documentation-only items**. This plan addresses all of them.

### False Positives (no action needed)
- **inviteToken leak in `listByPatient`**: Already stripped via destructuring `({ inviteToken, ...rest }) => rest`
- **Race condition in `acceptInvite`**: Convex provides true serializable isolation via OCC — concurrent mutations on the same document are serialized automatically
- **Builder toolbar rename error handling**: Already has try-catch with `toast.error("Failed to rename app")` at `builder-page.tsx:221-222`
- **Messages 500 limit**: Acceptable cap with existing comment; pagination can be added later
- **Blueprint `v.any()`**: Already validates typeof + size; duplicating Zod in Convex isn't worth the trade-off

---

## Fix 1: Builder Generation Silent Failure (CRITICAL)

**Problem:** Generation hangs at "Creating your app..." indefinitely with no error feedback. No client-side timeout exists, and the server doesn't send error SSE events on client disconnect.

**Files:**
- `src/features/builder/hooks/use-streaming.ts` (lines 370-456)
- `src/app/api/generate/route.ts` (lines 135-151)

**Changes:**

### Client-side (`use-streaming.ts`):
1. Add constants at top of file:
   ```typescript
   const GENERATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 min overall
   const INACTIVITY_TIMEOUT_MS = 60 * 1000;      // 60s between events
   ```
2. Inside `generate()`, before the `while (true)` read loop (line 424):
   - Create a `let timedOut = false` flag
   - Set overall timeout: `setTimeout(() => { timedOut = true; controller.abort(); }, GENERATION_TIMEOUT_MS)`
   - Set inactivity timeout that resets on every successful `reader.read()`
3. Inside the read loop, after each successful read, reset the inactivity timer
4. In the `catch` block (line 451), check if `timedOut` flag is set:
   - If yes: `dispatch({ type: "ERROR_RESPONSE", error: "Generation timed out — please try again" })`
   - If no and AbortError: return silently (user cancelled)
   - Otherwise: existing error dispatch
5. Add `finally` block to clear both timers

### Server-side (`route.ts`):
6. At line 144-146 (client disconnect branch), add before `failSession()`:
   ```typescript
   try { send("error", { message: "Client disconnected" }); } catch { /* stream already closed */ }
   ```

---

## Fix 2: PIN Hash Timing Attack (HIGH)

**Problem:** PIN comparison uses `===` which is vulnerable to timing attacks.

**File:** `convex/childApps.ts` (lines 162-166)

**Constraint:** File has NO `"use node"` directive (exports queries + mutations), so `crypto.timingSafeEqual` is unavailable. Must use pure-JS constant-time comparison.

**Changes:**
1. Add helper function after `hashPINLegacy()`:
   ```typescript
   /** Constant-time string comparison. Both inputs must be same length (SHA-256 hex = 64 chars). */
   function timingSafeEqual(a: string, b: string): boolean {
     if (a.length !== b.length) return false;
     let result = 0;
     for (let i = 0; i < a.length; i++) {
       result |= a.charCodeAt(i) ^ b.charCodeAt(i);
     }
     return result === 0;
   }
   ```
2. Replace line 163: `newHash === link.kidModePIN` → `timingSafeEqual(newHash, link.kidModePIN)`
3. Replace line 166: `oldHash === link.kidModePIN` → `timingSafeEqual(oldHash, link.kidModePIN)`

---

## Fix 3: Missing patientMaterials Cascade Deletion (HIGH)

**Problem:** `sessions.remove()` cascade-deletes messages, files, apps, flashcards — but NOT `patientMaterials`, leaving orphaned records.

**File:** `convex/sessions.ts` (lines 118-179)

**Changes:**
Insert after the files deletion block (line 150), before apps deletion (line 152):
```typescript
// Cascade-delete patient materials referencing this session
while (true) {
  const batch = await ctx.db
    .query("patientMaterials")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
    .take(200);
  if (batch.length === 0) break;
  for (const mat of batch) {
    await ctx.db.delete(mat._id);
  }
}
```

---

## Fix 4: Share Dialog Perpetual Loading (HIGH)

**Problem:** `isLoading = !shareUrl` stays true forever if shareSlug never populates. No timeout or error state.

**File:** `src/shared/components/share-dialog.tsx` (lines 1-122)

**Changes:**
1. Add `useEffect` import (already imported via `useState` line)
2. Add timeout state after line 30:
   ```typescript
   const [timedOut, setTimedOut] = useState(false);
   ```
3. Add timeout effect after line 34:
   ```typescript
   useEffect(() => {
     if (!open || shareSlug) { setTimedOut(false); return; }
     const timer = setTimeout(() => setTimedOut(true), 10_000);
     return () => clearTimeout(timer);
   }, [open, shareSlug]);
   ```
4. Update the QR code section (lines 74-78):
   ```typescript
   {isLoading && timedOut ? (
     <p className="text-sm text-on-surface-variant text-center">
       Unable to create share link.
       <br />Please close and try again.
     </p>
   ) : isLoading ? (
     <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
   ) : (
     <QRCode value={shareUrl} size={140} />
   )}
   ```
5. Update the URL display text (line 86) to show error state too:
   ```typescript
   {isLoading && timedOut ? "Share link unavailable" : isLoading ? "Creating share link..." : shareUrl}
   ```

---

## Fix 5: Patient Age Validation Too Strict (MEDIUM)

**Problem:** Rejects patients born more than 21 years ago. SLPs work with adults too.

**File:** `convex/patients.ts` (lines 43-45)

**Change:**
```typescript
// Before:
const twentyOneYearsAgo = new Date();
twentyOneYearsAgo.setFullYear(twentyOneYearsAgo.getFullYear() - 21);
if (date < twentyOneYearsAgo) throw new ConvexError("Date of birth must be within the last 21 years");

// After:
const maxAge = new Date();
maxAge.setFullYear(maxAge.getFullYear() - 120);
if (date < maxAge) throw new ConvexError("Date of birth is unreasonably far in the past");
```

---

## Fix 6: Hydration Mismatch (MEDIUM)

**Problem:** `localStorage`-based `useState` initializers cause SSR/CSR mismatch (visible in dev server logs).

**File:** `src/features/builder/components/builder-page.tsx` (lines 50-57)

**Changes:**
Replace localStorage-in-useState pattern with post-hydration effect:
```typescript
// Before:
const [viewMode, setViewMode] = useState<ViewMode>(() => {
  if (typeof window === "undefined") return "preview";
  return (localStorage.getItem("bridges-viewMode") as ViewMode) || "preview";
});

// After:
const [viewMode, setViewMode] = useState<ViewMode>("preview");
const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");

useEffect(() => {
  const savedView = localStorage.getItem("bridges-viewMode") as ViewMode | null;
  const savedDevice = localStorage.getItem("bridges-deviceSize") as DeviceSize | null;
  if (savedView) setViewMode(savedView);
  if (savedDevice) setDeviceSize(savedDevice);
}, []);
```

Apply same pattern to `deviceSize` useState. Ensure the existing localStorage persistence effect doesn't fire on mount (use a `hasMounted` ref guard).

---

## Fix 7: verify-pin Route Missing ID Validation (MEDIUM)

**Problem:** `patientId` cast to `Id<"patients">` without format validation.

**File:** `src/app/api/verify-pin/route.ts` (lines 19-27)

**Change:** Add format check after the null check (line 21):
```typescript
if (!/^[a-z0-9]{32}$/.test(patientId)) {
  return NextResponse.json({ valid: false }, { status: 400 });
}
```

---

## Fix 8: CSP Documentation (LOW — comment only)

**File:** `src/app/api/tool/[slug]/route.ts` (line 35)

**Change:** Add explanatory comment above the CSP header:
```typescript
// CSP trade-off: unsafe-inline required because Parcel bundles inline <script> tags.
// Mitigations: (1) HTML is AI-generated by Claude, not user-authored
// (2) stored in Convex, not user-uploaded (3) connect-src 'none' blocks all network
// (4) frame-ancestors 'self' prevents third-party embedding.
// To eliminate unsafe-inline: configure Parcel to extract scripts to separate files.
```

---

## Implementation Order

| # | Fix | Priority | Files | Complexity |
|---|-----|----------|-------|------------|
| 1 | Builder generation timeout | CRITICAL | use-streaming.ts, route.ts | Medium |
| 2 | PIN timing-safe compare | HIGH | childApps.ts | Low |
| 3 | patientMaterials cascade | HIGH | sessions.ts | Low |
| 4 | Share dialog timeout | HIGH | share-dialog.tsx | Low |
| 5 | Age validation relaxed | MEDIUM | patients.ts | Trivial |
| 6 | Hydration mismatch | MEDIUM | builder-page.tsx | Low |
| 7 | verify-pin ID validation | MEDIUM | verify-pin/route.ts | Trivial |
| 8 | CSP documentation | LOW | tool/[slug]/route.ts | Trivial |

---

## Verification

1. **Unit tests:** `npm test` — verify no regressions across 636 tests
2. **Fix 1:** Start generation, kill API server mid-stream → verify client shows error within 60s
3. **Fix 2:** Verify PIN still works correctly (both new and legacy hash formats)
4. **Fix 3:** Create session with patientMaterials → delete session → verify `npx convex data patientMaterials` shows no orphans
5. **Fix 4:** Open share dialog before app has shareSlug → verify timeout message appears after 10s
6. **Fix 5:** Create patient with DOB 30 years ago → should succeed
7. **Fix 6:** Check dev server logs for hydration mismatch errors → should be gone
8. **Fix 7:** POST to `/api/verify-pin` with invalid patientId → verify 400 response
