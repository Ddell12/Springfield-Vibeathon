# Plan: Standalone Speech Coach (Try-It-Now Mode)

## Context

The speech coach currently requires a linked patient + an SLP-created home program before anyone can use it. This means:
- **Caregivers** can't try it until their child's SLP sets up a speech-coach program
- **SLPs** are explicitly blocked from creating sessions (`createSession` throws for SLPs)
- The feature with the most demo appeal is the hardest to reach

**Goal:** Make the speech coach immediately usable by any authenticated user (SLP or caregiver) with zero prerequisites. The existing patient-integrated clinical flow remains untouched.

## Approach: Dual-Mode Architecture

Add a **standalone mode** alongside the existing **clinical mode**. Same ElevenLabs agent, same config UI, same Claude analysis — just without patient/program coupling.

| Aspect | Clinical (existing) | Standalone (new) |
|--------|-------------------|-----------------|
| Route | `/family/[patientId]/speech-coach?program=X` | `/speech-coach` |
| Auth | `assertCaregiverAccess` (caregiver-only) | Any authenticated user |
| Patient | Required | None |
| Home Program | Required | None |
| Analysis | Full (progress + practice log + goal) | Progress only (no practice log/goal) |
| Session scoping | By patientId | By userId |

---

## Step 1: Schema Changes

**File:** `convex/schema.ts` (lines 457-510)

### speechCoachSessions table
- `patientId`: `v.id("patients")` → `v.optional(v.id("patients"))`
- `homeProgramId`: `v.id("homePrograms")` → `v.optional(v.id("homePrograms"))`
- `caregiverUserId`: rename semantically to keep, but add `userId: v.string()` (the authenticated user who ran it — works for both roles)
- Add `mode: v.optional(v.union(v.literal("standalone"), v.literal("clinical")))` — optional so existing records (all clinical) remain valid
- Add index: `.index("by_userId_startedAt", ["userId", "startedAt"])`

### speechCoachProgress table
- `patientId`: `v.id("patients")` → `v.optional(v.id("patients"))`
- `caregiverUserId`: keep as-is (rename would break existing data), add `userId: v.optional(v.string())`
- Add index: `.index("by_userId", ["userId"])`

> All changes are additive — existing records remain valid with undefined for new optional fields.

---

## Step 2: Convex Backend — Standalone Functions

**File:** `convex/speechCoach.ts`

### New mutations (parallel to existing clinical ones):

**`createStandaloneSession`**
- Args: `{ config: configValidator }`
- Auth: any authenticated user (just check identity exists)
- Inserts with `userId`, `mode: "standalone"`, `patientId: undefined`, `homeProgramId: undefined`

**`startStandaloneSession`**
- Args: `{ sessionId, conversationId }`
- Auth: verify `session.userId === caller userId`
- Patches conversationId, status → "active", startedAt

**`endStandaloneSession`**
- Args: `{ sessionId }`
- Auth: verify session ownership
- Patches status → "completed", schedules `analyzeSession`

**`failStandaloneSession`**
- Args: `{ sessionId, errorMessage }`
- Auth: verify session ownership

### New queries:

**`getStandaloneHistory`**
- Args: `{}`
- Returns user's standalone sessions via `by_userId_startedAt` index

**`getStandaloneProgress`**
- Args: `{}`
- Returns user's standalone progress via `by_userId` index

### Modify existing:

**`getSessionDetail`** — add branch: if session has no `patientId`, verify `session.userId === caller` instead of `assertPatientAccess`

**`saveProgress`** (internal) — make `patientId` optional, add `userId` optional arg

---

## Step 3: Analysis Pipeline Conditional Logic

**File:** `convex/speechCoachActions.ts`

In `analyzeSession` handler (line 149-192):
- Step 5 (`saveProgress`): pass `userId: session.userId`, make `patientId` conditional
- Steps 6-7 (`savePracticeLog`, `saveGoalProgress`): wrap in `if (session.homeProgramId && session.patientId)` guard — skip entirely for standalone sessions

---

## Step 4: Route & Navigation

### New route
**File:** `src/app/(app)/speech-coach/page.tsx` (new)
- Simple client component rendering `<StandaloneSpeechCoachPage />`

