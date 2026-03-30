# Code Review Remediation Plan -- 33 Findings in 5 Phases

**Created:** 2026-03-29
**Status:** Draft -- awaiting approval
**Scope:** All 33 findings from the 4-agent security/performance/correctness/quality audit of `src/`

## Context

A parallel code review with 4 specialist agents (security, performance, correctness, quality) identified 33 findings across the Bridges codebase: 2 Critical, 8 High, 13 Medium, 10 Low. The most urgent is a shared `ConvexHttpClient` singleton that can cross-contaminate auth tokens between concurrent requests -- flagged independently by 2 reviewers.

This plan groups fixes into 5 independently-mergeable phases, ordered by blast radius.

## Phase Summary

| Phase | Branch | Findings | Risk if Deferred |
|-------|--------|----------|------------------|
| 1 | `fix/critical-security` | C1, C2, H2, H3, H7, M2, M4 | **Critical** -- auth race, XSS, path traversal |
| 2 | `fix/api-hardening` | H1, H4, H8, M5, M6, M7, L1, L2, L3 | **High** -- validation gaps, PHI safety |
| 3 | `fix/backend-performance` | H5, H6 | **High** -- O(n) queries on every page load |
| 4 | `fix/frontend-correctness` | M1, M8, M9, M10, M11, M12, M13, L5, L9, L10 | **Medium** -- UI bugs, duplication |
| 5 | `fix/code-quality` | L4, L6, L7, L8 | **Low** -- tests, style, imports |

**Dependencies:** Phase 2 depends on Phase 1. Phases 3-5 are independent of each other but all assume Phase 1 is merged.

**Deferred:** M3 (identity.subject -> tokenIdentifier migration) requires a separate project with data migration across all tables.

---

## Phase 1: Critical Security

**7 fixes. Ship ASAP.**

### C1: Shared ConvexHttpClient singleton -- cross-user auth race

**Files:** `src/app/api/generate/route.ts:38`, `generate-soap/route.ts:23`, `generate-report/route.ts:24`

Each file has a module-level `const convex = new ConvexHttpClient(...)`. `setAuth(token)` inside POST mutates shared state -- concurrent requests can cross-contaminate tokens.

**Fix:** In all 3 files, delete the module-level `convex` declaration. Create `const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)` as the first line inside each POST handler. The `anthropic` client is stateless and stays as singleton.

### C2: Legacy sessions bypass all auth

**File:** `convex/lib/auth.ts:31-35`

`assertSessionOwner` returns sessions with `userId === undefined` without any auth check. Any unauthenticated user can read/mutate legacy sessions.

**Fix:**
1. Create migration `convex/seeds/backfill-legacy-sessions.ts` -- query all sessions where userId is undefined, either delete them or assign to a "demo" user
2. Replace the bypass in auth.ts with a rejection: `if (!session.userId) { if (opts?.soft) return null; throw new Error("Legacy session access denied"); }`
3. Run migration before deploying the auth.ts change

### H2: twExtend raw JS injection (XSS)

**File:** `scripts/bundle-worker.mjs:93-110,159`

LLM-generated tailwind config is extracted via naive brace-matching and interpolated raw into a `<script>` tag. A crafted config like `}};alert(1);//{` executes in the browser.

**Fix:** After extraction (line 110), parse and re-serialize:
```js
try {
  const evaluated = new Function(`return (${twExtend})`)();
  twExtend = JSON.stringify(evaluated);
} catch { twExtend = "{}"; }
```

### H3: /api/interview-followup has no auth

**File:** `src/app/api/interview-followup/route.ts` -- POST handler has zero auth checks.

**Fix:** Add at start of POST: `const { userId } = await auth(); if (!userId) return Response.json({ error: "Authentication required" }, { status: 401 });`

Import `auth` from `@clerk/nextjs/server` (matches pattern in generate-soap and generate-report routes).

### H7: generate-soap null check missing

**File:** `src/app/api/generate-soap/route.ts:49-50`

`note.status` accessed without null guard. If `sessionNotes.get` returns null, runtime TypeError crashes with 500.

**Fix:** After the query, add: `if (!note) return new Response(JSON.stringify({ error: "Session note not found" }), { status: 404, headers: { "Content-Type": "application/json" } });`

### M2: list_files tool missing path traversal guard

**File:** `src/features/builder/lib/agent-tools.ts:168-176`

`list_files` joins `ctx.buildDir + directory` but never validates the resolved path stays inside buildDir. `write_file` (line 114) and `read_file` (line 146) both have this guard.

