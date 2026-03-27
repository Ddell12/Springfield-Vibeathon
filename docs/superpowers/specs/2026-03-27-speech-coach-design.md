# Speech Coach — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Approach:** ElevenLabs Conversational AI Agent + Convex Sync

## Overview

A dedicated speech coaching feature for children aged 2-7 with autism or speech delays. An ElevenLabs Conversational AI agent runs real-time, interactive voice sessions — structured exercises wrapped in warm, playful conversation. Post-session, Claude analyzes transcripts and writes structured progress data to Convex for parent review.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Interaction model | Hybrid: structured exercises + conversational transitions | Mirrors real speech therapy — drills with natural scaffolding |
| Supervision model | Parent-guided + therapist-configurable | Parents start ad-hoc sessions; can also pre-configure goals |
| Age range | 2-7, adaptive | Agent adjusts language and difficulty based on configured age range |
| Feedback depth | Light analysis (encouragement to child, tracking behind the scenes) | STT can infer substitutions/omissions but not articulation quality — honest, no false precision |
| Feature location | Standalone `/speech-coach` route | Purpose-built experience, not shoehorned into the builder |
| Knowledge base | Purpose-built speech curriculum (not reusing existing RAG) | Structured exercises are more effective than repurposed reference material |

## 1. ElevenLabs Agent Configuration

- **Agent name:** Bridges Speech Coach
- **Voice:** Bella (`hpp4J3VqNfWAUOO0d1Us`) — bright, warm, child-friendly
- **LLM:** Gemini 2.0 Flash (ElevenLabs default) — fast enough for real-time conversation
- **Model:** `eleven_turbo_v2` — low-latency TTS

### Agent Settings

| Setting | Value | Reason |
|---------|-------|--------|
| `asr_quality` | `"high"` | Critical for understanding child speech |
| `turn_timeout` | `10` | Kids need more response time than adults |
| `stability` | `0.6` | Clearer pronunciation modeling |
| `similarity_boost` | `0.8` | Consistent Bella voice |
| `record_voice` | `true` | Required for post-session transcript retrieval |
| `optimize_streaming_latency` | `3` | Fast responses to keep kids engaged |
| `max_duration_seconds` | `600` | 10 minute cap (configurable per session) |

### System Prompt (Core Behavior)

The agent's system prompt instructs it to:

- Be a friendly, patient speech coach for children aged 2-7
- Run structured exercises wrapped in warm, playful conversation
- Model correct pronunciation clearly and slowly when the child struggles
- Celebrate every attempt — never correct harshly
- Adapt difficulty based on how the session is going
- Follow the exercise curriculum from the knowledge base
- Keep exercises short (30-60 seconds each) with natural transitions
- Announce what sound is being practiced ("Let's try some /s/ words!")
- Use age-appropriate language based on the session configuration

The full system prompt will be parameterized with session config (target sounds, age range, focus area) at conversation start.

## 2. Data Model

> **Note on `userId`:** These tables use `v.string()` for `userId` (Clerk subject ID) rather than `v.id("users")` because Bridges has no `users` table — this is consistent with how `sessions`, `apps`, and `flashcardDecks` store user references.

### `speechCoachSessions`

One record per coaching session.

```typescript
speechCoachSessions: defineTable({
  userId: v.string(),
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
  .index("by_userId_startedAt", ["userId", "startedAt"]),
```

**Key changes from initial draft:**
- Added `"failed"` status for connection failures, mic denial, or agent crashes
- Replaced `transcript: v.string()` with `transcriptStorageId: v.id("_storage")` — 10-minute transcripts can be large; Convex file storage avoids the 1MB document size limit
- Added `errorMessage` for storing failure context
- Replaced `by_userId` + `by_status` with compound `by_userId_startedAt` for efficient sorted history queries (the `by_status` index had no read path)

### `speechCoachProgress`

Structured analysis written post-session by Claude.

