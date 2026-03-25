# Builder Agent Enhancement: Image Gen, TTS/STT, Templates, Publish

**Date:** 2026-03-25
**Status:** Approved
**Scope:** One unified spec, 3 implementation waves

## Decision Summary

| Decision | Choice |
|----------|--------|
| Scope | One unified spec, 3 implementation waves |
| Publish | Vercel Deploy API (static export) |
| Image gen | Google Nano Banana Pro (`@google/genai`) |
| TTS | ElevenLabs (upgrade to `eleven_flash_v2_5`) |
| STT | ElevenLabs speech-to-text API |
| Templates page | Static thumbnails + hover description + click-to-build |
| Quality guarantee | Pre-built therapy component library — agent composes from beautiful building blocks |
| Template types | Communication Board, Visual Schedule, Token Board, Social Story |

---

## Wave 1: Plumbing (Component Library + Agent Tools + Bridges)

### 1.1 Therapy Component Library (WebContainer Template)

All components and hooks are pre-installed in the WebContainer template (`webcontainer-files.ts`). The AI agent imports and composes them — it does NOT generate raw UI code for therapy patterns.

**Template dependency note:** The `motion` package (framer-motion) must be added to the WebContainer template's `package.json` dependencies for animation-heavy components (`CelebrationOverlay`, `TokenSlot` earn animation). It is already listed in the main app's dependencies but needs to be in the WebContainer template's own dependency list. Alternatively, components can use CSS-only animations (`@keyframes` + `animation`) to avoid the extra dependency — this is lighter but less flexible.

#### Primitive Components (`src/components/`)

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `<TapCard>` | Tappable picture card with image + label | `image`, `label`, `onTap`, `size`, `highlighted` |
| `<SentenceStrip>` | Horizontal bar showing selected words, plays full sentence | `words[]`, `onPlay`, `onClear` |
| `<BoardGrid>` | Responsive grid container with configurable columns | `columns`, `gap`, `children` |
| `<StepItem>` | A single schedule step with image, text, completion state | `image`, `label`, `status`, `onComplete` |
| `<PageViewer>` | Swipeable page-by-page viewer (for social stories) | `pages[]`, `onPageChange` |
| `<TokenSlot>` | A single token (filled/empty) with earn animation | `filled`, `icon`, `onEarn` |
| `<CelebrationOverlay>` | Confetti/stars burst for completions | `trigger`, `intensity` |
| `<RewardPicker>` | Shows 2-4 reward options for token boards | `rewards[]`, `onSelect` |

#### Composed Template Components

| Component | Composes | Purpose |
|-----------|----------|---------|
| `<CommunicationBoard>` | `BoardGrid` + `TapCard` + `SentenceStrip` | Full AAC board with tap-to-speak |
| `<VisualSchedule>` | `StepItem` list + completion tracking | Vertical/horizontal routine chart |
| `<TokenBoard>` | `TokenSlot` row + `RewardPicker` + `CelebrationOverlay` | Reward system with configurable token count |
| `<SocialStory>` | `PageViewer` + TTS per page | Sequential story viewer with read-aloud |

#### Pre-built Hooks (`src/hooks/`)

**Runtime hooks** (used by generated apps inside the iframe, communicate with parent via PostMessage):

| Hook | Purpose | Bridge Pattern |
|------|---------|----------------|
| `useTTS()` | `speak(text)` -> parent `postMessage` -> Convex -> ElevenLabs | Returns `{ speak, speaking }` |
| `useSTT()` | `startListening()` -> parent `postMessage` -> ElevenLabs STT | Returns `{ transcript, listening, startListening, stopListening }` |
| `useLocalStorage()` | Already exists | Persistence across sessions |
| `useSound()` | Already exists | Tap feedback sounds |

**Build-time vs. Runtime distinction:**
- **Images and pre-generated audio** are created at **build time** by the agent calling `generate_image` and `generate_speech` tools. The resulting CDN URLs are baked into the generated code as constants. No runtime image generation needed.
- **`useTTS()`** is a **runtime hook** for dynamic speech — e.g., the sentence strip composing new sentences the agent couldn't predict. It uses the PostMessage bridge to call ElevenLabs via the parent.
- **`useSTT()`** is a **runtime hook** for live microphone input. Only active when the agent called `enable_speech_input`.
- **Published apps (Wave 3):** `useTTS()` and `useSTT()` will NOT work in published standalone apps (no parent bridge). Pre-generated audio URLs still play fine. The hooks gracefully no-op when no parent bridge responds (timeout fallback).

