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
    v.literal("analyzed")
  ),
  config: v.object({
    targetSounds: v.array(v.string()),
    ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
    durationMinutes: v.number(),
    focusArea: v.optional(v.string()),
  }),
  startedAt: v.optional(v.number()),
  endedAt: v.optional(v.number()),
  transcript: v.optional(v.string()),
})
  .index("by_userId", ["userId"])
  .index("by_status", ["status"]),
```

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

### Convex Functions (`convex/speechCoach.ts`)

| Function | Type | Purpose |
|----------|------|---------|
| `createSession` | mutation | Create session record with parent's config |
| `startSession` | mutation | Set conversationId + status → "active" |
| `endSession` | mutation | Set status → "completed", store endedAt |
| `analyzeSession` | action | Pull transcript → Claude analysis → write progress |
| `getSessionHistory` | query | User's past sessions, sorted by date |
| `getProgress` | query | Progress records for a user |
| `getSessionDetail` | query | Single session + its progress analysis |

## 4. User Flow

### Step 1: Configure Session

Parent navigates to `/speech-coach` from sidebar. Setup screen offers:

- **Target sounds:** Checkboxes for common phonemes (/s/, /r/, /l/, /th/, /ch/, /sh/, /f/, /k/)
- **Age range:** Toggle between "2-4" and "5-7"
- **Duration:** 5 or 10 minutes
- **Focus area:** Optional free text ("practice animal names")
- **Quick start:** "Continue where we left off" pre-fills from last session's `recommendedNextFocus`

### Step 2: Active Session

- Screen transitions to minimal coaching view — animated indicator showing listening/speaking state
- ElevenLabs Conversational AI connects via WebSocket using `@11labs/client` SDK
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

Triggered by `endSession` via `ctx.scheduler.runAfter(0, internal.speechCoach.analyzeSession, { sessionId })`.

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

Curriculum lives in `src/features/speech-coach/lib/curriculum-data.ts`. A setup script compiles it into the text document and uploads to ElevenLabs, so content is versioned in git and updates are a single command.

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

Uses `@11labs/client` (or ElevenLabs embed widget) for the real-time voice connection.

### Connection Flow

1. Parent hits "Start Session" → `createSession` mutation returns session ID
2. Frontend initializes ElevenLabs conversation client with agent ID
3. Agent ID is stored as an environment variable (not hardcoded)
4. WebSocket handles bidirectional audio streaming
5. On conversation end, the `conversationId` is captured
6. `startSession` mutation stores the conversationId
7. On disconnect/stop, `endSession` fires → triggers analysis pipeline

### Environment Variables

- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` — the speech coach agent ID (set after agent creation)
- Existing `ELEVENLABS_API_KEY` — used server-side for transcript retrieval

## 9. Scope Boundaries

### In Scope (v1)
- ElevenLabs agent creation with speech coaching system prompt
- Knowledge base with 8 sound groups, two age ranges
- Session configuration, live coaching, post-session analysis
- Parent dashboard with history and progress overview
- Sidebar navigation entry

### Out of Scope (v1)
- Therapist portal / multi-user role management
- Real-time phoneme-level pronunciation scoring
- Multiple languages (English only)
- Custom exercise creation by parents
- Charts or data visualizations
- Integration with the builder feature
- Outbound phone calls to the child