### Update routes
**File:** `src/core/routes.ts`
- Change `SPEECH_COACH: "/family"` → `SPEECH_COACH: "/speech-coach"`

### Update navigation
**File:** `src/shared/lib/navigation.ts`
- `NAV_ITEMS`: Speech Coach href already uses `ROUTES.SPEECH_COACH` — automatically picks up new path
- `CAREGIVER_NAV_ITEMS`: Add `{ icon: "record_voice_over", label: "Speech Coach", href: ROUTES.SPEECH_COACH }` between Home and Settings
- `isNavActive`: Add case for `/speech-coach`

### Update caregiver redirect guard
**File:** `src/features/dashboard/components/dashboard-sidebar.tsx` (line 25)
- Add `/speech-coach` to allowlist: `!pathname.startsWith("/family") && !pathname.startsWith("/settings") && !pathname.startsWith("/speech-coach")`

---

## Step 5: Frontend Components

### New hook
**File:** `src/features/speech-coach/hooks/use-standalone-speech-session.ts` (new)
- Same state machine as `use-speech-session.ts` but calls standalone mutations
- No `homeProgramId` param
- `begin()` calls `createStandaloneSession({ config })`

### New page component
**File:** `src/features/speech-coach/components/standalone-speech-coach-page.tsx` (new)
- Same structure as `SpeechCoachPage` but:
  - No `patientId`/`homeProgramId` props
  - Uses `useStandaloneSpeechSession()` hook
  - Passes default config to `SessionConfig` (defined inline as constant)
  - Queries `getStandaloneProgress` for `lastRecommended`
  - Passes `mode="standalone"` to `SessionHistory`
- Default config: `{ targetSounds: ["/s/"], ageRange: "5-7", defaultDurationMinutes: 5 }`

### Adapt SessionConfig
**File:** `src/features/speech-coach/components/session-config.tsx`
- No changes needed — it already takes `speechCoachConfig` as a prop. The standalone page just passes the default config.

### Adapt SessionHistory
**File:** `src/features/speech-coach/components/session-history.tsx`
- Add discriminated union props:
  ```typescript
  type Props =
    | { mode?: "clinical"; patientId: Id<"patients"> }
    | { mode: "standalone" };
  ```
- When `mode === "standalone"`: query `api.speechCoach.getStandaloneHistory` instead of `getSessionHistory`

### Adapt ExpandedDetail (in session-history.tsx)
- `getSessionDetail` already works for both modes after Step 2 modifications

### No changes needed:
- `active-session.tsx` — completely mode-agnostic (only needs signedUrl + callbacks)
- `progress-card.tsx` — pure display component
- `curriculum-data.ts` — reference data, no mode coupling

---

## Critical Files Summary

| File | Change Type |
|------|-------------|
| `convex/schema.ts` | Edit — optional fields, new indexes |
| `convex/speechCoach.ts` | Edit — add standalone mutations/queries, modify saveProgress |
| `convex/speechCoachActions.ts` | Edit — conditional practice log/goal skipping |
| `src/core/routes.ts` | Edit — update SPEECH_COACH route |
| `src/shared/lib/navigation.ts` | Edit — add caregiver nav, isNavActive case |
| `src/features/dashboard/components/dashboard-sidebar.tsx` | Edit — allowlist /speech-coach |
| `src/app/(app)/speech-coach/page.tsx` | **New** — route page |
| `src/features/speech-coach/hooks/use-standalone-speech-session.ts` | **New** — hook |
| `src/features/speech-coach/components/standalone-speech-coach-page.tsx` | **New** — page component |
| `src/features/speech-coach/components/session-history.tsx` | Edit — dual-mode props |

---

## Verification

1. **Schema deploys cleanly:** `npx convex dev` — no validation errors, existing data intact
2. **SLP can access:** Sign in as SLP → sidebar shows Speech Coach → `/speech-coach` loads → can configure and start a session
3. **Caregiver can access:** Sign in as caregiver → sidebar shows Speech Coach → same flow works
4. **Session completes:** Start session → speak → stop → analysis runs → progress card shows in History tab
5. **Clinical flow unbroken:** Navigate to `/family/[patientId]/speech-coach?program=X` → existing flow works exactly as before
6. **Caregiver redirect doesn't block:** Caregiver navigating to `/speech-coach` is NOT redirected to `/family`