**Fix:** Add after `const fullPath = join(ctx.buildDir, directory)`:
```ts
const resolved = resolve(fullPath);
if (!resolved.startsWith(resolve(ctx.buildDir))) {
  throw new ToolError(`Path traversal blocked: ${directory}`);
}
```

### M4: CORS missing bridgeai-iota.vercel.app

**File:** `convex/http.ts:8-12`

`ALLOWED_ORIGINS` set has `bridges-vibeathon.vercel.app` but not `bridgeai-iota.vercel.app`.

**Fix:** Add `"https://bridgeai-iota.vercel.app"` to the set.

### Phase 1 Verification
- `grep -r "^const convex = new ConvexHttpClient" src/app/api/` returns 0 matches
- `npx vitest run` -- no regressions
- `npx vitest run --config vitest.convex.config.ts` -- passes (add test for userId-less session rejection)
- Manual: call `/api/interview-followup` without auth -- returns 401
- Manual: call `/api/generate-soap` with bad noteId -- returns 404

---

## Phase 2: API Hardening

**9 fixes. Depends on Phase 1.**

### H1: No input validation on SOAP/report routes

**Files:** `generate-soap/route.ts:43-44`, `generate-report/route.ts:44-48`

Both use raw `as { ... }` type casts with no validation.

**Fix:** Add Zod schemas (reuse pattern from `generate/route.ts:81-84`):
- SOAP: `z.object({ sessionNoteId: z.string().min(1) })`
- Report: `z.object({ patientId: z.string().min(1), reportType: z.enum(["weekly-summary", "monthly-summary", "iep-progress-report"]), periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })`

### H4: IP-based rate limiting spoofable

**File:** `src/app/api/generate/route.ts:86-89`

Current logic already prefers `x-real-ip` over `x-forwarded-for`. The real gap is the `"anonymous"` fallback when neither header exists.

**Fix:** Document as accepted risk for authenticated users (Vercel sets x-real-ip). For unauthenticated mode (`ALLOW_UNAUTHENTICATED_GENERATE`), add a comment that CAPTCHA should be required before enabling in production.

### H8: GoalForm silently swallows errors

**File:** `src/features/goals/components/goal-form.tsx:75-108`

`try/finally` with no `catch` -- user gets zero feedback on save failure.

**Fix:** Add `catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save goal"); }` before `finally`.

### M5: tool/[slug] no CSP response header

**File:** `src/app/api/tool/[slug]/route.ts:30-35`

AI-generated HTML served with only `Content-Type` and `Cache-Control` headers. The CSP is only in the HTML meta-tag.

**Fix:** Add `Content-Security-Policy` response header matching the meta-tag CSP from `bundle-worker.mjs:158`.

### M6: PHI in LLM prompts unsanitized

**Files:** `src/features/session-notes/lib/soap-prompt.ts`, `src/features/goals/lib/progress-prompt.ts`

Patient data (names, DOB, clinical notes) interpolated raw into prompts.

**Fix:**
1. Wrap patient data sections in `<patient_data>` XML tags (injection-resistant framing)
2. Add truncation helper: `const trunc = (s: string, max = 500) => s.length > max ? s.slice(0, max) + "..." : s;`
3. Apply to: `sensoryNotes`, `behavioralNotes`, `parentFeedback`, target `notes`, `fullGoalText`

### M7: Post-index .filter() on caregiverLinks

**File:** `convex/lib/auth.ts:86-91`

`assertCaregiverAccess` uses `by_caregiverUserId` + two `.filter()` calls. The compound index `by_caregiverUserId_patientId` already exists (schema line 179) but isn't used here.

**Fix:** Rewrite to use the compound index, check `inviteStatus` on the single result:
```ts
const link = await ctx.db.query("caregiverLinks")
  .withIndex("by_caregiverUserId_patientId", (q) =>
    q.eq("caregiverUserId", userId).eq("patientId", patientId))
  .first();
if (!link || link.inviteStatus !== "accepted") throw new ConvexError("Not authorized");
```

### L1: Undocumented ALLOW_UNAUTHENTICATED_GENERATE

**File:** `src/app/api/generate/route.ts:66`

**Fix:** Add inline comment documenting the env var. Add to `.env.local.example` with a "DEV ONLY" warning.

### L2: listByPatient returns inviteToken

**File:** `convex/caregivers.ts:161-164`

**Fix:** Map results to strip inviteToken: `return links.map(({ inviteToken, ...rest }) => rest);`

### L3: setBlueprint accepts v.any()

**File:** `convex/sessions.ts:212`

