# Speech Coach V2 Completion — Shared Visual Layer + Adventure Mode Gaps

**Date:** 2026-04-04
**Status:** Approved, pending implementation plan
**Scope:** `src/features/speech-coach/` + `convex/seeds/adventure_seed.ts` + `livekit/entrypoint.ts`
**Approach:** Approach 3 — shared session upgrade + Adventure gap-fill together

---

## Overview

Four areas addressed in one sprint:

1. **Shared visual layer** — image cards, real-time feedback ring, unified progress trail, and pacing debounce for both Classic and Adventure modes
2. **Adventure seed data** — vocabulary graph expanded from 1 sound × 1 theme to 5 sounds × 3 themes (~400 entries)
3. **Caregiver Hint + Boost overlay** — caregivers gain active participation buttons during Adventure sessions
4. **SLP Take Over + split view** — teletherapy context completed with live clinical panel and agent mute

Sections 2–4 are Adventure-specific. Section 1 benefits both modes. Adventure Mode is fully additive — no Classic Mode behavior changes beyond the visual layer upgrade.

---

## Section 1: Shared Visual Layer (Classic + Adventure)

### Problem

Both modes display only a text label during live sessions. The `visual_state` data channel message already carries `targetImageUrl` but nothing renders it. The prompt state card exists and transitions correctly, but there is no visual feedback on the image card itself when outcomes occur. Progress is shown (dots in Classic, path nodes in Adventure) but the two implementations are separate and will drift. The `your_turn` state can flash away too quickly for younger children.

### Target Image Cards

A 200×200 image card renders above the word label when `targetImageUrl` is present in the `visual_state` message. When absent, a styled word-only card fills the same slot — same size, rounded corners, tonal background. No Gemini calls at session time. Images are pre-generated at seed or setup time:

- **Classic mode:** each word in `curriculum-data.ts` already has `imagePrompt`. A one-time Convex action generates and stores images for all curriculum words before they appear in sessions.
- **Adventure mode:** `adventureWords.imagePrompt` already exists. Images generated at seed time and stored in Convex file storage.

### Real-Time Feedback Ring

Three distinct visual beats on the image card:

| State | Visual |
|---|---|
| `nice_job` | Green ring pulses around card for 800ms, then fades. Every 5th correct fires existing CSS confetti. No confetti on individual correct responses. |
| `try_again` | Amber ring on card. Target word label briefly increases font size by 10% for 600ms to draw attention to the word. |
| `your_turn` | Soft pulsing border on card — signals "it's your moment" without a countdown that would add pressure. |

All animations check `reducedMotion` (same pattern as existing confetti gate). When `reducedMotion` is true, rings and pulses are replaced with a static color change only.

### Progress Trail Unification

Classic and Adventure both track `totalCorrect` from `visual_state`. A shared `useProgressTrail` hook extracts this logic:

```ts
// Returns { filled: number, total: 5 } — resets every 5 correct
function useProgressTrail(totalCorrect: number): { filled: number; total: number }
```

Classic renders this as 5 dots. Adventure renders it as path nodes. Same hook, same reset logic, different visual skin. Eliminates the parallel implementations that will otherwise drift.

### Pacing Debounce

The `your_turn` state gets a minimum display time of 1,500ms before the client will transition away from it. Enforced in `processAgentMessage`: if the incoming message would transition state away from `your_turn` and fewer than 1,500ms have elapsed since the `your_turn` message arrived, the new state is queued and applied after the minimum has passed. This prevents the screen from flashing too fast for younger children.

### Files Touched

- `active-session.tsx` — image card slot, feedback ring, pacing debounce
- `adventure-session.tsx` — same image card slot and feedback ring
- `prompt-state-card.tsx` — feedback ring logic (or inline in each session component)
- New `src/features/speech-coach/hooks/use-progress-trail.ts` — shared trail hook

### Schema Changes

None. `targetImageUrl` already flows through `visual_state`. New Convex action `generateCurriculumImages` pre-populates the URLs — this is a one-time migration action, not a schema change.

---

## Section 2: Adventure Seed Data Expansion

### Problem

`convex/seeds/adventure_seed.ts` covers only `/r/` × dinosaurs — 76 entries. A child with `/s/`, `/l/`, `/sh/`, or `/ch/` targets cannot use Adventure Mode. The feature is clinically unusable for the majority of SLP caseloads.

### Target Coverage