**Removed from hooks:** `useTherapyImages()` — images are always generated at build time by the agent tool and embedded as URLs. No runtime image generation needed.

#### How the Agent Uses Components

```tsx
// Example: AI-generated communication board (what App.tsx looks like)
import { CommunicationBoard } from "./components/CommunicationBoard";

const CARDS = [
  { label: "I want", category: "core", image: "https://convex.cloud/...", audio: "https://convex.cloud/..." },
  { label: "Help", category: "core", image: "https://convex.cloud/...", audio: "https://convex.cloud/..." },
];

export default function App() {
  return <CommunicationBoard cards={CARDS} columns={3} showSentenceStrip />;
}
```

### 1.2 Agent Tools (via `@anthropic-ai/sdk`)

The builder agent in `route.ts` currently has one tool (`write_file`). Three new tools are added.

#### Multi-turn Tool Loop (Critical Architecture Change)

The current `route.ts` uses a single-turn streaming call — Claude generates, emits `write_file` tool calls, and stops. With the new tools, the agent needs to call `generate_image` / `generate_speech` multiple times **before** writing code, then continue to `write_file`. This requires a **multi-turn tool loop**:

1. Start streaming from Claude with all 4 tools available
2. When Claude emits `stop_reason: "tool_use"` (not `"end_turn"`):
   - Execute each pending tool call (image gen, speech gen, etc.)
   - Emit SSE progress events to the frontend (`image_generated`, `speech_generated`)
   - Send tool results back to Claude as a new message with `role: "user"` containing `tool_result` blocks
   - Resume streaming from Claude (it continues generating with the URLs it now has)
3. Repeat until Claude emits `stop_reason: "end_turn"` (all code written, generation complete)

This is the same pattern as `anthropic.beta.messages.toolRunner()` but implemented manually to support SSE streaming. The existing single-turn handler becomes the inner loop of a while loop that runs until `stop_reason === "end_turn"`.

#### `generate_image`

```typescript
{
  name: "generate_image",
  description: "Generate a therapy-friendly illustration. Returns a CDN URL. Use for picture cards, schedule icons, emotion faces, and any visual content in therapy apps.",
  input_schema: {
    type: "object",
    properties: {
      label: { type: "string", description: "What to illustrate (e.g., 'happy face', 'brush teeth', 'apple')" },
      category: { type: "string", enum: ["emotions", "daily-activities", "animals", "food", "objects", "people", "places"], description: "Image category for style consistency" }
    },
    required: ["label", "category"]
  }
}
```

**Backend:** Convex `generateTherapyImage` action -> checks `imageCache` (SHA-256 prompt hash) -> cache miss calls Nano Banana Pro via `@google/genai` -> stores in Convex file storage -> caches URL.

**Prompt template per category:**
- Base: `"Simple, clear illustration of '{label}', flat design, bold black outlines, solid colors, white background, child-friendly, Kawaii style, minimal detail, high contrast, no text, no watermark"`
- Emotions: `+ "facial expression, round cartoon face"`
- Daily activities: `+ "single action scene, simple background"`
- Animals: `+ "cute cartoon animal, front-facing"`
- Food: `+ "single food item, appetizing colors"`
- Objects/People/Places: `+ "single subject, centered"`

#### `generate_speech`

```typescript
{
  name: "generate_speech",
  description: "Generate text-to-speech audio for a word or phrase. Returns a CDN URL to an MP3. Use for communication board labels, social story narration, schedule step names, and any spoken content.",
  input_schema: {
    type: "object",
    properties: {
      text: { type: "string", description: "Text to speak" },
      voice: { type: "string", enum: ["warm-female", "calm-male", "child-friendly"], description: "Voice style" }
    },
    required: ["text"]
  }
}
```

**Backend:** Existing Convex `generateSpeech` action -> checks `ttsCache` -> cache miss calls ElevenLabs `eleven_flash_v2_5` -> stores in Convex file storage -> caches URL.