```typescript
speechCoachProgress: defineTable({
  sessionId: v.id("speechCoachSessions"),
  userId: v.string(),
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
  .index("by_userId", ["userId"])
  .index("by_sessionId", ["sessionId"]),
```

### `speechCoachExercises`

Curriculum content (seeded, not user-generated).

```typescript
speechCoachExercises: defineTable({
  sound: v.string(),
  ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
  difficulty: v.union(
    v.literal("beginner"),
    v.literal("intermediate"),
    v.literal("advanced")
  ),
  words: v.array(v.string()),
  phrases: v.optional(v.array(v.string())),
  articulationCue: v.string(),
  modelingScript: v.string(),
})
  .index("by_sound", ["sound"])
  .index("by_ageRange", ["ageRange"]),
```

## 3. Feature Architecture

### Directory Structure (VSA)

```
src/features/speech-coach/
  components/
    session-config.tsx        — parent configures goals before starting
    active-session.tsx        — live coaching screen with ElevenLabs widget
    session-history.tsx       — list of past sessions
    progress-card.tsx         — single session's analysis results
    progress-dashboard.tsx    — aggregate view across sessions
  hooks/
    use-speech-session.ts     — session lifecycle management
  lib/
    curriculum-data.ts        — exercise content for knowledge base seeding
```

### Route

`src/app/(app)/speech-coach/page.tsx` — thin wrapper importing from `src/features/speech-coach/`

### Convex Functions (two files — queries/mutations separate from actions)

**`convex/speechCoach.ts`** — queries and mutations (no `"use node"`)

| Function | Type | Purpose |
|----------|------|---------|
| `createSession` | mutation | Create session record with parent's config (requires auth) |
| `startSession` | mutation | Set conversationId + status → "active" |
| `endSession` | mutation | Set status → "completed", store endedAt, schedule analysis |
| `failSession` | mutation | Set status → "failed" with error message |
| `getSessionHistory` | query | User's past sessions via `by_userId_startedAt` index |
| `getProgress` | query | Progress records for a user |
| `getSessionDetail` | query | Single session + its progress analysis |

**`convex/speechCoachActions.ts`** — actions with `"use node";` (external API calls)

| Function | Type | Purpose |
|----------|------|---------|
| `analyzeSession` | action | Pull transcript from ElevenLabs → Claude analysis → write progress |
| `getSignedUrl` | action | Request signed URL from ElevenLabs for secure WebSocket connection |

> **Why two files?** Per project conventions, `"use node"` cannot appear in files that export queries or mutations — it would cause a runtime error. Actions that call external APIs (ElevenLabs, Anthropic) must be isolated.

## 4. User Flow

### Step 1: Configure Session

Parent navigates to `/speech-coach` from sidebar. Setup screen offers:

- **Target sounds:** Checkboxes for common phonemes (/s/, /r/, /l/, /th/, /ch/, /sh/, /f/, /k/)
- **Age range:** Toggle between "2-4" and "5-7"
- **Duration:** 5 or 10 minutes
- **Focus area:** Optional free text ("practice animal names")
- **Quick start:** "Continue where we left off" pre-fills from last session's `recommendedNextFocus`

### Step 2: Active Session

- **Microphone permission:** Before connecting, the app checks `navigator.mediaDevices.getUserMedia`. If denied or unavailable, shows a friendly message: "We need your microphone so the coach can hear your child. Please allow microphone access and try again." Session moves to "failed" state with error context — does not proceed without audio.
- Screen transitions to minimal coaching view — animated indicator showing listening/speaking state
- ElevenLabs Conversational AI connects via WebSocket using `@elevenlabs/react` SDK (see Section 8)
- Agent greets child and begins exercises based on configured targets
- "Stop Session" button available for parent
- Minimal visual distractions — children with ASD are sensitive to busy screens

### Step 3: Session Ends

- Parent taps "Stop" or agent reaches max duration
- Celebratory moment ("Great job!"), then loading state ("Reviewing the session...")
- `endSession` mutation fires → schedules `analyzeSession`

### Step 4: Review Results

