# Code Review Remediation Plan — 33 Findings in 5 Phases

**Created:** 2026-03-29
**Status:** Draft — awaiting approval
**Scope:** All 33 findings from the Bridges security/performance audit

---

## Overview

Each phase is a single worktree branch that can be reviewed and merged independently.
Phases are ordered by blast radius (security > correctness > performance > quality) so
that the most dangerous issues are resolved first regardless of whether later phases slip.

| Phase | Branch Name | Findings | Risk if Deferred |
|-------|-------------|----------|------------------|
| 1 | `fix/critical-security` | C1, C2, H2, H3, H7, M2, M4 | **Critical** — auth race, XSS, unauthed endpoints |
| 2 | `fix/api-hardening` | H1, H4, H8, M5, M6, M7, L1, L2, L3 | **High** — input validation gaps, PHI leakage |
| 3 | `fix/backend-performance` | H5, H6 | **High** — O(n) queries on every dashboard load |
| 4 | `fix/frontend-correctness` | M1, M8, M9, M10, M11, M12, M13, L5, L9, L10 | **Medium** — UI bugs, duplication, type safety |
| 5 | `fix/code-quality` | L4, L6, L7, L8 | **Low** — tests, style consistency, import hygiene |

**Dependencies:** Phase 2 assumes Phase 1 is merged (auth patterns established). Phase 3
and Phase 4 are independent of each other but both assume Phase 1. Phase 5 is fully
independent.

---

## Phase 1: Critical Security

**Branch:** `fix/critical-security`
**Priority:** Ship within 24h. Every hour this is unmerged, cross-user auth races are possible.

### C1: ConvexHttpClient singleton — cross-user auth race

**Problem confirmed.** Lines 38, 23, and 24 respectively create module-level `const convex = new ConvexHttpClient(...)`. When `convex.setAuth(token)` is called inside a POST handler, it mutates this shared singleton. Under concurrent requests, request A's Convex calls can execute with request B's auth token.

**Files to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/app/api/generate/route.ts`**
   - Delete line 38 (`const convex = new ConvexHttpClient(...)`)
   - Inside `POST()` (after line 61), create a local client:
     ```
     const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
     ```
   - Move the `convex.setAuth(token)` call to use this local instance (it already does, but now it's scoped per-request)
   - Note: the `anthropic` client on line 40 is stateless and safe to keep as a singleton.

2. **`/Users/desha/Springfield-Vibeathon/src/app/api/generate-soap/route.ts`**
   - Delete line 23 (`const convex = ...`)
   - Add local `const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);` as first line inside `POST()`, before the `auth()` call on line 27.

3. **`/Users/desha/Springfield-Vibeathon/src/app/api/generate-report/route.ts`**
   - Delete line 24 (`const convex = ...`)
   - Add local `const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);` as first line inside `POST()`, before the `auth()` call on line 28.

**Verification:**
- `grep -r "^const convex = new ConvexHttpClient" src/app/api/` should return zero matches after the fix.
- Each route's POST handler should have a local `const convex = ...` inside the function body.
- Existing Convex test suite passes (`npx vitest run --config vitest.convex.config.ts`).

---

### C2: Legacy sessions bypass all auth

**Problem confirmed.** `/Users/desha/Springfield-Vibeathon/convex/lib/auth.ts` lines 33-34: when `session.userId` is falsy (undefined), `assertSessionOwner` returns the session without any auth check. Any unauthenticated user can read/mutate any legacy session.

**Files to modify:**

1. **`/Users/desha/Springfield-Vibeathon/convex/lib/auth.ts`**
   - Replace lines 32-35 (the legacy bypass) with a rejection:
     ```typescript
     // Legacy sessions without a userId are not accessible.
     // Run the backfill migration (seeds/backfill-legacy-sessions) before deploying.
     if (!session.userId) {
       if (opts?.soft) return null;
       throw new Error("Session has no owner — legacy session access denied");
     }
     ```

2. **Create a one-time migration** (new file: `/Users/desha/Springfield-Vibeathon/convex/seeds/backfill-legacy-sessions.ts`):
   - Query all sessions where `userId === undefined`.
   - Either delete them or assign them to a designated "demo" userId.
   - This migration should be run before deploying the auth.ts change.

**Verification:**
- Run existing test `convex/__tests__/sessions.test.ts` — it already tests cross-user access. Add a new test case for a session with `userId: undefined` and verify it throws.
- Manual test: attempt to access a legacy session while unauthenticated — should get 401.

---

### H2: `twExtend` raw JS injection (XSS)

**Problem confirmed.** `/Users/desha/Springfield-Vibeathon/scripts/bundle-worker.mjs` line 159: the `twExtend` variable (extracted from an LLM-generated `tailwind.config.js`) is interpolated raw into a `<script>` tag:
```
window.tailwind = { config: { darkMode: ["class"], theme: { extend: ${twExtend} } } };
```
If the LLM writes `}};alert(1);//` inside the tailwind config's extend block, it executes in the user's browser.

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/scripts/bundle-worker.mjs`**
   - After line 105 (where `twExtend` is extracted), parse and re-serialize:
     ```javascript
     // Sanitize: parse as JSON5-ish object, then re-serialize safely
     try {
       // twExtend is a JS object literal like { colors: { ... } }
       // Use Function constructor to evaluate it in an isolated scope,
       // then JSON.stringify the result.
       const evaluated = new Function(`return (${twExtend})`)();
       twExtend = JSON.stringify(evaluated);
     } catch {
       twExtend = "{}"; // fallback to empty extend on parse failure
     }
     ```
   - This ensures only valid JSON data (no executable code) reaches the `<script>` tag.

**Verification:**
- Write a test tailwind.config.js containing `extend: { }};alert("xss");//{` and verify the bundle output contains only `JSON.stringify`'d data, not raw script.
- Existing bundle tests should still produce valid HTML.

