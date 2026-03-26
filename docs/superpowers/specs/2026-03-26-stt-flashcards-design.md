# STT Voice Input + Flashcard Creator — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Approach:** Shared Chat Core + Flashcard Feature Slice

---

## Overview

Two new features for Bridges:

1. **STT Voice Input** — A lightweight mic button using the browser's `MediaRecorder` API + the existing ElevenLabs `scribe_v2` STT backend (`convex/stt.ts`), enabling speech-to-text across the app. No new dependencies.
2. **Flashcard Creator** — A new `/flashcards` page with a deck-based organization system where an AI agent generates image+word flashcards for speech-language therapy, using the same chat infrastructure as the builder.

---

## Feature 1: STT Voice Input

### Approach

Uses the browser's `MediaRecorder` API to capture audio, then sends it to the existing `convex/stt.ts` `transcribeSpeech` action (ElevenLabs `scribe_v2`). No new packages or ElevenLabs agents needed — the backend is already built.

### Hook: `useMediaRecorder`

- **Location:** `src/shared/hooks/use-media-recorder.ts`
- **Returns:** `{ isRecording, startRecording, stopRecording, audioBlob }`
- **Behavior:** Requests mic permission via `navigator.mediaDevices.getUserMedia({ audio: true })`, records as `audio/webm`, returns base64-encoded blob on stop
- **Error handling:** Catches `NotAllowedError` (mic permission denied) and `NotFoundError` (no mic) — surfaces user-friendly toast via sonner

### Component: `<VoiceInput>`

- **Location:** `src/shared/components/voice-input.tsx`
- **Shared between:** Builder ChatPanel + Flashcard chat panel
- **Props:**
  - `onTranscript: (text: string) => void` — callback when transcription completes
  - `disabled?: boolean` — disables mic during generation
- **Renders:** A mic icon button inline with the text input
- **Visual states:**
  - Idle: mic icon (muted color)
  - Listening: pulsing animation (primary color), recording indicator
  - Processing: spinner (while waiting for `transcribeSpeech` response)
  - Error: brief red flash + toast for mic permission denied
- **Flow:**
  1. User taps mic → `useMediaRecorder.startRecording()`
  2. User taps again (or silence timeout ~3s) → `stopRecording()` → gets audio blob
  3. Converts blob to base64 → calls `transcribeSpeech` Convex action
  4. Receives transcript → calls `onTranscript(text)` → text fills input

### Integration Points

- `src/features/builder/components/chat-panel.tsx` — add `<VoiceInput>` next to send button
- `src/features/flashcards/components/flashcard-chat-panel.tsx` — same placement

---

## Feature 2: Flashcard Creator

### Data Model

#### `flashcardDecks` table

| Field | Type | Purpose |
|-------|------|---------|
| `userId` | `v.optional(v.string())` | Owner (optional until auth phase) |
| `title` | `v.string()` | Deck name, e.g., "Colors" |
| `description` | `v.optional(v.string())` | Short description |
| `sessionId` | `v.id("sessions")` | Links to the chat session that created it |
| `cardCount` | `v.number()` | Denormalized count for display. Must be decremented on card deletion. |
| `coverImageUrl` | `v.optional(v.string())` | First card's image as deck thumbnail |

**Indexes:** `by_user` (`userId`), `by_session` (`sessionId`)

#### `flashcards` table

| Field | Type | Purpose |
|-------|------|---------|
| `deckId` | `v.id("flashcardDecks")` | Parent deck |
| `label` | `v.string()` | The word/phrase, e.g., "red ball" |
| `imageUrl` | `v.optional(v.string())` | Generated image URL (optional — uses placeholder on gen failure) |
| `imageStorageId` | `v.optional(v.id("_storage"))` | For cleanup (undefined when image gen failed) |
| `audioUrl` | `v.optional(v.string())` | Pre-generated TTS audio URL |
| `sortOrder` | `v.number()` | Card position in deck |
| `category` | `v.optional(v.string())` | For filtering (colors, animals, etc.) |

**Indexes:** `by_deck` (`deckId`), `by_deck_sortOrder` (`deckId`, `sortOrder`)

### Agent Pipeline

The flashcard agent reuses the builder's streaming infrastructure with a different mode.

#### Route changes

`src/app/api/generate/route.ts` receives a `mode` param:
- `mode: "builder"` (default) — existing behavior
- `mode: "flashcards"` — selects flashcard system prompt and tools