- Progress card appears with summary, sounds attempted, engagement, next focus
- Links to session history and overall progress dashboard

## 5. Post-Session Analysis Pipeline

Triggered by `endSession` via `ctx.scheduler.runAfter(0, internal.speechCoachActions.analyzeSession, { sessionId })`.

### Pipeline Steps

1. **Fetch transcript** — Call ElevenLabs API `GET /v1/convai/conversations/{conversationId}` to retrieve full transcript with speaker labels and timestamps.

2. **Analyze with Claude** — Send transcript + session config to Claude (Anthropic SDK, already in project). Prompt instructs Claude to extract:
   - Sounds practiced and words attempted per sound
   - Approximate success rate per sound (high/medium/low) based on transcript patterns
   - Overall engagement level
   - Recommended next focus sounds
   - Parent-friendly 2-3 sentence summary

3. **Structured output** — Claude responds with tool use to enforce the `speechCoachProgress` JSON shape.

4. **Write to Convex** — Insert progress record, update session status to "analyzed".

### Error Handling

- **Transcript fetch fails:** Mark session as "completed" (not "analyzed"). Parent sees "Session was too short to analyze."
- **Claude analysis fails:** Retry once. If still failing, store raw transcript so parents can at least read it.
- **Session too short (< 30 seconds):** Skip analysis, show friendly message.

## 6. Knowledge Base Curriculum

A single structured text document uploaded to the ElevenLabs agent via `add_knowledge_base_to_agent`.

### Sounds Covered (v1 — 8 Target Groups)

