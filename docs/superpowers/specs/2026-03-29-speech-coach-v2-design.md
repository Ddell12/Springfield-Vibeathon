# Speech Coach v2 — Design Spec (Patient-Integrated)

**Date:** 2026-03-29
**Status:** Draft
**Supersedes:** `2026-03-27-speech-coach-design.md`
**Approach:** ElevenLabs Conversational AI + Patient/Caregiver Model Integration

## Overview

A real-time speech coaching feature for children aged 2-7 with autism or speech delays. An ElevenLabs Conversational AI agent runs interactive voice sessions — structured exercises wrapped in warm, playful conversation. Post-session, Claude analyzes transcripts and writes structured progress data.

**What changed from v1:** The speech coach now integrates with the patient/caregiver system. SLPs assign speech coach as a home program type. Caregivers run sessions from the family dashboard. Sessions are linked to patients, auto-log to practice streaks, and optionally feed into goal progress tracking.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Integration model | Home program with `type: "speech-coach"` | Reuses existing assign/view/track infrastructure, goal linking, frequency |
| Who initiates | Both — SLP configures defaults, caregiver runs and adjusts | Mirrors real therapy: SLP sets targets, parents do informal practice at home |
| Goal linking | Optional manual link via `goalId` | Preserves SLP clinical judgment — auto-linking risks inaccurate clinical data |
| Caregiver access point | `/family/[patientId]/speech-coach` sub-route | Follows existing pattern (`/family/[patientId]/messages`) |
| Streak integration | Auto-log to `practiceLog` on session complete | A voice coaching session IS practice — removing friction rewards engagement |
| Sidebar nav | None — accessed from family dashboard card | Feature is patient-scoped, not a global top-level route |

## 1. ElevenLabs Agent Configuration

Unchanged from v1 spec. See `docs/superpowers/specs/2026-03-27-speech-coach-design.md` Sections 1 and 8 for full agent configuration, system prompt template, and connection flow details.

- **Agent name:** Bridges Speech Coach
- **Voice:** Bella (`hpp4J3VqNfWAUOO0d1Us`) — bright, warm, child-friendly
- **LLM:** Gemini 2.0 Flash (ElevenLabs default) — fast enough for real-time conversation
- **Model:** `eleven_turbo_v2` — low-latency TTS

| Setting | Value | Reason |
|---------|-------|--------|
| `asr_quality` | `"high"` | Critical for understanding child speech |
| `turn_timeout` | `10` | Kids need more response time than adults |
| `stability` | `0.6` | Clearer pronunciation modeling |
| `similarity_boost` | `0.8` | Consistent Bella voice |
| `record_voice` | `true` | Required for post-session transcript retrieval |
| `optimize_streaming_latency` | `3` | Fast responses to keep kids engaged |
| `max_duration_seconds` | `600` | 10 minute cap (configurable per session) |

System prompt behavior unchanged — parameterized with session config (target sounds, age range, focus area) at conversation start.

## 2. Data Model

### Modify: `homePrograms` table

Add two optional fields:

```typescript
// Add to existing homePrograms defineTable:
type: v.optional(v.union(v.literal("standard"), v.literal("speech-coach"))),
speechCoachConfig: v.optional(v.object({
  targetSounds: v.array(v.string()),
  ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
  defaultDurationMinutes: v.number(),
})),
```

- `type` defaults to `"standard"` when absent — backward compatible with all existing home programs
- `speechCoachConfig` is only present when `type === "speech-coach"`
- Existing fields (`goalId`, `frequency`, `instructions`, `status`) work as-is

### New: `speechCoachSessions` table

