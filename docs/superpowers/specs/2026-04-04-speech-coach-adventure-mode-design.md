# Speech Coach — Adventure Mode Design

**Date:** 2026-04-04
**Status:** Approved, pending implementation plan
**Feature:** Adventure Mode — Synthesis-inspired adaptive speech therapy game layer

---

## Overview

Adventure Mode is a new session mode for the Bridges speech coach. It sits alongside the existing Classic Mode (drill-based). SLPs and caregivers choose which mode a session uses during session configuration.

The design is inspired by Synthesis.com's core loop: adaptive difficulty + game framing + long-term progression arc. Applied to speech therapy, it means:

- The SLP sets the clinical target sound
- The child picks a theme world they love (Dinosaurs, Space, Ocean, etc.)
- The adaptive engine finds the intersection — `/r/` + dinosaurs = roar, raptor, triceratops
- The LiveKit AI agent plays a character in that world, embedding speech targets into narrative rather than drill prompts
- A persistent world map shows the child's progress across sessions, unlocking new regions as sounds are mastered

Adventure Mode is fully additive — no existing Classic Mode behavior changes.

---

## Architecture

Three new systems power Adventure Mode, all building on existing infrastructure:

### 1. Vocabulary Graph
A Convex table (`adventureWords`) of SLP-curated words/phrases/sentences organized by `theme × targetSound × tier × difficulty`. This replaces the static `curriculum-data.ts` word lists for Adventure sessions and is the core clinical IP of the feature.

### 2. Adaptive Engine
A new `AdventureSessionEngine` class inside the existing LiveKit agent (`livekit/agent.ts`). It queries the vocabulary graph, tracks per-attempt accuracy in a rolling window, and advances or retreats difficulty in real time. Session results are persisted to Convex on disconnect.

### 3. World Map
A new child-facing screen (`/speech-coach/world`) backed by an `adventureProgress` Convex table. It renders the child's mastery state as an illustrated landscape — locked, in-progress, and mastered regions. SLPs and caregivers see the same data with clinical overlays.

---

## Data Model

### `adventureThemes`
Seeded at deploy time (~15 themes). Read-only to users.

```ts
{
  id: v.id("adventureThemes"),
  name: v.string(),           // "Dino Valley"
  slug: v.string(),           // "dinosaurs"
  description: v.string(),
  imagePrompt: v.string(),    // for AI-generated theme art
  ageRanges: v.array(v.union(v.literal("2-4"), v.literal("5-7"))),
}
```

### `adventureWords`
The vocabulary graph. Seeded per theme × sound combination (~20–40 entries each).

```ts
{
  id: v.id("adventureWords"),
  themeSlug: v.string(),
  targetSound: v.string(),          // "/r/"
  tier: v.union(
    v.literal("word"),
    v.literal("phrase"),
    v.literal("sentence")
  ),
  content: v.string(),              // "roar", "the raptor roars", etc.
  imagePrompt: v.string(),          // for Gemini image generation
  difficulty: v.number(),           // 1–5 within tier
}
```

Index: `by_themeSlug_targetSound_tier` on `[themeSlug, targetSound, tier]`

### `adventureProgress`
One row per `patientId × themeSlug × targetSound × tier`. Updated at end of each session.

```ts
{
  id: v.id("adventureProgress"),
  patientId: v.id("patients"),
  themeSlug: v.string(),
  targetSound: v.string(),
  tier: v.union(v.literal("word"), v.literal("phrase"), v.literal("sentence")),
  masteryPct: v.number(),       // 0.0–1.0
  attemptCount: v.number(),
  lastSessionId: v.id("adventureSessions"),
  unlockedAt: v.optional(v.number()),   // timestamp when tier unlocked
}
```

Index: `by_patient_theme` on `[patientId, themeSlug]`

### `adventureSessions`
One row per Adventure Mode session. Links to the existing `sessions` table.