---

### H3: `/api/interview-followup` has no auth

**Problem confirmed.** `/Users/desha/Springfield-Vibeathon/src/app/api/interview-followup/route.ts` line 61: the POST handler does not call `auth()` from Clerk. Anyone can call this endpoint.

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/app/api/interview-followup/route.ts`**
   - Add Clerk auth import at top: `import { auth } from "@clerk/nextjs/server";`
   - At the start of `POST()` (line 62, before JSON parsing), add:
     ```typescript
     const { userId } = await auth();
     if (!userId) {
       return Response.json({ error: "Authentication required" }, { status: 401 });
     }
     ```
   - This matches the pattern used in `generate-soap/route.ts` and `generate-report/route.ts`.

**Verification:**
- `curl -X POST /api/interview-followup` without auth headers returns 401.
- Authenticated request with valid Clerk session returns 200 as before.

---

### H7: `generate-soap` null check missing

**Problem confirmed.** `/Users/desha/Springfield-Vibeathon/src/app/api/generate-soap/route.ts` line 49-50: `note` is used without null check. If `sessionNotes.get` returns null, `note.status` throws at runtime.

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/app/api/generate-soap/route.ts`**
   - After line 49 (`const note = await convex.query(...)`), add:
     ```typescript
     if (!note) {
       return new Response(JSON.stringify({ error: "Session note not found" }), {
         status: 404,
         headers: { "Content-Type": "application/json" },
       });
     }
     ```

**Verification:**
- Call the endpoint with a non-existent sessionNoteId — should return 404 JSON, not a 500 crash.

---

### M2: `list_files` tool missing path traversal guard

**Problem confirmed.** `/Users/desha/Springfield-Vibeathon/src/features/builder/lib/agent-tools.ts` lines 168-176: the `list_files` tool does `join(ctx.buildDir, directory)` but never checks that the resolved path stays inside `ctx.buildDir`. The `write_file` (line 114-117) and `read_file` (line 146-148) tools both have this guard, but `list_files` does not.

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/features/builder/lib/agent-tools.ts`**
   - In the `list_files` tool's `run` handler (line 168), add after `const fullPath = join(ctx.buildDir, directory);`:
     ```typescript
     const resolved = resolve(fullPath);
     if (!resolved.startsWith(resolve(ctx.buildDir))) {
       throw new ToolError(`Path traversal blocked: ${directory}`);
     }
     ```

**Verification:**
- Unit test: call `list_files` with `directory: "../../etc"` and verify it throws `ToolError`.

---

### M4: CORS missing `bridgeai-iota.vercel.app`

**Problem noted.** `/Users/desha/Springfield-Vibeathon/convex/http.ts` lines 8-12: `ALLOWED_ORIGINS` set does not include the production iota domain.

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/convex/http.ts`**
   - Add `"https://bridgeai-iota.vercel.app"` to the `ALLOWED_ORIGINS` set on line 8-12.
   - Consider also adding a wildcard pattern for Vercel preview URLs if those are used for QA.