**Voice mapping** (friendly name -> ElevenLabs voice ID):
- `warm-female` -> `21m00Tcm4TlvDq8ikWAM` (Rachel — default, calm and clear)
- `calm-male` -> `pNInz6obpgDQGcFmaJgB` (Adam)
- `child-friendly` -> TBD at implementation (select from ElevenLabs voice library for clarity with young listeners)

The mapping layer lives in the `generateSpeech` Convex action — the agent passes friendly names, the action resolves to voice IDs. The existing action currently takes a raw `voiceId`; add a `voice` arg that maps to IDs, with `voiceId` as a fallback for backward compatibility.

**Image generation model note:** "Nano Banana Pro" refers to Gemini's image generation via the `@google/genai` SDK (model: `gemini-2.0-flash-exp` or latest image-capable model). This replaces the existing `imagen-3.0-generate-002` REST call in `convex/aiActions.ts` with the newer SDK-based approach.

#### `enable_speech_input`

```typescript
{
  name: "enable_speech_input",
  description: "Marks this app as speech-input-enabled. The useSTT() hook will be active and the parent bridge will handle microphone access and ElevenLabs transcription.",
  input_schema: {
    type: "object",
    properties: {
      purpose: { type: "string", description: "What speech input is used for (e.g., 'voice commands', 'narration recording')" }
    },
    required: ["purpose"]
  }
}
```

**Backend:** Sets a flag on the session record. The parent PostMessage bridge only activates mic permissions when this flag is set.

### 1.3 Image Cache Schema

New table in `convex/schema.ts`:

```typescript
imageCache: defineTable({
  promptHash: v.string(),
  prompt: v.string(),
  label: v.string(),
  category: v.string(),
  storageId: v.id("_storage"),
  imageUrl: v.string(),
  model: v.string(),
  createdAt: v.number(),
}).index("by_promptHash", ["promptHash"])
  .index("by_label_category", ["label", "category"])
```

### 1.4 PostMessage Bridge (Parent Side)

The builder's preview iframe component adds event listeners:

| Message from iframe | Parent action | Response to iframe |
|--------------------|---------------|-------------------|
| `tts-request` `{ text, voice }` | Calls Convex `generateSpeech` | `tts-response` `{ text, audioUrl }` |
| `stt-start` | Captures audio via `MediaRecorder`, sends to Convex `transcribeSpeech` | `stt-result` `{ transcript }` / `stt-interim` `{ transcript }` |
| `stt-stop` | Stops `MediaRecorder` | - |

Note: No `image-request` bridge — images are generated at build time by the agent tool, not at runtime.

### 1.5 STT Backend

New Convex action in `convex/aiActions.ts`:

```typescript
transcribeSpeech({ audioBase64: string }) -> { transcript: string }
```

Calls ElevenLabs speech-to-text API, returns transcript text.

### 1.6 SSE Events (Updated)

New events added to the streaming response:
- `image_generated` — emitted when `generate_image` completes (progress: "Generated image: happy face")
- `speech_generated` — emitted when `generate_speech` completes
- `stt_enabled` — emitted when speech input is activated

Builder UI shows progress feed: "Generating images... 3/9" alongside code streaming.

### 1.7 Updated Agent System Prompt

Added to `agent-prompt.ts`:

1. **Tool awareness** — documents all 4 tools and when to use each
2. **Component library instructions** — lists all available components/hooks, instructs agent to compose rather than build from scratch
3. **Therapy design rules (strict):**
   - Tap targets: minimum 60px for children, 44px for therapist controls
   - Fonts: Nunito headings, Inter body, never decorative
   - Colors: therapy design tokens only
   - Animations: `cubic-bezier(0.4, 0, 0.2, 1)`, minimum 300ms, never flash/strobe
   - Celebrations: brief and calm (stars/confetti, never loud or flashing)
   - Layout: mobile-first, portrait + landscape
   - Accessibility: 4.5:1 contrast minimum, clear labels on all interactive elements
   - Language: "app" not "tool", therapy-friendly, no developer jargon
4. **Generation workflow:**
   1. Identify images needed -> call `generate_image` for each
   2. Identify audio needed -> call `generate_speech` for each
   3. If voice input needed -> call `enable_speech_input`
   4. Write `App.tsx` composing pre-built components with generated URLs
   5. Only write custom code for app-specific logic

---

## Wave 2: Content & Guardrails (Templates + Pre-seeding)