1. **/s/ and /z/** — most frequent articulation target
2. **/r/** — hardest for kids, longest to master
3. **/l/** — often confused with /w/
4. **/th/** — voiced and voiceless, late-developing
5. **/ch/ and /sh/** — affricate/fricative pair
6. **/f/ and /v/** — lip-teeth coordination
7. **/k/ and /g/** — velar (back of throat)
8. **Blends:** /sl/, /sn/, /sp/, /st/, /tr/, /bl/, /cr/

### Content Per Sound

- **Articulation cue** — child-friendly placement instruction
- **Ages 2-4 section:** beginner words, modeling script, praise variants
- **Ages 5-7 section:** beginner + intermediate words, advanced phrases, modeling script
- **Modeling scripts** — how to introduce and demonstrate each sound
- **Encouragement phrases** — varied praise that doesn't get repetitive

### Additional Sections

- **Session openers** — age-appropriate greetings and warm-ups
- **Transition phrases** — moving between exercises naturally
- **Wind-down scripts** — ending sessions positively
- **Engagement recovery** — re-engaging a distracted or silent child

### Source of Truth

Curriculum lives in `src/features/speech-coach/lib/curriculum-data.ts`. A one-time setup script (`scripts/seed-speech-curriculum.ts`) compiles it into a text document and uploads to ElevenLabs via `add_knowledge_base_to_agent`. The script:

- Authenticates with `ELEVENLABS_API_KEY` from `.env.local`
- Is idempotent — checks if the knowledge base already exists before uploading
- Can be re-run to update the curriculum (uploads a new version)
- Is **not** part of CI — run manually when curriculum content changes

Content is versioned in git so changes go through code review.

## 7. Parent Dashboard

Three tabs on the `/speech-coach` page:

### Tab 1: New Session (default)
- Session configuration form
- "Continue where we left off" quick-start
- Brief parent tip

### Tab 2: Session History
- Reverse-chronological list of past sessions
- Each row: date, duration, target sounds as pills, engagement dot, status badge
- Expandable to show full progress card (summary, sounds, recommendations)

### Tab 3: Progress Overview
- Sound progress table: each targeted sound with trend (improving / steady / needs work) from last 3-5 sessions
- Session frequency count with gentle encouragement
- Synthesized recommended focus from recent sessions
- Text and status indicators only — no charts for v1 (qualitative data doesn't chart meaningfully)

### Design

- Follows Bridges design system: Manrope headings, Inter body, tonal background shifts
- Primary CTA gradient for "Start Session"
- Mobile-first layout
- No developer jargon in the UI

## 8. ElevenLabs Widget Integration

### Client-Side SDK

**Package:** `@elevenlabs/react` — the official React SDK for ElevenLabs Conversational AI. Provides the `useConversation` hook that manages WebSocket connections, microphone access, and audio playback. Must be installed as a new dependency.

> **Why `@elevenlabs/react` and not `@11labs/client`?** ElevenLabs publishes under two npm scopes. `@elevenlabs/react` is the current React-specific package with hooks. `@11labs/client` is the vanilla JS package. Since Bridges is React/Next.js, the React SDK is the right choice — it handles component lifecycle, cleanup, and re-renders properly.

### Authentication: Signed URL Flow

**The API key must never reach the client.** ElevenLabs Conversational AI uses signed URLs — temporary, expiring WebSocket URLs generated server-side.

```
Parent hits "Start Session"
  → Frontend calls Convex action `getSignedUrl` (server-side, has API key)
    → Convex action calls ElevenLabs: GET /v1/convai/conversation/get-signed-url?agent_id={id}
    → Returns signed WebSocket URL (expires in 15 minutes)
  → Frontend passes signed URL to `useConversation().startSession({ signedUrl })`
  → WebSocket connects securely — no API key exposed
```

The `getSignedUrl` action in `convex/speechCoachActions.ts`:
- Requires authenticated user (`ctx.auth.getUserIdentity()`)
- Calls ElevenLabs API with server-side `ELEVENLABS_API_KEY`
- Returns the signed URL to the client

### Connection Flow (Revised)

1. Parent configures session → hits "Start Session"
2. `createSession` mutation creates the record (status: "configuring")
3. Frontend checks microphone permission — aborts to "failed" if denied
4. Frontend calls `getSignedUrl` action → receives temporary signed URL
5. `useConversation().startSession({ signedUrl })` opens the WebSocket
6. On successful connection, the `conversationId` is immediately available from the SDK
7. `startSession` mutation stores `conversationId` and sets status → "active" **immediately** (not at end — prevents data loss on page refresh or navigation)
8. Session proceeds — agent and child interact in real-time
9. On stop/disconnect, `endSession` mutation sets status → "completed" and schedules analysis

### Error States

| Scenario | Handling |
|----------|----------|
| Microphone denied | Show friendly message, session → "failed" |
| Signed URL request fails | Show retry option, session stays "configuring" |
| WebSocket connection drops | Show "Connection lost" with reconnect option |
| Agent crashes mid-session | Session → "failed" with error, offer to try again |
| Page refresh during session | `conversationId` already stored — session can be marked completed on next visit |

### Environment Variables

- `ELEVENLABS_AGENT_ID` — the speech coach agent ID (server-side only, used in `getSignedUrl`)
- Existing `ELEVENLABS_API_KEY` — used server-side for signed URL generation and transcript retrieval
- No `NEXT_PUBLIC_*` variables needed — agent ID stays server-side

### Auth Guard

The `/speech-coach` route requires authentication. All Convex mutations and queries in `convex/speechCoach.ts` call `ctx.auth.getUserIdentity()` and throw if not authenticated. The `active-session` component checks auth state before initiating the signed URL request.

## 9. Scope Boundaries

### In Scope (v1)
- ElevenLabs agent creation with speech coaching system prompt
- Knowledge base with 8 sound groups, two age ranges
- Session configuration, live coaching, post-session analysis
- Parent dashboard with history and progress overview
- Sidebar navigation entry (icon: `AudioLines` from Lucide, label: "Speech Coach", positioned after "Templates" in `NAV_ITEMS`)
- New dependency: `@elevenlabs/react`

### Out of Scope (v1)
- Therapist portal / multi-user role management
- Real-time phoneme-level pronunciation scoring
- Multiple languages (English only)
- Custom exercise creation by parents
- Charts or data visualizations
- Integration with the builder feature
- Outbound phone calls to the child