```typescript
speechCoachSessions: defineTable({
  patientId: v.id("patients"),
  homeProgramId: v.id("homePrograms"),
  caregiverUserId: v.string(),
  agentId: v.string(),
  conversationId: v.optional(v.string()),
  status: v.union(
    v.literal("configuring"),
    v.literal("active"),
    v.literal("completed"),
    v.literal("analyzed"),
    v.literal("failed")
  ),
  config: v.object({
    targetSounds: v.array(v.string()),
    ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
    durationMinutes: v.number(),
    focusArea: v.optional(v.string()),
  }),
  startedAt: v.optional(v.number()),
  endedAt: v.optional(v.number()),
  transcriptStorageId: v.optional(v.id("_storage")),
  errorMessage: v.optional(v.string()),
})
  .index("by_patientId_startedAt", ["patientId", "startedAt"])
  .index("by_homeProgramId", ["homeProgramId"]),
```

### New: `speechCoachProgress` table

```typescript
speechCoachProgress: defineTable({
  sessionId: v.id("speechCoachSessions"),
  patientId: v.id("patients"),
  caregiverUserId: v.string(),
  soundsAttempted: v.array(
    v.object({
      sound: v.string(),
      wordsAttempted: v.number(),
      approximateSuccessRate: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      ),
      notes: v.string(),
    })
  ),
  overallEngagement: v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("low")
  ),
  recommendedNextFocus: v.array(v.string()),
  summary: v.string(),
  analyzedAt: v.number(),
})
  .index("by_patientId", ["patientId"])
  .index("by_sessionId", ["sessionId"]),
```

## 3. Auth & Access Patterns

| Operation | Auth | Pattern |
|-----------|------|---------|
| Create speech-coach home program | SLP only | `assertSLP` (existing `homePrograms.create`) |
| Start speech coach session | Caregiver only | `assertCaregiverAccess(ctx, patientId)` — derives patientId from home program |
| Get signed URL | Authenticated | `ctx.auth.getUserIdentity()` — session creation already verified access |
| View session history & progress | SLP or caregiver | `assertPatientAccess(ctx, patientId)` — dual-role |
| Post-session analysis | Internal | `internalAction` — no user-facing auth |

## 4. User Flows

### SLP: Assign Speech Coach

1. Patient detail → Home Programs → "Add Program"
2. Toggle "Speech Coach" type → form shows target sounds, age range, duration
3. Set frequency, optional goal link, instructions for caregiver
4. Save → `homePrograms.create` with `type: "speech-coach"` + `speechCoachConfig`
5. Caregiver sees it immediately via Convex subscription

### SLP: View Results

1. Patient detail → Home Programs → click speech-coach program
2. Session history: date, duration, sounds, engagement, status
3. Latest analysis summary
4. If goal-linked: progress chart includes speech coach `progressData` points

### Caregiver: Run Session

> **Multiple programs:** An SLP can assign multiple speech-coach home programs to the same patient (e.g., one for /s/ sounds, one for /r/). The family dashboard renders one card per active speech-coach program, each with independent session history and streak tracking. The sub-route at `/family/[patientId]/speech-coach` receives the `homeProgramId` as a query parameter to scope to the correct program.

> **Paused/completed programs:** Only `status: "active"` speech-coach programs appear on the family dashboard (filtered by existing `getActiveByPatient`). The `createSession` mutation additionally validates `status === "active"` as a server-side guard.

1. Family dashboard → "Speech Coach" card (per active speech-coach home program)
2. Tap → `/family/[patientId]/speech-coach?program={homeProgramId}`
3. Config screen pre-filled from SLP defaults; caregiver can toggle sounds, set focus area
4. "Start Session" → mic check → signed URL → WebSocket connects
5. Active session: animated indicator, stop button, auto-stop at duration
6. Session ends → "Great job!" → auto-logged to `practiceLog`
7. Analysis completes (background) → progress card appears in history

### Caregiver: View History

1. `/family/[patientId]/speech-coach` → "History" tab
2. Past sessions with expandable analysis cards
3. Family dashboard streak reflects completed sessions

## 5. Post-Session Analysis Pipeline

Triggered by `endSession` mutation via `ctx.scheduler.runAfter(0, internal.speechCoachActions.analyzeSession, { sessionId })`.

### Pipeline Steps