```ts
{
  id: v.id("adventureSessions"),
  sessionId: v.id("sessions"),
  patientId: v.id("patients"),
  themeSlug: v.string(),
  targetSounds: v.array(v.string()),
  startTier: v.union(v.literal("word"), v.literal("phrase"), v.literal("sentence")),
  endTier: v.union(v.literal("word"), v.literal("phrase"), v.literal("sentence")),
  totalAttempts: v.number(),
  correctAttempts: v.number(),
  wordLog: v.array(v.object({
    content: v.string(),
    correct: v.boolean(),
    timestamp: v.number(),
  })),
}
```

Index: `by_patient` on `[patientId]`

---

## Mastery Logic

At session end, a Convex mutation recomputes `masteryPct` for each `tier` touched:

```
masteryPct = correctAttempts / totalAttempts  (for that tier this session)
```

**Tier unlock threshold:** `masteryPct ≥ 0.8` across `≥ 10 cumulative attempts`. This matches the evidence base from the cycles approach to articulation therapy.

When a tier unlocks, `unlockedAt` is set and the next tier becomes available on the world map.

---

## Adaptive Engine — Session Loop

### Session Start

The LiveKit agent receives `roomMetadata` containing:
```json
{
  "mode": "adventure",
  "themeSlug": "dinosaurs",
  "targetSounds": ["/r/"],
  "patientId": "<id>"
}
```

The agent queries `adventureProgress` for the patient's current tier and difficulty. First-time players start at `tier: "word", difficulty: 1`. Returning players resume from their saved state.

The agent pulls the first batch of 5 words from `adventureWords` at the current tier and difficulty.

### Round Structure (repeats per word)

**1. Setup beat** — agent delivers a narrative prompt embedding the target word contextually. Never says "now practice" or "say this word". Example: *"The raptor is sleeping! Say his name to wake him up!"*

**2. Attempt beat** — child speaks. Agent evaluates target sound production. Fires `visual_state` data channel message with `promptState: "nice_job"` or `"try_again"`. Correct attempts fire a `word_result` event to `AdventureSessionEngine`.

**3. Transition beat** — agent bridges to next word with themed language generated in context. Example: *"The raptor roared! Now let's find the rainbow!"*

### Intra-Session Adaptation

`AdventureSessionEngine` tracks a rolling 5-attempt accuracy window:

| Condition | Response |
|-----------|----------|
| ≥ 80% accuracy for 5 consecutive attempts | Advance to next difficulty within tier |
| < 40% accuracy for 3 consecutive attempts | Step back one difficulty; agent narrows cue |
| No attempt for 8 seconds | Engagement recovery: agent offers a choice prompt |

**Tier boundary:** when all `difficulty: 5` words at ≥ 80% accuracy are complete, the agent announces a world unlock moment, confetti fires, and the session either continues at the next tier or ends based on the SLP template setting.

### Narrative Generation

Setup beats and transition beats are generated by the LiveKit agent's existing Claude backend with a ~200-token addition to the system prompt:

> *"You are [character] in [theme world]. Keep all speech targets natural and embedded in the story. Never say 'now practice' or 'say this word'."*

### Session End

On disconnect, the agent writes the complete `wordLog` to `adventureSessions` via an internal mutation. A second mutation recomputes `adventureProgress` for all touched tier rows. The world map updates immediately.

---

## New Data Channel Messages

Two additions to the existing data channel protocol:

```ts
{ type: "session_milestone", tier: string, masteryPct: number }
// Fires when child hits tier boundary. All three context screens show celebration.

{ type: "agent_status", status: "active" | "paused" }
// Fires when SLP uses Take Over. Caregiver screen shows "SLP is speaking" badge.
```

Existing messages (`visual_state`, `advance_target`) are unchanged.

---

## Child-Facing UI

### Adventure Session Screen

Replaces the current card + 5-dot UI when `mode === "adventure"`. Three zones:

**Top — World strip:** thin illustrated banner for the theme. Sets mood without distraction.

**Center — Stage:** large target image card (same slot as current). Below it, a character speech bubble showing the setup beat text. `promptState` drives the visual cue — same four states (`listen`, `your_turn`, `nice_job`, `try_again`), new visual skin. Same data channel messages, same component slot.