**Fix:** This is a schema change requiring widen-then-narrow migration. For now, add a runtime check in the mutation handler: validate blueprint is a non-null object. Full schema migration deferred to Phase 5.

### Phase 2 Verification
- Send malformed JSON to SOAP/report endpoints -- returns 400 with descriptive errors
- `npx tsc --noEmit` passes
- Fetch `/api/tool/<slug>` -- CSP response header present
- Family portal caregiver access still works (M7 change)

---

## Phase 3: Backend Performance

**2 fixes. Independent of Phase 2.**

### H5: patients.list, getStats, getUnreadCount -- fetch 500, filter in JS

**Files:** `convex/schema.ts:164`, `convex/patients.ts:62-79,274-292`

Patients table only has `by_slpUserId` index. Every dashboard load scans up to 500 documents.

**Fix:**
1. **Schema:** Add `.index("by_slpUserId_status", ["slpUserId", "status"])` to patients table
2. **patients.list:** When `args.status` provided, use compound index; otherwise fall back to `by_slpUserId`
3. **getStats:** Replace single fetch + 4 JS filters with 4 indexed queries (one per status)
4. **getUnreadCount:** Leave as-is with TODO comment -- messages per patient typically <100

### H6: apps.list uses wrong index

**File:** `convex/apps.ts:92-104`

Uses `by_created` (global sort) then filters by userId in JS. The `by_user` index exists (schema line 53) but isn't used.

**Fix:** Replace with `.withIndex("by_user", (q) => q.eq("userId", identity.subject)).order("desc").take(50)`. One-line change.

### Phase 3 Verification
- `npx convex dev` succeeds with new index
- `convex/__tests__/patients.test.ts` passes + add test for status-filtered list
- My Tools page loads correctly (H6)
- Monitor Convex dashboard for reduced document reads

---

## Phase 4: Frontend Correctness

**10 fixes. Independent of Phases 2-3.**

| # | Finding | File | Fix |
|---|---------|------|-----|
| M1 | InviteLanding infinite retry | `invite-landing.tsx:25-38` | Add `useRef(false)` guard for accept attempt |
| M8 | EngagementSummary /7 denominator | `engagement-summary.tsx:95` | Calculate elapsed days in current week |
| M9 | HomeProgramForm date validation | `home-program-form.tsx:50-88` | Add `endDate >= startDate` check |
| M10 | Cross-feature imports | `structured-data-form.tsx:13` | Promote `useActiveGoals` to `src/shared/hooks/` |
| M11 | Duplicate calculateAge | `structured-data-form.tsx:42` | Delete local copy, use `formatAge` from patient-utils |
| M12 | Diagnosis maps 4x duplicated | 4 files | Create `src/shared/lib/diagnosis.ts` single source of truth |
| M13 | `api as any` in family hooks | 3 family hooks | Run `npx convex dev`, remove casts |
| L5 | Hardcoded gradient hex | 5 files, 6 occurrences | Replace `from-[#00595c] to-[#0d7377]` with `bg-primary-gradient` |
| L9 | APP_NAME inconsistency | dashboard-view, landing-footer | Import `APP_NAME` from `@/core/config` |
| L10 | Stale closure + bare img | session-note-editor.tsx | Use ref for noteId; replace `<img>` with `<Image>` |

### Phase 4 Verification
- `npx tsc --noEmit` passes (especially after M13 removes `as any`)
- `npx vitest run` -- no regressions
- Manual: invite flow fires acceptInvite exactly once
- Manual: engagement summary shows "X/3" on Wednesday

---

## Phase 5: Code Quality (Deferrable)

**4 fixes. Fully independent.**

| # | Finding | Action |
|---|---------|--------|
| L4 | Zero tests for flashcards/patients | Add smoke tests for key components + utility functions |
| L6 | Mixed shadcn + Material tokens | Document as accepted dual-system. No code change. |
| L7 | tool-card/type-badge in shared/ | Leave in shared -- they're reusable design primitives |
| L8 | Deep relative convex imports | Add `@convex/*` path alias to tsconfig.json; codemod imports |

---

## Pre-flight Checklist

Before starting any phase:
- [ ] `npx vitest run` -- note baseline failures
- [ ] `npx vitest run --config vitest.convex.config.ts` -- note baseline
- [ ] `npx tsc --noEmit` -- note baseline
- [ ] Each phase gets its own worktree branch from latest `main`

## Deferred

**M3: identity.subject -> tokenIdentifier** -- Requires data migration across every table storing `userId`, coordinated Clerk JWT template changes, and significant auth flow testing. Plan as a separate project after all 5 phases complete.