1. **Fetch transcript** — ElevenLabs API `GET /v1/convai/conversations/{conversationId}`
2. **Store transcript** — Convex file storage (avoids 1MB document limit)
3. **Analyze with Claude** — Send transcript + config → structured JSON output
4. **Write speech coach progress** — Insert `speechCoachProgress` record, set session status → "analyzed"
5. **Auto-log practice** — Insert `practiceLog` entry for the linked home program:
   - `homeProgramId`: from session
   - `patientId`: from session
   - `caregiverUserId`: from session
   - `date`: today (YYYY-MM-DD)
   - `duration`: actual session duration in minutes
   - `notes`: "Speech Coach session — practiced {sounds}"
   - Logs "practice-logged" to `activityLog`
6. **Optional goal progress** — If the home program has a `goalId`:
   - Map Claude's `approximateSuccessRate` to numeric accuracy: high=85, medium=60, low=30
   - Insert `progressData` with `source: "in-app-auto"`, `sourceId: sessionId`
   - These are approximate — the SLP sees them labeled as "Speech Coach (auto)" in the progress chart

### Error Handling

- **Transcript fetch fails:** Session stays "completed". Parent sees "Session was too short to analyze."
- **Claude analysis fails:** Retry once. If still failing, transcript is stored — session stays "completed".
- **Session too short (< 100 chars transcript):** Skip analysis.
- **Practice log write fails:** Log error, don't fail the analysis pipeline. Session analysis is more valuable than streak credit.

### Activity Log

The pipeline logs `"practice-logged"` to `activityLog` (existing action literal). No new activity log action types are needed — the session lifecycle is tracked via `speechCoachSessions.status`, not via activity log entries.

## 6. Knowledge Base Curriculum

Unchanged from v1 spec. See `docs/superpowers/specs/2026-03-27-speech-coach-design.md` Section 6 for full curriculum structure (8 target sound groups, age-tiered word lists, articulation cues, modeling scripts, session management phrases).

Source of truth: `src/features/speech-coach/lib/curriculum-data.ts` → uploaded to ElevenLabs via `scripts/seed-speech-curriculum.ts`.

## 7. ElevenLabs Widget Integration

### Client-Side SDK

`@elevenlabs/react` — `ConversationProvider` context pattern.

- `ConversationProvider` wraps the session UI with `signedUrl` prop
- `useConversationControls()` for `startSession` / `endSession`
- `useConversationStatus()` for status (`disconnected`, `connected`, `speaking`, `listening`)
- `startSession({ onConnect: ({ conversationId }) => ... })` provides the conversationId

### Signed URL Auth Flow

```
Caregiver hits "Start Session"
  → createSession mutation (verifies caregiver access, creates record)
  → getSignedUrl action (server-side, uses ELEVENLABS_API_KEY)
    → ElevenLabs: GET /v1/convai/conversation/get-signed-url?agent_id={id}
    → Returns signed WebSocket URL (expires 15 min)
  → Frontend passes URL to ConversationProvider
  → startSession() opens WebSocket
  → onConnect returns conversationId
  → startSession mutation stores conversationId, status → "active"
```

### Error States

| Scenario | Handling |
|----------|----------|
| Mic denied | Friendly message, session → "failed", no WebSocket attempt |
| Signed URL fails | Error message + retry button, session → "failed" |
| WebSocket disconnects | `endSession` fires, analysis scheduled if conversationId exists |
| Page refresh mid-session | Session stays "active" in DB — next visit shows "active session" recovery option |

## 8. Feature Architecture

### Directory Structure (VSA)

```
src/features/speech-coach/
  components/
    session-config.tsx        — config form, pre-filled from SLP defaults
    active-session.tsx        — live coaching with ElevenLabs ConversationProvider
    session-history.tsx       — past sessions list with expandable analysis
    progress-card.tsx         — single session analysis display
    speech-coach-page.tsx     — top-level page with tab navigation
  hooks/
    use-speech-session.ts     — session lifecycle (create → start → end)
  lib/
    curriculum-data.ts        — exercise content for knowledge base
```

### Route

`src/app/(app)/family/[patientId]/speech-coach/page.tsx` — thin wrapper