### 2.1 Four Templates

Each template is a starter prompt + pre-rendered thumbnail + metadata stored in the `therapyTemplates` table.

#### Template 1: Communication Board (AAC)

**Starter prompt:** "Build a communication board for a nonverbal child. Include a 3x3 grid with core words (I want, help, more, stop, yes, no, eat, drink, play). Each card has a picture and label. Tapping a card speaks the word aloud and adds it to a sentence strip at the top. The sentence strip has a play button to speak the full sentence and a clear button."

- **Category:** `communication`
- **Components:** `CommunicationBoard` -> `BoardGrid` + `TapCard` + `SentenceStrip`
- **Agent tools:** `generate_image` x9, `generate_speech` x9 + sentence combos
- **Thumbnail:** 3x3 grid of colorful Kawaii-style picture cards with sentence strip visible

#### Template 2: Visual Schedule (Morning Routine)

**Starter prompt:** "Build a morning routine visual schedule for a 5-year-old. Include 6 steps: wake up, use toilet, brush teeth, get dressed, eat breakfast, put on shoes. Each step has a picture, label, and a checkmark button. Completed steps show a green checkmark. A 'Now' arrow highlights the current step. When all steps are done, show a calm celebration."

- **Category:** `schedule`
- **Components:** `VisualSchedule` -> `StepItem` list + `CelebrationOverlay`
- **Agent tools:** `generate_image` x6, `generate_speech` x6
- **Thumbnail:** Vertical strip of 6 steps, "Now" arrow on step 3, first 2 checked off

#### Template 3: Token Board (5-Star Reward)

**Starter prompt:** "Build a 5-star token board. The therapist taps to award a gold star when the child completes a task. Stars fill in left to right with a pop animation. Before starting, the child picks a reward from 3 options (screen time, snack, playground). When all 5 stars are earned, show the chosen reward with a celebration animation and a reset button."

- **Category:** `reward`
- **Components:** `TokenBoard` -> `TokenSlot` x5 + `RewardPicker` + `CelebrationOverlay`
- **Agent tools:** `generate_image` x3 (rewards), `generate_speech` x3
- **Thumbnail:** 5 star slots (3 filled gold, 2 empty), reward card visible below

#### Template 4: Social Story (Going to the Dentist)

**Starter prompt:** "Build a social story about going to the dentist for a young child with autism. Include 6 pages: 1) Today I am going to the dentist, 2) The waiting room has chairs and magazines, 3) The dentist will look at my teeth with a small mirror, 4) I might hear buzzing sounds -- that's okay, 5) I will try to sit still and the dentist will be gentle, 6) When it's done, I did a great job! Each page has a large illustration on top and 1-2 sentences below, with a read-aloud button."

- **Category:** `social-story`
- **Components:** `SocialStory` -> `PageViewer` + TTS per page
- **Agent tools:** `generate_image` x6, `generate_speech` x6
- **Thumbnail:** Single page view with illustration + text, page dots at bottom

### 2.2 Templates Page UI

Location: `/templates` (or existing templates section)

- **4 cards** in a responsive 2x2 grid (mobile: 1-column stack)
- Each card:
  - Beautiful static thumbnail (pre-rendered screenshot stored in Convex file storage)
  - Template name in bold
  - On hover/tap: thumbnail dims slightly, overlay shows 1-2 sentence description
  - Click -> navigates to `/builder?prompt={encodedStarterPrompt}` -> auto-fills chat -> auto-submits -> user watches the app get built in real time

### 2.3 Schema Update for Templates

Add to `therapyTemplates` table:
- `thumbnailStorageId: v.optional(v.id("_storage"))` — reference to pre-rendered screenshot
- `thumbnailUrl: v.optional(v.string())` — CDN URL for the thumbnail

Consolidate existing 8 seed templates to these 4 high-quality ones (the others were variations of these core types).

### 2.4 Pre-seed Image Cache

Batch-generate the ~50 most common therapy images on first deploy. Guard with a cache check — skip seeding if images already exist (check `imageCache` count > 0). Estimated cost: ~50 Nano Banana calls, well within free tier (~500/day).