Five sounds × three themes, 20–30 entries per sound × theme × tier:

**Sounds:**

| Sound | Rationale |
|---|---|
| `/s/` | Most common articulation target across caseloads |
| `/r/` | Already seeded for dinosaurs — expand to new themes |
| `/l/` | Second most common after /s/ and /r/ |
| `/sh/` | High frequency in connected speech |
| `/ch/` | Natural clinical pairing with /sh/ |

**Themes:**

| Theme | Slug | Notes |
|---|---|---|
| Dino Valley | `dinosaurs` | Existing — add `/s/`, `/l/`, `/sh/`, `/ch/` |
| Ocean Reef | `ocean` | New — `/s/` maps naturally: sea, sand, starfish, shell, seahorse |
| Space Station | `space` | New — `/sh/` maps well: shooting star, shuttle. `/s/` too: satellite, stars |

### Word Structure

Each theme × sound combination gets entries at all three tiers:

- `word` — single target word (e.g. "starfish")
- `phrase` — 2–4 words with the target embedded (e.g. "silver starfish")
- `sentence` — full sentence with 2–3 target sound instances (e.g. "The starfish swims slowly past the seaweed.")

Difficulty 1–5 within each tier follows phonological complexity: initial position at 1–2, medial at 3–4, final position or consonant clusters at 5.

### Total Target

~400 word entries across 5 sounds × 3 themes × 3 tiers. Sufficient variety to avoid word repetition within a session and enough depth to progress through all difficulty levels without exhausting the pool.

### Theme Art

`adventureThemes` gets an optional `bannerUrl: v.optional(v.string())` field. A new internal Convex action (`generateThemeBanners`) calls Gemini image gen once per theme and stores the result in Convex file storage, then writes the URL to `adventureThemes.bannerUrl`. The world map and adventure session banner fall back to the theme emoji when `bannerUrl` is absent. This is a polish step that does not block session functionality.

### Seed Safety

The existing seed mutation is idempotent — it only inserts rows that don't already exist. Adding new entries to `adventure_seed.ts` and re-running the seed is safe in any environment.

### Files Touched

- `convex/seeds/adventure_seed.ts` — new word entries for 4 sounds × 3 themes + Ocean + Space theme definitions
- `convex/schema.ts` — add `bannerUrl: v.optional(v.string())` to `adventureThemes`
- New `convex/adventureThemeActions.ts` — `generateThemeBanners` action (optional polish step)

---

## Section 3: Caregiver Hint + Boost Overlay (Adventure)

### Problem

The Adventure spec described Hint and Boost buttons for caregivers but they were never implemented. Caregivers have no active role during Adventure sessions — they watch. This misses the clinical value of parent coaching.

### Viewer Context Prop

`adventure-session.tsx` receives a new `viewerRole: "child" | "caregiver" | "slp"` prop:

- `"child"` — no overlay, no extra controls
- `"caregiver"` — existing guidance strip + Hint and Boost buttons
- `"slp"` — split view (Section 4)

The family route passes `"caregiver"`. A standalone child session route passes `"child"`. The SLP teletherapy route passes `"slp"`.

### Hint Button

Taps when the child is stuck or going silent. Client sends:

```ts
{ type: "hint_requested" }
```

via `room.localParticipant.publishData()`. The agent's `entrypoint.ts` listener receives this type and injects a one-turn instruction into the agent's next context: *"The caregiver has requested a hint. Offer a model cue for the current target word without advancing to the next word."*

This moves the agent one step down the cueing hierarchy for the current word only — equivalent to the `model-then-imitate` clinical technique.

### Boost Button

Taps when the child is frustrated or losing energy. Client sends:

```ts
{ type: "boost_requested" }
```

The agent's listener calls `engine.requestBoost()` — a new method on `AdventureSessionEngine` that forces a difficulty retreat identical to the automatic `< 40% for 3 attempts` path. The agent also injects: *"The caregiver has requested encouragement. Give enthusiastic praise and use an easier word next."*

### Agent Response Mechanism

These messages flow client → agent (reverse of the existing `visual_state` direction). The agent's `RoomEvent.DataReceived` listener in `entrypoint.ts` already handles inbound data — it gains a new branch:

```ts
if (msg.type === "hint_requested") { /* inject one-turn hint instruction */ }
if (msg.type === "boost_requested") { engine.requestBoost(); /* inject boost instruction */ }
```

### No Classic Mode Equivalent