**Verification:**
- `curl -H "Origin: https://bridgeai-iota.vercel.app" ...` returns the correct `Access-Control-Allow-Origin` header.

---

## Phase 2: API Hardening

**Branch:** `fix/api-hardening`
**Depends on:** Phase 1 merged (auth patterns established)

### H1: No input validation on SOAP/report routes

**Files to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/app/api/generate-soap/route.ts`**
   - Replace the raw cast on lines 43-44 with a Zod schema:
     ```typescript
     const SoapInputSchema = z.object({
       sessionNoteId: z.string().min(1),
     });
     ```
   - Use `SoapInputSchema.safeParse(body)` with proper error response, matching the pattern in `generate/route.ts` lines 81-83.

2. **`/Users/desha/Springfield-Vibeathon/src/app/api/generate-report/route.ts`**
   - Replace the raw cast on lines 44-48 with a Zod schema:
     ```typescript
     const ReportInputSchema = z.object({
       patientId: z.string().min(1),
       reportType: z.enum(["weekly-summary", "monthly-summary", "iep-progress-report"]),
       periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
       periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
     });
     ```

**Verification:**
- Send malformed JSON to both endpoints and verify 400 responses with descriptive error messages.
- Send valid requests and verify they still work end-to-end.

---

### H4: IP-based rate limiting spoofable

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/app/api/generate/route.ts`**
   - Lines 86-89: change IP extraction to use only the first entry from `x-forwarded-for` (which represents the client IP from the trusted proxy), and prefer `x-real-ip` (set by Vercel):
     ```typescript
     const rateLimitKey = clerkUserId
       ?? request.headers.get("x-real-ip")
       ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
       ?? "anonymous";
     ```
   - This is actually already the current logic (confirmed at lines 86-89). The audit finding notes the `x-forwarded-for` chain is spoofable. The real fix is: for unauthenticated requests, the `"anonymous"` fallback means all users behind a proxy without `x-real-ip` share one bucket. Consider adding a stricter per-IP limit or requiring CAPTCHA for unauthenticated generation. Document this as an accepted risk or add CAPTCHA.

**Verification:**
- Send requests with spoofed `x-forwarded-for` headers and verify rate limiting still applies via `x-real-ip`.

---