Images to pre-seed:
- **Emotions:** happy, sad, angry, scared, tired, excited, calm, worried, surprised, proud
- **Core words:** want, help, more, stop, yes, no, go, play, eat, drink, open, close
- **Daily activities:** wake up, brush teeth, get dressed, eat breakfast, go to school, bath, sleep, wash hands
- **Food:** apple, banana, juice, milk, water, cookie, cracker, cereal
- **Animals:** cat, dog, fish, bird, rabbit, bear
- **Objects:** ball, book, toy, tablet, blanket, cup

This makes most template builds instant cache hits.

---

## Wave 3: Publish Pipeline (Vercel Deploy)

### 3.1 Publish Flow

1. User clicks **"Publish"** button in builder toolbar
2. **Publish modal** opens — shows app name, description (editable), "Publish" CTA
3. On confirm:
   - Frontend calls Convex action `publishApp`
   - Action collects all generated files for the session from `files` table
   - Action sends source files + `vercel.json` to Vercel Deploy API (Vercel runs the Vite build)
   - Returns the live URL
4. Modal transitions to **success state** — live URL, copy button, QR code, share buttons
5. Convex mutation updates `apps` record with `publishedUrl`

### 3.2 Convex Action: `publishApp`

New file: `convex/publish.ts`

```
publishApp({ sessionId, title, description })
  1. Fetch all files from `files` table for this session
  2. Assemble source files + WebContainer template files + vercel.json config
  3. POST to Vercel Deploy API (https://api.vercel.com/v13/deployments)
     - project: "bridges-published-tools" (dedicated Vercel project)
     - files: source files array
     - Vercel handles the Vite build
  4. Return { deploymentUrl, shareSlug }
  5. Update apps table with publishedUrl via ctx.runMutation
```

### 3.3 Published App Characteristics

- **Fully standalone** — no dependency on Bridges, WebContainer, or Convex at runtime
- All images are Convex CDN URLs (persist while storage entry exists)
- All audio is Convex CDN URLs (same)
- Pure React + Tailwind, no backend calls
- Pre-generated TTS audio plays from URLs; dynamic TTS/STT is builder-only
- Works on any device with a modern browser

### 3.4 Environment Variables

- `VERCEL_TOKEN` — API token for Vercel Deploy API
- `VERCEL_PROJECT_ID` — project ID for "bridges-published-tools"
- `VERCEL_TEAM_ID` — team ID (if using a Vercel team)

Store in Convex env vars dashboard.

### 3.5 Published Tool Viewer

Existing `/tool/{shareSlug}` page (`SharedToolPage`) already renders an iframe. For published apps, set iframe `src` to the Vercel deployment URL instead of a WebContainer preview URL.

---

## Files Modified / Created

### New Files
- `src/features/builder/hooks/use-postmessage-bridge.ts` — parent-side PostMessage bridge
- `convex/image_generation.ts` — `generateTherapyImage` action with cache
- `convex/image_cache.ts` — imageCache queries/mutations
- `convex/publish.ts` — `publishApp` action (Vercel Deploy API)
- `convex/stt.ts` — `transcribeSpeech` action (ElevenLabs STT)
- WebContainer template components (8 primitives + 4 composed): added to `webcontainer-files.ts`
- WebContainer template hooks (useTTS, useSTT): added to `webcontainer-files.ts`

### Modified Files
- `convex/schema.ts` — add `imageCache` table, update `therapyTemplates` table
- `convex/aiActions.ts` — upgrade TTS model to `eleven_flash_v2_5`
- `src/app/api/generate/route.ts` — add 3 new agent tools, handle tool_use for image/speech/stt
- `src/app/api/generate/sse.ts` — add new SSE event types
- `src/features/builder/lib/agent-prompt.ts` — expanded system prompt (tools, components, design rules)
- `src/features/builder/hooks/use-streaming.ts` — handle new SSE events (image_generated, speech_generated)
- `src/features/builder/hooks/webcontainer-files.ts` — add all component/hook source code to template
- `src/features/builder/components/preview-panel.tsx` — add iframe `allow="microphone"`, PostMessage bridge
- `src/features/builder/components/publish-success-modal.tsx` — wire to real publish action
- `src/features/templates/` — redesign template page (2x2 grid, thumbnails, hover, click-to-build)
- `convex/templates/therapy_seeds.ts` — consolidate to 4 high-quality templates with thumbnails
- `src/features/shared-tool/components/shared-tool-page.tsx` — support Vercel deployment URLs