Classic Mode's `CaregiverGuidanceStrip` is informational only. Hint and Boost depend on the adventure engine's difficulty controls and make no sense in a static word list session.

### Files Touched

- `adventure-session.tsx` — `viewerRole` prop, caregiver overlay rendering with Hint + Boost buttons
- `tools.ts` — add `hint_requested` and `boost_requested` to `AgentVisualMessage` union
- `livekit/entrypoint.ts` — data channel listener branch for new message types
- `adventure-engine.ts` — new `requestBoost()` method

---

## Section 4: SLP Take Over + Split View (Adventure Teletherapy)

### Problem

The `agent_status` data channel type (`active | paused`) is defined in `tools.ts` but the SLP UI does not exist. The SLP teletherapy context for Adventure Mode is entirely unimplemented.

### Split View Layout

When `viewerRole === "slp"`, the component renders a two-column layout:

**Left (60%) — Child view mirror**
Identical to the child's adventure session screen. Same image card, same prompt state card, same progress trail. Updates in real time from the same data channel messages. SLP sees exactly what the child sees.

**Right (40%) — Live clinical panel**
- Current target word, tier, and difficulty level (e.g. "roar · phrase · difficulty 3")
- Rolling 5-attempt accuracy window (e.g. "4/5 correct")
- Per-sound breakdown for the session so far (e.g. "/r/ — 18 attempts, 72% correct")
- Current adaptation state label: "Advancing" / "Holding" / "Retreating"

The right panel updates every time `visual_state` or a word result fires. All data is already tracked client-side in `AdventureSessionEngine` state — this is a rendering surface, not new data collection.

### Take Over Button

A clearly labeled button in the top-right of the SLP split view.

**On press:**
1. Client publishes `{ type: "agent_status", status: "paused" }` via data channel
2. `entrypoint.ts` listener receives it and calls `agent.mute()` — agent stops speaking mid-session
3. SLP's microphone is already live in the LiveKit room; they speak directly to the child
4. Caregiver screen shows a quiet status badge: "Your therapist is speaking" — rendered when `agent_status: "paused"` arrives

**On release (Resume button):**
1. Client publishes `{ type: "agent_status", status: "active" }` 
2. `entrypoint.ts` calls `agent.unmute()` — agent resumes from the same word it was on
3. Caregiver badge clears

### Session Start Flow

SLP starts an Adventure session from the patient's speech coach tab (existing flow). A shareable room link is sent to the caregiver via the existing invite mechanism. The caregiver's device joins as `"caregiver"` context. The SLP's device joins as `"slp"` context. The child uses the caregiver's device (same device, no separate child join). Three roles, one room, one data channel.

### Classic Mode

Classic Mode teletherapy uses the existing video call feature. The SLP split view is Adventure-specific for this sprint.

### Files Touched

- `adventure-session.tsx` — split layout when `viewerRole === "slp"`, live clinical panel component
- `livekit/entrypoint.ts` — mute/unmute handling on `agent_status` message
- Caregiver overlay in `adventure-session.tsx` — "Your therapist is speaking" badge on `agent_status: "paused"`

---

## Schema Changes Summary

| Table | Change | Purpose | Section |
|---|---|---|---|
| `adventureThemes` | Add `bannerUrl: v.optional(v.string())` | Pre-generated theme art | 2 |

No other schema changes. All new data flows through existing fields or is handled at the application layer.

---

## Complexity Summary

| Section | Complexity | Key risk |
|---|---|---|
| Shared visual layer | Medium | `processAgentMessage` debounce must not break fast sessions; image pre-generation is a one-time migration |
| Seed data expansion | Low | Content work — no new infrastructure. Seed mutation is idempotent. |
| Caregiver Hint + Boost | Low | Data channel direction is reversed (client → agent); must confirm `entrypoint.ts` listener handles inbound correctly |
| SLP split view + Take Over | Medium | `agent.mute()` / `agent.unmute()` API must be verified against current LiveKit agents SDK version |

---

## What Is Explicitly Out of Scope

- SLP custom adventure themes (system-curated only)
- Additional sounds beyond `/s/`, `/r/`, `/l/`, `/sh/`, `/ch/`
- Themes beyond dinosaurs, ocean, space
- Classic Mode caregiver Hint/Boost (no adaptive engine)
- Classic Mode SLP split view (handled by video teletherapy feature)
- Multiplayer or sibling sessions
- Audio playback of child's session attempts