### H8: `GoalForm` swallows errors silently

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/features/goals/components/goal-form.tsx`**
   - Lines 75-108: the `try...finally` block has no `catch`. Add a catch before `finally`:
     ```typescript
     } catch (err) {
       toast.error(
         err instanceof Error ? err.message : "Failed to save goal"
       );
     } finally {
     ```

**Verification:**
- Simulate a network error and verify a toast appears.

---

### M5: Tool/[slug] no CSP response header

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/app/api/tool/[slug]/route.ts`**
   - Lines 30-33: add a CSP header to the Response that matches the meta-tag CSP already embedded in the bundle HTML (see `bundle-worker.mjs` line 158):
     ```typescript
     return new Response(html, {
       status: 200,
       headers: {
         "Content-Type": "text/html; charset=utf-8",
         "Cache-Control": "public, max-age=60, s-maxage=300",
         "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src blob: data: https:; connect-src blob: data:; frame-ancestors 'none';",
       },
     });
     ```

**Verification:**
- Fetch a published tool page and verify the `Content-Security-Policy` response header is present.

---

### M6: PHI in LLM prompts unsanitized

**Files to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/features/session-notes/lib/soap-prompt.ts`**
   - Wrap patient data interpolation in XML tags to prevent prompt injection:
     ```typescript
     const patientContext = `<patient_data>
     ${/* existing fields */}
     </patient_data>`;
     ```
   - Truncate free-text fields (`sensoryNotes`, `behavioralNotes`, `parentFeedback`, target `notes`) to 500 chars using a helper: `const truncate = (s: string, max = 500) => s.length > max ? s.slice(0, max) + "..." : s;`
   - Apply to lines 58 (`sensoryNotes`), 60 (`behavioralNotes`), 86 (`notes`), 93-99 (additional notes).

2. **`/Users/desha/Springfield-Vibeathon/src/features/goals/lib/progress-prompt.ts`**
   - Same pattern: wrap patient data section (lines 49-58) in `<patient_data>` XML tags.
   - Truncate `fullGoalText` (line 69) to 500 chars.
   - Truncate `previousNarrative` (line 89) to 1000 chars.

**Verification:**
- Create a patient with a very long (>500 char) sensory note and generate a SOAP note. Verify the prompt is truncated in logs.

---

### M7: Post-index `.filter()` on caregiverLinks

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/convex/lib/auth.ts`**
   - Lines 86-91: `assertCaregiverAccess` uses `.withIndex("by_caregiverUserId")` then two `.filter()` calls. The compound index `by_caregiverUserId_patientId` already exists in the schema (line 179 of schema.ts). Rewrite to:
     ```typescript
     const link = await ctx.db
       .query("caregiverLinks")
       .withIndex("by_caregiverUserId_patientId", (q) =>
         q.eq("caregiverUserId", userId).eq("patientId", patientId)
       )
       .first();
     if (!link || link.inviteStatus !== "accepted") {
       throw new ConvexError("Not authorized to access this patient");
     }
     ```
   - This eliminates the JS-side `.filter()` calls. The `inviteStatus` check is done on the single returned document.

**Verification:**
- Existing caregiver access tests in `convex/__tests__/caregivers.test.ts` should still pass.

---

### L1: Undocumented `ALLOW_UNAUTHENTICATED_GENERATE` env var

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/app/api/generate/route.ts`**
   - Add a comment at line 66 documenting the env var's purpose.
   - Optionally: add to a `.env.example` or README with a warning that it should never be set in production.

---

### L2: `listByPatient` returns inviteToken

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/convex/caregivers.ts`**
   - Lines 161-164: the query returns all fields including `inviteToken`. Map the results to strip it:
     ```typescript
     const links = await ctx.db.query("caregiverLinks")
       .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
       .take(50);
     return links.map(({ inviteToken, ...rest }) => rest);
     ```

**Verification:**
- Query `caregivers.listByPatient` and verify the response objects have no `inviteToken` field.

---

### L3: `setBlueprint` accepts `v.any()`

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/convex/sessions.ts`**
   - Line 212: replace `blueprint: v.any()` with a more specific validator. Since the blueprint shape is validated via Zod at the app layer, at minimum constrain it to `v.object({...})` with the top-level fields, or use a `v.record(v.string(), v.any())` to prevent non-object values.
   - Note: The schema.ts field `blueprint: v.optional(v.any())` on line 14 would also need updating. Since this is a schema change, it should use a widen-then-narrow migration if existing data doesn't match the new shape.

**Verification:**
- Existing test `convex/__tests__/sessions.test.ts` line 82 (`setBlueprint stores blueprint data`) should still pass.

---

## Phase 3: Backend Performance

**Branch:** `fix/backend-performance`
**Depends on:** Phase 1 merged (no functional dependency, but avoids merge conflicts in convex/)

### H5: `patients.list`, `getStats`, and `getUnreadCount` fetch 500 + filter in JS

**Files to modify:**

1. **`/Users/desha/Springfield-Vibeathon/convex/schema.ts`**
   - Add compound index to `patients` table (after line 164):
     ```typescript
     .index("by_slpUserId_status", ["slpUserId", "status"])
     ```
   - Note: `patientMessages` table does not have a `readAt` index. For `getUnreadCount`, the current approach is acceptable for now since messages per patient are typically <100. A denormalized counter is a future optimization.

2. **`/Users/desha/Springfield-Vibeathon/convex/patients.ts`**
   - **`list`** (lines 62-79): When `args.status` is provided, use the compound index:
     ```typescript
     if (args.status) {
       return await ctx.db
         .query("patients")
         .withIndex("by_slpUserId_status", (q) =>
           q.eq("slpUserId", userId).eq("status", args.status!)
         )
         .take(500);
     }
     return await ctx.db
       .query("patients")
       .withIndex("by_slpUserId", (q) => q.eq("slpUserId", userId))
       .take(500);
     ```
   - **`getStats`** (lines 274-292): Replace single fetch + 4 filters with 4 indexed count queries:
     ```typescript
     const statuses = ["active", "on-hold", "discharged", "pending-intake"] as const;
     const counts = await Promise.all(
       statuses.map(async (status) => {
         const results = await ctx.db
           .query("patients")
           .withIndex("by_slpUserId_status", (q) =>
             q.eq("slpUserId", userId).eq("status", status)
           )
           .take(500);
         return results.length;
       })
     );
     return {
       active: counts[0],
       onHold: counts[1],
       discharged: counts[2],
       pendingIntake: counts[3],
     };
     ```
   - This reads fewer total documents when the SLP has patients across multiple statuses, and each query uses the index fully.

3. **`/Users/desha/Springfield-Vibeathon/convex/patientMessages.ts`**
   - **`getUnreadCount`** (lines 74-92): Leave as-is for now. The `.take(500)` on `by_patientId_timestamp` is already indexed. The JS filter for `readAt === undefined` is on a small result set per patient. Add a `// TODO: denormalize into a counter for scale` comment.

**Verification:**
- `npx convex dev` succeeds with the new index.
- Run `convex/__tests__/patients.test.ts` — all existing tests pass.
- Add a new test: create patients with different statuses and verify `list({ status: "active" })` returns only active patients.

---

### H6: `apps.list` uses wrong index

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/convex/apps.ts`**
   - Lines 92-103: Replace:
     ```typescript
     const all = await ctx.db
       .query("apps")
       .withIndex("by_created")
       .order("desc")
       .take(50);
     return all.filter((app) => app.userId === identity.subject);
     ```
     With:
     ```typescript
     return await ctx.db
       .query("apps")
       .withIndex("by_user", (q) => q.eq("userId", identity.subject))
       .order("desc")
       .take(50);
     ```
   - Note: The `by_user` index exists in the schema (line 53 of schema.ts). The `order("desc")` will order by `_creationTime` within the index range, which preserves the "most recent first" behavior.

**Verification:**
- Run `convex/__tests__/apps.test.ts`.
- Manual test: verify the my-tools page still loads apps in descending creation order.

---

## Phase 4: Frontend Correctness

**Branch:** `fix/frontend-correctness`
**Depends on:** Phase 1 merged (for auth.ts changes)

### M1: InviteLanding infinite retry loop

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/features/patients/components/invite-landing.tsx`**
   - Lines 25-38: The `useEffect` fires repeatedly because `isAccepting` is set to `true` after the call starts, but if the component re-renders for other reasons the effect can fire again. Add a `useRef` guard:
     ```typescript
     const acceptAttemptedRef = useRef(false);
     
     useEffect(() => {
       if (isLoaded && isSignedIn && inviteInfo && !acceptAttemptedRef.current) {
         acceptAttemptedRef.current = true;
         setIsAccepting(true);
         acceptInvite({ token })
           .then(() => {
             toast.success("You're connected!");
             router.push("/dashboard");
           })
           .catch(() => {
             toast.error("Failed to accept invite");
             setIsAccepting(false);
             acceptAttemptedRef.current = false; // allow retry on explicit action
           });
       }
     }, [isLoaded, isSignedIn, inviteInfo, token, acceptInvite, router]);
     ```

**Verification:**
- Test the invite flow: sign up via invite link, verify `acceptInvite` is called exactly once.

---

### M8: EngagementSummary hardcoded /7

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/features/patients/components/engagement-summary.tsx`**
   - Line 95: Replace `{daysPracticed}/7` with a dynamically calculated denominator:
     ```typescript
     // Calculate elapsed days in the current week (1 = Monday, up to 7 = Sunday)
     const now = new Date();
     const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
     const elapsedDays = dayOfWeek === 0 ? 7 : dayOfWeek; // Mon=1 through Sun=7
     ```
     Then render: `{daysPracticed}/{elapsedDays}`

**Verification:**
- On a Wednesday, the display should show "X/3" not "X/7".

---

### M9: HomeProgramForm no date validation

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/features/patients/components/home-program-form.tsx`**
   - Lines 50-88: After the existing validation checks (lines 53-68), add:
     ```typescript
     if (endDate && endDate < startDate) {
       toast.error("End date must be on or after start date");
       return;
     }
     ```

**Verification:**
- Set endDate before startDate in the form and verify the toast error appears and submission is blocked.

---

### M10: Cross-feature imports violate VSA

**Files to review:**

1. **`/Users/desha/Springfield-Vibeathon/src/features/session-notes/components/structured-data-form.tsx`** line 13: imports from `@/features/goals/hooks/use-goals`.
2. **`/Users/desha/Springfield-Vibeathon/src/features/patients/components/patient-detail-page.tsx`** line 11: imports from `@/features/session-notes/components/session-notes-list`.

**Decision:** The patient-detail page is a hub that composes multiple features — this is an accepted pattern for "hub pages." The goals import from session-notes is a tighter coupling. Since `useActiveGoals` is used by 2+ features (goals + session-notes), promote it:

1. **`/Users/desha/Springfield-Vibeathon/src/shared/hooks/use-goals.ts`** (new file)
   - Move the `useActiveGoals` hook from `src/features/goals/hooks/use-goals.ts` to shared.
   - Re-export from the original location for backward compatibility.
2. Update the import in `structured-data-form.tsx` to `@/shared/hooks/use-goals`.

**Verification:**
- `npx tsc --noEmit` passes.
- The session note editor still shows the goals dropdown.

---

### M11: Duplicate `calculateAge`

**Files involved:**

- `/Users/desha/Springfield-Vibeathon/src/features/session-notes/components/structured-data-form.tsx` lines 42-58: local `calculateAge` that returns a string like "5y 3mo".
- `/Users/desha/Springfield-Vibeathon/src/features/patients/lib/patient-utils.ts` lines 1-10 and 12-21: `calculateAge` (returns number) and `formatAge` (returns string).

**Fix:**

1. **`/Users/desha/Springfield-Vibeathon/src/features/patients/lib/patient-utils.ts`**
   - Enhance `formatAge` to match the richer "5y 3mo" format from structured-data-form.tsx (currently it only does "5y" or "18mo").

2. **`/Users/desha/Springfield-Vibeathon/src/features/session-notes/components/structured-data-form.tsx`**
   - Delete the local `calculateAge` function (lines 42-58).
   - Import `formatAge` from `@/features/patients/lib/patient-utils` (or from shared if promoted in M10).

**Verification:**
- The structured data form header still shows patient age correctly.
- `formatAge("2024-06-15")` returns "1y 9mo" (not just "1y").

---

### M12: Diagnosis maps duplicated

**Files involved:**

- `/Users/desha/Springfield-Vibeathon/src/features/patients/lib/diagnosis-colors.ts` — `DIAGNOSIS_COLORS` with `.label` field
- `/Users/desha/Springfield-Vibeathon/src/features/session-notes/components/structured-data-form.tsx` lines 60-67 — local `diagnosisLabels` map

**Fix:**

1. **Create `/Users/desha/Springfield-Vibeathon/src/shared/lib/diagnosis.ts`** (new file):
   - Single source of truth for diagnosis labels, colors, and status labels.
   - Export `DIAGNOSIS_LABELS`, `DIAGNOSIS_COLORS`, `STATUS_COLORS`, etc.

2. **Update imports in:**
   - `src/features/patients/lib/diagnosis-colors.ts` — re-export from shared.
   - `src/features/session-notes/components/structured-data-form.tsx` — import from shared, delete local `diagnosisLabels`.
   - `src/features/patients/components/patient-row.tsx`
   - `src/features/patients/components/patient-profile-widget.tsx`

**Verification:**
- All components rendering diagnosis badges still show correct labels/colors.
- `grep -r "diagnosisLabels" src/features/session-notes/` returns zero matches.

---

### M13: `api as any` casting in family hooks

**Files to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/features/family/hooks/use-family-data.ts`** — remove `as any` cast (line 12)
2. **`/Users/desha/Springfield-Vibeathon/src/features/family/hooks/use-practice-log.ts`** — remove `as any` cast (line 12)
3. **`/Users/desha/Springfield-Vibeathon/src/features/family/hooks/use-messages.ts`** — remove `as any` cast (line 12)

**Prerequisite:** Run `npx convex dev` to regenerate types. The comments in these files say "may not yet include these modules" — but all referenced Convex functions (`homePrograms.getActiveByPatient`, `practiceLog.getStreakData`, etc.) now exist.

After regenerating types:
- Replace `const extendedApi = api as any;` with direct `api` usage.
- Remove the eslint-disable comments.
- Remove manual type casts on return values.

**Verification:**
- `npx tsc --noEmit` passes without the `as any` casts.
- Family dashboard loads correctly.

---

### L5: Hardcoded gradient hex values

**Scope:** 29 files contain hardcoded hex values. This is a broader cleanup. For this phase, address only the most repeated pattern — gradient hex codes that should use CSS custom properties or Tailwind tokens.

**Action:** Document the instances and create a follow-up task. Do not block this phase on full cleanup.

---

### L9: APP_NAME inconsistency

**File:** `/Users/desha/Springfield-Vibeathon/src/core/config.ts` defines `APP_NAME = "Bridges"`.

**Check all hardcoded "Bridges" strings in the codebase and replace with the config import where appropriate. Low risk, purely cosmetic.**

---

### L10: SessionNoteEditor stale closure, eslint suppressions, bare `<img>` tags

**File to modify:**

1. **`/Users/desha/Springfield-Vibeathon/src/features/session-notes/components/session-note-editor.tsx`**
   - Audit eslint-disable comments and remove any that are no longer needed.
   - Replace bare `<img>` tags with Next.js `<Image>` component.
   - Check for stale closures in useEffect/useCallback dependencies.

**Verification:**
- `npx eslint src/features/session-notes/` produces no warnings.

---

## Phase 5: Code Quality

**Branch:** `fix/code-quality`
**Depends on:** None (fully independent)

### L4: Flashcards/patients have zero tests

**Action:**
- Add at minimum smoke tests for:
  - `convex/__tests__/flashcard_cards.test.ts` (CRUD operations)
  - `convex/__tests__/flashcard_decks.test.ts` (CRUD operations)
  - Frontend: `src/features/flashcards/components/__tests__/` (render tests)
- Use existing test patterns from `convex/__tests__/sessions.test.ts` as reference.

---

### L6: Mixed shadcn + Material tokens

**Action:** This is a design system concern. Document the current state:
- Material Design Icons via `MaterialIcon` component in shared
- shadcn/ui components in `src/shared/components/ui/`
- Both systems coexist intentionally for different purposes
- No code change needed — add a note in CLAUDE.md or a design-system doc.

---

### L7: tool-card/type-badge in shared/ used by <3 features

**Files:**
- `/Users/desha/Springfield-Vibeathon/src/shared/components/tool-card.tsx`
- `/Users/desha/Springfield-Vibeathon/src/shared/components/type-badge.tsx`

**Action:** These are fine in shared if they represent reusable design primitives. No move needed. Add a comment if desired.

---

### L8: Deep relative Convex imports

**Pattern:** Files like `../../../../convex/_generated/api` appear throughout `src/`.

**Action:**
- These are standard for Convex projects without path aliasing.
- If desired, add a path alias in `tsconfig.json`:
  ```json
  "paths": {
    "@convex/*": ["./convex/*"]
  }
  ```
- Low priority — cosmetic improvement only.

---

## Execution Checklist

### Pre-flight
- [ ] Run full test suite to establish baseline: `npx vitest run`
- [ ] Run Convex tests: `npx vitest run --config vitest.convex.config.ts`
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Note any pre-existing failures

### Per-Phase
- [ ] Create worktree branch from latest `main`
- [ ] Implement all changes in the phase
- [ ] Run full test suite — no regressions
- [ ] Run `npx tsc --noEmit` — no new type errors
- [ ] Run `npx eslint .` — no new warnings
- [ ] Manual smoke test of affected flows
- [ ] Open PR with phase label
- [ ] Get review + merge before starting next phase

### Phase 1 Specific
- [ ] Before deploying C2 fix: run legacy session backfill migration
- [ ] After deploying C1 fix: monitor Convex logs for auth errors (should be zero)

### Phase 3 Specific
- [ ] After deploying new index: verify via `npx convex dashboard` that the index is active
- [ ] Monitor Convex function metrics for reduced document reads

---

## Deferred Items (M3)

**M3: `identity.subject` used instead of `tokenIdentifier`** is explicitly scoped out of all phases. This requires:
1. A data migration to update every `userId` field in every table
2. Coordinated Clerk JWT template changes
3. Significant testing across all auth flows

This should be planned as a separate project after all 5 phases are complete.