### Convex Functions

**`convex/speechCoach.ts`** — queries and mutations (no `"use node"`)

| Function | Type | Purpose |
|----------|------|---------|
| `createSession` | mutation | Create session record. Args: `{ homeProgramId }`. Derives `patientId` from the home program record. Auth: `assertCaregiverAccess(ctx, derivedPatientId)`. Rejects if home program `status !== "active"` or `type !== "speech-coach"`. |
| `startSession` | mutation | Set conversationId + status → "active" |
| `endSession` | mutation | Set status → "completed", schedule analysis |
| `failSession` | mutation | Set status → "failed" with error message |
| `getSessionHistory` | query | Sessions for a patient via `by_patientId_startedAt`. Auth: `assertPatientAccess` (dual-role — both SLP and caregiver can view) |
| `getProgress` | query | Progress records for a patient. Auth: `assertPatientAccess` (dual-role). Separate from existing `progressData` queries which remain SLP-only. |
| `getSessionDetail` | query | Single session + its progress. Auth: `assertPatientAccess` (dual-role) |
| `getSessionById` | internalQuery | Used by analysis action |
| `setTranscriptStorageId` | internalMutation | Store transcript reference |
| `saveProgress` | internalMutation | Write analysis results + update session status |
| `savePracticeLog` | internalMutation | Auto-log to `practiceLog` table. Bypasses `assertCaregiverAccess` since this runs inside an `internalAction` with no user auth context. Inserts with `caregiverUserId` from the session record. Also logs `"practice-logged"` to `activityLog`. |
| `saveGoalProgress` | internalMutation | Conditionally write to `progressData` if home program has `goalId`. Bypasses `assertSLP` auth. Maps approximate success rate → numeric accuracy (high=85, medium=60, low=30). Source: `"in-app-auto"`, sourceId: sessionId (string coercion of `Id<"speechCoachSessions">`). |

**`convex/speechCoachActions.ts`** — actions with `"use node";`

| Function | Type | Purpose |
|----------|------|---------|
| `getSignedUrl` | action | Request signed URL from ElevenLabs. Auth: `ctx.auth.getUserIdentity()` only — the agent ID is a fixed server-side constant (`ELEVENLABS_AGENT_ID`), so the signed URL grants access to the public speech coach agent, not patient data. Session creation already verified caregiver access. |
| `analyzeSession` | internalAction | Transcript → Claude analysis → write progress + practice log + optional goal data |

### Modified Files

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `speechCoachSessions` + `speechCoachProgress` tables; add `type` + `speechCoachConfig` to `homePrograms` |
| `convex/homePrograms.ts` | Extend `create`/`update` mutations: add `type: v.optional(...)` and `speechCoachConfig: v.optional(...)` to args validators. Add validation: if `type === "speech-coach"` then `speechCoachConfig` is required; if `type` is absent or `"standard"` then `speechCoachConfig` must be absent. |
| `src/features/family/components/family-dashboard.tsx` | Add Speech Coach card for speech-coach home programs |
| `src/features/patients/components/patient-detail-page.tsx` | Show speech coach session results in home program detail |
| `package.json` | Add `@elevenlabs/react` |

## 9. UI Design Notes

- Follows Bridges design system: Manrope headings, Inter body, tonal background shifts
- Primary CTA: gradient `#00595c` → `#0d7377` at 135deg for "Start Session"
- Active session screen: minimal — animated listening/speaking indicator only. Children with ASD are sensitive to busy screens.
- Mobile-first layout — caregivers primarily use phones
- No developer jargon in the UI
- Animations: `cubic-bezier(0.4, 0, 0.2, 1)`, minimum 300ms

## 10. Environment Variables

No new env vars in `.env.local`.

**Convex Dashboard (new):**
- `ELEVENLABS_AGENT_ID` — the speech coach agent ID (created via seed script or ElevenLabs dashboard)

**Already configured:**
- `ELEVENLABS_API_KEY` — used by existing TTS/STT
- `ANTHROPIC_API_KEY` — used by existing code gen pipeline