**Bottom — Progress trail:** replaces the 5-dot row with a horizontal path of nodes — words attempted this session as small icons. Correct = glowing, incorrect = dim. At every 5th correct attempt, confetti fires (existing `showConfetti` logic, unchanged).

Stop Session button moves to a small icon in the top-right corner — accessible to adults, not accidentally tapped by kids.

### World Map (`/speech-coach/world`)

Top-down illustrated map of the child's chosen theme. Each region = one `tier × difficulty` cluster:

- **Locked** — dim, greyed out
- **In Progress** — lit, pulsing border
- **Mastered** — fully lit, star badge

Tapping a mastered region plays a recap. Tapping the in-progress region launches a new session targeting that tier.

**Caregiver overlay:** accuracy percentage on each region (e.g., "72%").

**SLP overlay:** per-sound mastery grid panel alongside the map across all patients.

### Theme Selection

Before first Adventure session, caregiver or SLP picks from ~15 illustrated theme tiles. Theme is saved to patient profile. Multiple themes can be active (e.g., `/r/` in Dino Valley, `/s/` in Ocean Reef).

---

## Three-Context Session State

All three contexts join the same LiveKit room. Game state is shared — no per-role duplicate logic.

### Child screen
Adventure Session screen only. No controls, no clinical data visible.

### Caregiver screen
Adventure Session screen + dismissible overlay with:
- Guidance strip (existing — elapsed time, contextual tips)
- **Hint button** → sends `{ type: "hint_requested" }` via data channel → agent narrows cue for current round
- **Boost button** → sends `{ type: "boost_requested" }` → agent delivers extra encouragement and drops one difficulty level for next word

### SLP screen (teletherapy)
Split view:
- Left: mirror of child's Adventure screen
- Right: live clinical panel — rolling accuracy window, current target word, per-sound breakdown
- **Take Over button** — mutes AI agent, SLP speaks directly; on release, agent resumes from same point

### Session Start by Context

| Context | Initiator | Flow |
|---------|-----------|------|
| Child-led | Caregiver taps "Start Adventure" on family dashboard | Auto-fills from patient's saved theme + current progress tier |
| Caregiver co-play | Same as child-led | Caregiver overlay on by default |
| SLP teletherapy | SLP starts from patient's coach setup tab | Shareable session link sent to caregiver via existing invite flow |

---

## Files Affected

### New files
- `convex/adventure_words.ts` — queries for vocabulary graph
- `convex/adventure_progress.ts` — mastery read/write mutations
- `convex/adventure_sessions.ts` — session log write
- `src/features/speech-coach/livekit/adventure-engine.ts` — `AdventureSessionEngine` class
- `src/features/speech-coach/components/adventure-session.tsx` — child-facing session screen
- `src/features/speech-coach/components/world-map.tsx` — between-session progress map
- `src/features/speech-coach/components/theme-picker.tsx` — theme selection grid
- `src/features/speech-coach/lib/adventure-seed-data.ts` — curated vocabulary graph seed

### Modified files
- `convex/schema.ts` — add 4 new tables
- `src/features/speech-coach/livekit/agent.ts` — adventure-mode branch + `AdventureSessionEngine` integration
- `src/features/speech-coach/livekit/model-config.ts` — adventure narrative system prompt addition
- `src/features/speech-coach/livekit/tools.ts` — add `hint_requested`, `boost_requested`, `session_milestone`, `agent_status` message types
- `src/features/speech-coach/components/session-config.tsx` — mode selector (Classic / Adventure)
- `src/features/speech-coach/components/speech-coach-page.tsx` — route to adventure vs classic session screen
- `src/app/speech-coach/world/page.tsx` — world map route (new page, thin wrapper)

---

## What Is Not In Scope

- SLP editing or creating custom adventure themes (themes are system-curated)
- Multiplayer / sibling sessions
- Audio recording playback for parents
- In-app theme art generation at session time (theme art is pre-generated at seed time)
- Changing Classic Mode behavior in any way