**Schema change:** Add `mode: z.enum(["builder", "flashcards"]).default("builder")` to `GenerateInputSchema` in `src/features/builder/lib/schemas/generate.ts`. The flashcard chat panel passes `mode: "flashcards"` in request body.

#### Session lifecycle for flashcards

- A new session is created on first message (same as builder)
- Session `state` uses the existing state machine: `idle` → `generating` → `live`
- The `query` field stores the user's flashcard request
- Session `type` field: add `v.optional(v.union(v.literal("builder"), v.literal("flashcards")))` to `sessions` schema to distinguish session types

#### Flashcard agent tools

| Tool | Args | Behavior |
|------|------|----------|
| `create_deck` | `title`, `description` | Creates a `flashcardDecks` record. Returns `deckId`. |
| `create_cards` | `deckId`, `cards: [{label, category}]` | **Batch tool.** Generates images + TTS for all cards in parallel via `Promise.allSettled`. Each card: calls `generateTherapyImage(label, category)` for image, calls `generateSpeech(label, "child-friendly")` for audio (reuses `ttsCache` internally — duplicate labels like "cat" across decks won't re-generate). Writes all cards to `flashcards` table. Updates `cardCount`. Failed image gens get a placeholder; failed TTS gets `audioUrl: undefined`. Returns summary of successes/failures. |
| `update_deck` | `deckId`, `title?`, `description?` | Updates deck metadata. |
| `delete_cards` | `deckId`, `labels?: [string]` | Removes specified cards (or all if no labels). Decrements `cardCount`. For v1 — agent-initiated only (no UI delete yet). |

**Why batch:** Individual `create_card` calls would require 1 tool turn per card. A 10-card deck = 12 turns (1 create_deck + 10 create_card + 1 confirm), exceeding `MAX_TOOL_TURNS = 10`. Batching lets Claude call `create_cards` once with all labels, generating images/audio in parallel (~5-8s total instead of 50-70s serial).

#### Flow

1. User types/speaks: "Make me flashcards for farm animals"
2. Request hits `/api/generate` with `mode: "flashcards"`
3. Claude receives flashcard system prompt + 4 tools
4. Claude plans cards, calls `create_deck` once, then `create_cards` with the full batch
5. `create_cards` generates images + TTS in parallel via `Promise.allSettled`, writes to Convex
6. SSE streams progress — preview panel updates in real-time via Convex subscription as cards are written
7. Multi-turn tool loop capped at `MAX_TOOL_TURNS = 10` (batch approach keeps turns low)

#### Error handling

- **Image gen failure:** Card is created with `imageUrl: undefined` and a placeholder image shown in UI. Agent reports which cards failed in tool result.
- **TTS failure:** Card is created without audio. Speaker icon hidden for cards with no `audioUrl`.
- **Partial batch failure:** `Promise.allSettled` ensures successful cards are saved even if some fail. Agent can retry failed cards with a second `create_cards` call.

#### System prompt focus

The flashcard agent knows:
- Therapy vocabulary categories (colors, animals, emotions, daily activities, food, objects, people, places)
- Age-appropriate language and groupings
- Asks clarifying questions when request is vague ("What age group?", "How many cards?")
- Generates cards in logical sequence within a deck

### Page Layout

**Route:** `src/app/(app)/flashcards/page.tsx`

**Navigation:** New 5th sidebar item — `collections_bookmark` Material Symbol icon, label "Flashcards", path `/flashcards`

#### Desktop layout (two-panel split)

```
┌──────────────────────────────────────────────────┐
│  Toolbar: [Back] [Deck name]          [New Deck] │
├───────────────┬──────────────────────────────────┤
│               │                                  │
│  Chat Panel   │   Flashcard Preview Panel        │
│  (30%)        │   (70%)                          │
│               │                                  │
│  Messages     │   ┌────────────────────────┐     │
│  from agent   │   │                        │     │
│  showing      │   │    [generated image]   │     │
│  progress     │   │                        │     │
│               │   │       "cow"            │     │
│               │   │                        │     │
│               │   │          [speaker]     │     │
│               │   └────────────────────────┘     │
│               │                                  │
│               │   ← swipe  ● ● ○ ○ ○  swipe →   │
│               │                                  │
│  [mic] [input...] [send]                         │
│               │   [Deck list drawer]             │
└───────────────┴──────────────────────────────────┘
```

#### Right panel states

- **Empty state:** "Describe flashcards you want to create" + suggestion chips ("Colors", "Farm Animals", "Feelings")
- **Generating:** Cards appear one by one as agent creates them (real-time Convex subscription)
- **Browsing:** Swipe-through with touch/mouse drag + arrow keys
- **Deck list:** Collapsible drawer showing all decks with thumbnails and card counts

#### Card component

- Generated image (square, rounded corners, fills most of card)
- Word label below image (large, Manrope 600, high contrast)
- Speaker icon bottom-right (tap → TTS playback via `use-sound` + existing `generateSpeech`)
- Card number indicator ("3 of 8")

#### Mobile

- Flashcard viewer takes full screen by default
- Floating chat button (bottom-right, primary gradient) opens chat as a bottom sheet overlay
- During generation: bottom sheet auto-opens showing agent progress; cards appear behind it in real-time
- User can dismiss bottom sheet to see cards full-screen, re-open via floating button
- Swipe gestures work natively on card viewer
- Deck list accessible via hamburger menu or swipe-right gesture

#### Swipe implementation

CSS `scroll-snap-type: x mandatory` + touch event handlers in `use-deck-navigation.ts` hook. No external swiper library needed.

### Stitch Design

The flashcard page will be generated via Stitch MCP to match the existing "Digital Sanctuary" design system:
- Tonal surface hierarchy (no 1px borders)
- Gradient CTA buttons (primary → primary-container at 135deg)
- Manrope (headings) + Inter (body) typography
- Animations >= 300ms with `cubic-bezier(0.4, 0, 0.2, 1)`

---

## File Structure

### New files

```
src/features/flashcards/
├── components/
│   ├── flashcard-page.tsx            # Main page orchestrator
│   ├── flashcard-chat-panel.tsx      # Chat panel for flashcard mode
│   ├── flashcard-preview-panel.tsx   # Card viewer + deck list
│   ├── flashcard-card.tsx            # Single card (image + label + speaker)
│   ├── flashcard-swiper.tsx          # Swipe container with scroll-snap
│   ├── deck-list.tsx                 # Collapsible deck browser
│   ├── deck-card.tsx                 # Deck thumbnail in list
│   └── suggestion-chips.tsx          # Empty state suggestions
├── hooks/
│   ├── use-flashcard-streaming.ts    # SSE hook for flashcard mode
│   └── use-deck-navigation.ts       # Swipe state, keyboard nav
├── lib/
│   └── flashcard-prompt.ts           # System prompt for flashcard agent
└── __tests__/

src/shared/components/
└── voice-input.tsx                   # Mic button (MediaRecorder + transcribeSpeech)

src/shared/hooks/
└── use-media-recorder.ts             # Browser MediaRecorder hook

src/app/(app)/flashcards/
└── page.tsx                          # Thin wrapper

convex/
├── flashcard_decks.ts                # Deck CRUD
└── flashcard_cards.ts                # Card CRUD (includes batch create)
```

### Modified files

- `convex/schema.ts` — add `flashcardDecks` + `flashcards` tables, add `type` field to `sessions`
- `src/features/builder/lib/schemas/generate.ts` — add `mode` to `GenerateInputSchema`
- `src/app/api/generate/route.ts` — add `mode` param, flashcard tools, prompt selection
- `src/shared/lib/navigation.ts` — add Flashcards nav item
- `src/shared/lib/__tests__/navigation.test.ts` — update expected nav item count from 4 to 5
- `src/features/builder/components/chat-panel.tsx` — add `<VoiceInput>`

### New dependencies

None. Uses browser `MediaRecorder` API + existing `convex/stt.ts` backend.

---

## Decisions Made

| Decision | Choice | Why |
|----------|--------|-----|
| STT approach | Browser MediaRecorder + existing `convex/stt.ts` | No new deps, reuses proven backend, simpler than `@11labs/react` Conversational AI which is designed for voice agents not transcription |
| Flashcard organization | Deck-based | Therapists group materials by learning objective |
| Card interaction | Image + word overlay (no flip) | Simple, clean, accessible for young learners |
| TTS on cards | Yes, speaker icon | Essential for speech-language therapy |
| Architecture | Shared chat core + feature slice | Max code reuse, consistent UX, one streaming pipeline |
| Swipe implementation | CSS scroll-snap | No external dependency for simple horizontal scroll |
| Page design | Stitch-generated | Matches existing Digital Sanctuary design system |
