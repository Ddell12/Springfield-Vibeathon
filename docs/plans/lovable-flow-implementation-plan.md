# Bridges — Lovable-Style Builder UX Implementation Plan

## Executive Summary

This plan transforms the Bridges builder from a basic split-panel chat into a **Lovable-inspired full journey** — from a cinematic home prompt screen through an AI thinking/building phase to a live preview with iteration. The goal: a parent types what they need, watches the AI think through design decisions, sees files being written in real-time, and gets a working therapy tool they can share — all feeling like magic.

---

## Phase Map

| Phase | Name | What Ships | Est. Effort |
|-------|------|-----------|-------------|
| A | Prompt Home Screen | Cinematic centered prompt input replacing the marketing landing page's CTA flow | Medium |
| B | AI Thinking & Design Direction | Visible AI reasoning phase — design direction, feature list, thinking timer | Medium |
| C | File Progress Indicators | Real-time stream-driven progress steps during generation | Small |
| D | Loading Feature Cards | Rotating therapy-aware tip cards in the preview pane while building | Small |
| E | Completion UX & Suggested Actions | "What's next?" section with smart action chips after tool generation | Medium |
| F | Polish & Transitions | Page transitions, animations, responsive refinements | Medium |

---

## Phase A: Prompt Home Screen

### What Lovable Does (Screenshots 0–1)
- Full-screen gradient background (blue/white/pink blend)
- Centered greeting: "Time to ship, {name}" or "Let's create, {name}"
- Large text input with placeholder: "Ask Lovable to create a landing page for my..."
- Action bar below input: `+ Attach`, `Theme ▼`, `Chat`, audio icon, send button
- Templates section at bottom edge
- Left sidebar with navigation (Home, Search, Projects, Starred, Shared, Discover, Templates, Learn)

### What Bridges Should Build

**New route behavior:** The `/builder` route starts in "prompt mode" (full-screen centered input). After the user submits their first message, it transitions into "builder mode" (split-panel chat + preview). This is the key UX difference — the prompt IS the landing experience for the builder.

**Files to create/modify:**

```
src/features/builder-v2/components/prompt-home.tsx        — New: full-screen prompt view (includes cinematic input + action bar inline)
src/app/(app)/builder/page.tsx                             — Modify: add prompt-mode vs builder-mode state
```

**Tests:**
```
src/features/builder-v2/components/__tests__/prompt-home.test.tsx  — New: prompt home rendering, template card clicks, submit flow
```

**Component: `PromptHome`**
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│              (subtle gradient background)                │
│                                                          │
│         "What does your child need today?"               │  ← greeting, therapy-aware
│                                                          │
│    ┌────────────────────────────────────────────────┐    │
│    │ Describe the therapy tool you need...          │    │  ← large textarea
│    │                                                │    │
│    │  [+ Attach]  [Templates ▼]           [Send ▶] │    │  ← action bar
│    └────────────────────────────────────────────────┘    │
│                                                          │
│         "Or start from a template"                       │
│    ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐              │
│    │Token │  │Visual│  │Comm  │  │Choice│              │  ← template quick-starts
│    │Board │  │Sched │  │Board │  │Board │              │
│    └──────┘  └──────┘  └──────┘  └──────┘              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Design details:**
- Background: Use Bridges' primary gradient (`from-primary/5 via-surface to-secondary/5`) with subtle animated blob shapes (CSS only, no JS animation)
- Greeting: Use therapy-aware language — "What does your child need today?" or "Tell me what to build — I'll handle everything."
- Input: Oversized textarea (not the small chat input), minimum 80px tall, soft shadow, rounded-2xl
- Action bar: Attach (for uploading reference images — deferred functionality), Templates dropdown (links to quick-starts), Send button with Bridges gradient
- Template quick-starts: 4 horizontal cards showing the 5 tool types with icons. Clicking one pre-fills the prompt with a starter message and auto-submits
- Transition: On send, animate the prompt card upward and morph into the chat panel (use `motion` layoutId or CSS transitions)

> **Note on template entry points:** The PromptHome template cards use the `onSubmit` prop directly (appropriate since the component is already inside the builder page). For external entry points (e.g., landing page CTA linking to `/builder?prompt=...`), the existing `useTemplateStarter` hook in `src/features/builder-v2/hooks/use-template-starter.ts` already handles `?prompt=` URL params — no duplication needed.

**State management:**
```typescript
// In builder page
const [mode, setMode] = useState<"prompt" | "building">("prompt");

// When user submits from PromptHome:
// 1. setMode("building") — triggers layout transition
// 2. Pass the message to Chat component as initialMessage
// 3. Chat auto-submits to /api/chat/generate
```

**Responsive behavior:**
- Desktop: prompt centered in viewport, max-width 700px
- Mobile: prompt fills width with 16px padding, templates scroll horizontally

---

## Phase B: AI Thinking & Design Direction

### What Lovable Does (Screenshots 2–6)
- Left panel shows: user's original prompt (quoted), "Thinking" indicator with timer, then streams the AI's plan
- Plan includes: "Design Direction:" with bullet points (colors, fonts, spacing, animations), "Features for V1:" with bullet points
- After planning: "Let me build this:" followed by file edit indicators
- Right panel: "Getting ready..." spinner while code generates

### What Bridges Should Build

**The key insight:** Lovable uses a two-phase generation. Phase 1: AI creates a design plan (streamed text). Phase 2: AI generates code based on that plan. Bridges should replicate this with a therapy-aware twist.

**New API route:** `/api/chat/plan`

This route uses `streamText` (not `streamObject`) to generate a visible design plan before code generation begins. The plan is displayed in the chat, giving users something meaningful to watch.

**Files to create/modify:**

```
src/app/api/chat/plan/route.ts                             — New: planning phase API
src/features/builder-v2/components/chat.tsx                 — Modify: two-phase generation, add message type field
src/features/builder-v2/components/chat-message.tsx         — Modify: render based on message type instead of string matching
src/features/builder-v2/components/thinking-state.tsx       — Modify: add live elapsed timer, isComplete prop, pulsing dot animation
src/features/builder-v2/components/design-plan.tsx          — New: renders the plan with formatting
src/features/builder-v2/lib/prompt.ts                       — Modify: add planning prompt
```

**Tests:**
```
src/features/builder-v2/components/__tests__/design-plan.test.tsx   — New: plan section parsing, header detection, bullet rendering
src/features/builder-v2/components/__tests__/thinking-state.test.tsx — New/extend: timer ticking, isComplete transition, pulsing dot
```

**Planning prompt (`getPlanningSystemPrompt`):**
```
You are the design brain behind Bridges, an AI therapy tool builder.

Given a parent's or therapist's description, produce a concise build plan:

1. **Tool Type** — Which component (visual-schedule, token-board, communication-board, choice-board, first-then-board) best fits, or if this needs a custom generated app.

2. **Design Direction** (3–5 bullets):
   - Color palette and mood
   - Layout approach
   - Icon/image style
   - Interaction patterns
   - Accessibility considerations

3. **Features for V1** (4–7 bullets):
   - Core interactive elements
   - Specific content items (from the user's description)
   - Any TTS or animation needs

4. **Child Profile** (inferred):
   - Approximate age/level
   - Sensory considerations
   - Motivator themes

Keep it under 200 words. Be warm, use therapy language naturally.
End with: "Let me build this now."
```

**Two-phase flow in Chat component:**

```
User sends message
  │
  ├── Phase 1: POST /api/chat/plan
  │   └── Stream plan text into chat (with ThinkingState showing "Thinking...")
  │   └── Plan renders with formatted Design Direction + Features
  │
  ├── Phase 2: POST /api/chat/generate  (existing)
  │   └── Stream code generation (show FileProgress indicators with real progress)
  │   └── On complete: create sandbox, show preview
  │
  └── Phase 3: Show completion message + suggested actions
```

**Message type system (fixes string-matching fragility in `chat-message.tsx`):**

The current `ChatMessage` component uses `content.includes("Building your tool")` / `content.includes("Updating your tool")` to detect thinking states. The two-phase flow will change message content and break this. Fix: add a `type` field to the `Message` type in `chat.tsx`:

```typescript
type Message = {
  role: "user" | "assistant";
  content: string;
  type?: "text" | "thinking" | "plan" | "building" | "complete";
};
```

Update `ChatMessage` to render based on `message.type` instead of string matching:
```typescript
// chat-message.tsx — render by type, not content sniffing
if (type === "thinking" || type === "building") {
  return <ThinkingState status={...} time={...} plan={content} />;
}
if (type === "plan") {
  return <DesignPlan content={content} />;
}
if (type === "complete") {
  return <CompletionMessage fragment={fragment} />;
}
```

**ThinkingState modifications (existing file: `thinking-state.tsx`):**

The existing `ThinkingState` component already renders status text, time, and plan content using Lucide icons (`Lightbulb`, `ChevronDown`). Modifications needed:
- Add live elapsed timer via `useEffect` + `setInterval` (currently the `time` prop is hardcoded as `"30s"` / `"15s"` from `chat-message.tsx`)
- Add `isComplete` prop — when true, stop the timer and show "Thought for {n}s" (static text)
- Add pulsing dot animation (CSS `animate-pulse` on a teal circle) next to the status text while thinking
- Keep using Lucide icons for consistency with the existing component

```
┌─────────────────────────┐
│ ◉ Thinking ·····  12s   │  ← pulsing dot (Lucide), elapsed timer via useEffect
└─────────────────────────┘
```
- Pulsing teal dot (CSS animation) — keep Lucide `Lightbulb` but add pulse
- Elapsed time counter starts on mount, updates every second via `useEffect`
- Transitions to "Thought for 12s" when `isComplete` becomes true
- Uses `motion` for enter/exit animations

**DesignPlan component:**
Renders the streamed plan with styled sections:
- "Design Direction:" → rendered as styled bullet list with teal accent dots
- "Features for V1:" → rendered as checklist-style items
- "Child Profile:" → rendered in a soft info card
- "Let me build this now." → triggers Phase 2 transition

---

## Phase C: File Progress Indicators

### What Lovable Does (Screenshots 6–7)
- "Let me build this:" header
- List of files being edited: `Editing  SkillsSection.tsx` (during), `Edited  index.css` (after)
- Each file shows an edit icon + filename
- "Show all" toggle when file list is long

### What Bridges Should Build

Since Bridges generates a single-file app via `streamObject` → E2B sandbox, we don't have real multi-file generation. However, we can derive **real progress from the streaming response** by detecting which JSON fields have appeared in the partial output.

**Files to create/modify:**

```
src/features/builder-v2/components/file-progress.tsx       — New: stream-driven progress list
src/features/builder-v2/components/chat.tsx                 — Modify: track stream progress phase, pass to FileProgress
```

**Tests:**
```
src/features/builder-v2/components/__tests__/file-progress.test.tsx  — New: progress phase rendering, step states, completion
```

**FileProgress component:**
```
┌─────────────────────────────────────────┐
│ Let me build this:                      │
│                                         │
│ ✓  Analyzing therapy requirements       │  ← completed (green check)
│ ✓  Naming your tool                     │
│ ⟳  Writing component code        ···   │  ← in progress (spinning)
│ ○  Applying therapy-safe styling        │  ← pending (gray circle)
│ ○  Finalizing accessibility             │
│                                         │
│           [Show details ▾]              │  ← optional expand
└─────────────────────────────────────────┘
```

**Real progress tracking from stream (replaces fake timers):**

The `/api/chat/generate` route uses `streamObject` which streams JSON tokens. The client in `chat.tsx` already reads the stream via `response.body.getReader()`. The `FragmentSchema` fields arrive in order: `title` → `description` → `template` → `code` → `file_path` → `has_additional_dependencies` → `additional_dependencies`.

As the stream accumulates text, parse partial JSON to detect which fields have started appearing, and map field detection to meaningful therapy-aware progress steps:

| Stream event | Progress step | Status |
|---|---|---|
| Stream started | "Analyzing therapy requirements" | ✓ completed |
| `title` field detected | "Naming your tool" | ✓ completed |
| `description` field detected | "Planning the design" | ✓ completed |
| `code` field started | "Writing component code" | ⟳ in progress |
| `code` field still streaming (longest phase) | "Building interactive elements" | ⟳ in progress |
| `file_path` field detected | "Applying therapy-safe styling" | ✓ completed |
| `has_additional_dependencies` detected | "Finalizing accessibility" | ✓ completed |
| Stream complete | All steps | ✓ all completed |

**Implementation:**

In `chat.tsx`, add a `progressPhase` state that updates as the stream is read:

```typescript
type ProgressPhase =
  | "started"
  | "title"
  | "description"
  | "code-started"
  | "code-streaming"
  | "file-path"
  | "dependencies"
  | "complete";

const [progressPhase, setProgressPhase] = useState<ProgressPhase>("started");

// Inside the stream reader loop in handleSubmit:
// As accumulated text grows, check for field markers:
if (accumulated.includes('"title"')) setProgressPhase("title");
if (accumulated.includes('"description"')) setProgressPhase("description");
if (accumulated.includes('"code"')) setProgressPhase("code-started");
// ... continue for each field
// On stream end:
setProgressPhase("complete");
```

The `FileProgress` component receives `progressPhase` as a prop and renders steps based on actual stream state — no `setTimeout` or `delay` patterns:

```typescript
const PROGRESS_STEPS: { label: string; phase: ProgressPhase }[] = [
  { label: "Analyzing therapy requirements", phase: "started" },
  { label: "Naming your tool", phase: "title" },
  { label: "Planning the design", phase: "description" },
  { label: "Writing component code", phase: "code-started" },
  { label: "Building interactive elements", phase: "code-streaming" },
  { label: "Applying therapy-safe styling", phase: "file-path" },
  { label: "Finalizing accessibility", phase: "dependencies" },
];

// Each step's status is derived from comparing its phase to the current progressPhase
function getStepStatus(stepPhase: ProgressPhase, currentPhase: ProgressPhase) {
  const order = ["started", "title", "description", "code-started", "code-streaming", "file-path", "dependencies", "complete"];
  const stepIndex = order.indexOf(stepPhase);
  const currentIndex = order.indexOf(currentPhase);
  if (currentPhase === "complete") return "completed";
  if (currentIndex > stepIndex) return "completed";
  if (currentIndex === stepIndex) return "in-progress";
  return "pending";
}
```

---

## Phase D: Loading Feature Cards

### What Lovable Does (Screenshots 2–7)
- Right preview panel shows rotating feature/tip cards while building:
  - "Lovable Cloud" — database, hosting, auth, AI included
  - "Publish your project" — instantly publish, buy domain, connect custom
  - "Edit visually" — click to edit directly or describe changes
- Cards rotate on a ~5s interval with slide animation
- "Getting ready..." spinner above the cards

### What Bridges Should Build

**Files to modify:**

```
src/features/builder-v2/components/loading-carousel.tsx    — Modify: update card content to therapy-aware tips, adjust interval to 5000ms
```

> **Note:** `LoadingCarousel` already exists and is fully wired into `preview.tsx` (line 73: `<LoadingCarousel />`). It already implements rotating cards with dot indicators, auto-advance, and enter/exit CSS transitions. No new component or wiring changes needed — just update the card content array and interval.

**Modifications to existing `LoadingCarousel`:**

1. Replace the `CAROUSEL_ITEMS` array with 5 therapy-specific cards (see content below)
2. Change the auto-advance interval from `4000` to `5000` ms
3. Keep the component name `LoadingCarousel` (already imported by `preview.tsx`)
4. Keep using Lucide icons for consistency with the existing component

**Updated card content (therapy-aware):**

Card 1 — "Share Instantly"
- Icon: `Share2` (Lucide)
- "Every tool gets a shareable link. Send it to your therapist, partner, or another parent — works on any device."

Card 2 — "Built for Small Hands"
- Icon: `Hand` (Lucide)
- "Large 44px+ tap targets, high contrast, and clear visuals — designed for children's motor skills."

Card 3 — "Talk Out Loud"
- Icon: `Volume2` (Lucide)
- "Communication boards speak with natural text-to-speech. Your child hears their request spoken aloud."

Card 4 — "Customize Anytime"
- Icon: `Pencil` (Lucide)
- "Just tell me what to change. 'Make the pictures bigger' or 'Add yogurt to the choices' — I'll update it instantly."

Card 5 — "Works Offline-Ready"
- Icon: `WifiOff` (Lucide)
- "Once loaded, tools work without an internet connection. Perfect for appointments and car rides."

**Animation:** Existing CSS transitions in `LoadingCarousel` handle enter/exit. The dot indicators and slide behavior are already implemented.

**Layout in Preview during loading:**
```
┌──────────────────────────────────────────┐
│                                          │
│         ⟳  Getting ready...              │  ← existing spinner + text
│                                          │
│    ┌──────────────────────────────────┐  │
│    │  🔊 Talk Out Loud               │  │  ← rotating card
│    │                                  │  │
│    │  Communication boards speak      │  │
│    │  with natural text-to-speech.    │  │
│    │  Your child hears their request  │  │
│    │  spoken aloud.                   │  │
│    └──────────────────────────────────┘  │
│                                          │
│         ● ○ ○ ○ ○                        │  ← existing dot indicators
│                                          │
└──────────────────────────────────────────┘
```

---

## Phase E: Completion UX & Suggested Actions

### What Lovable Does (Screenshots 7–8)
- Completion message: "Your elegant UI/UX portfolio is ready!"
- Description of what was built (palette, typography, aesthetic)
- "What's next?" section with bullet suggestions:
  - "Refine & Customize: Update the name, bio, projects..."
  - "Add project images: I can generate hero images..."
  - "Master Prompting: Use 'chat mode' to plan changes..."
- "Connect Supabase" and "Visit docs" links
- Suggested action chips at bottom: `Add Project Images`, `Add Contact Form`, `Add Scroll Animations`
- A "Refactor styling and routing" expandable section

### What Bridges Should Build

**Files to create/modify:**

```
src/features/builder-v2/components/completion-message.tsx   — New: rich completion message
src/features/builder-v2/components/suggested-actions.tsx     — New: action chips
src/features/builder-v2/components/chat.tsx                  — Modify: render completion + actions
```

**Tests:**
```
src/features/builder-v2/components/__tests__/completion-message.test.tsx  — New: rendering with fragment data, "What's next?" tips
src/features/builder-v2/components/__tests__/suggested-actions.test.tsx   — New: tool type detection, chip rendering, onAction callback
```

**CompletionMessage component:**
```
┌─────────────────────────────────────────┐
│ ✓ Your {tool_title} is ready!           │
│                                         │
│ It features {description from fragment}.│
│                                         │
│ What's next?                            │
│                                         │
│ • Customize: Tell me what to change —   │
│   colors, labels, layout, anything.     │
│                                         │
│ • Share: Tap the Share button to get a  │
│   link that works on any phone or       │
│   tablet.                               │
│                                         │
│ • Try it: Interact with your tool in    │
│   the preview — tap, drag, explore.     │
│                                         │
│ ┌──────────────────────────────────┐    │
│ │ 🔗 Visit docs  ⚡ Browse templates│   │
│ └──────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**SuggestedActions component:**
Horizontal scrollable chips below the chat input, contextual to the tool type:

For **communication-board:**
- "Add More Cards" — pre-fills: "Add more picture cards for foods my child likes"
- "Enable Speech" — pre-fills: "Turn on text-to-speech so the board speaks out loud"
- "Change Grid Size" — pre-fills: "Make it a 4-column grid with bigger pictures"

For **token-board:**
- "Change Rewards" — pre-fills: "Change the reward options to iPad, playground, and bubbles"
- "More Tokens" — pre-fills: "Change to 10 tokens instead of 5"
- "Add Timer" — pre-fills: "Add a countdown timer for earning each token"

For **visual-schedule:**
- "Add Steps" — pre-fills: "Add steps for brushing teeth and getting dressed"
- "Reorder Steps" — pre-fills: "Move breakfast before getting dressed"
- "Add Images" — pre-fills: "Add picture icons for each step"

For **generated apps (custom):**
- "Make It Bigger" — pre-fills: "Make all tap targets and text larger for small hands"
- "Change Colors" — pre-fills: "Use calming blue and green colors instead"
- "Add Animation" — pre-fills: "Add gentle animations when completing steps"

**Implementation:**
```typescript
type SuggestedAction = {
  label: string;
  icon: string;     // Lucide icon name (for consistency with ThinkingState and LoadingCarousel)
  prompt: string;   // Pre-filled message
};

function getSuggestedActions(fragment: FragmentResult): SuggestedAction[] {
  // Analyze the fragment title/description to determine tool type
  // Return 3-4 contextual suggestions
}
```

**Chip styling:** Horizontal scroll container, each chip is a rounded-full button with icon + label. Tapping a chip fills the chat input and auto-submits.

---

## Phase F: Polish & Transitions

### Page Transition: Prompt → Builder

The most important animation in the entire flow. When the user submits their prompt:

1. **Prompt card lifts up** — the input card scales slightly and moves to the top-left
2. **Background fades** — gradient background fades to the builder's neutral surface
3. **Split panel slides in** — chat panel appears on left (prompt card morphs into first message), preview panel slides in from right
4. **Total duration:** 400ms

**Implementation with `motion/react`:**
```typescript
// Use layoutId on the prompt card and the first chat message
// The motion library will automatically animate the transition
<motion.div layoutId="user-prompt">
  {mode === "prompt" ? <PromptHome /> : <ChatMessage />}
</motion.div>
```

### Streaming Text Animation

For the AI's design plan (Phase B), use a typewriter effect:
- Text streams in token-by-token from the API
- Each section header ("Design Direction:", "Features for V1:") appears with a slight scale-up
- Bullet points stagger in with 50ms delay between each

### Preview Loading Transition

When the sandbox URL is ready:
1. Loading carousel cards fade out (opacity 0, scale 0.95)
2. Brief pause (200ms)
3. Iframe fades in (opacity 0→1, scale 0.98→1)
4. Total duration: 500ms

### Mobile Responsive

- Prompt mode: full screen, no sidebar
- Builder mode: stacked layout with tab toggle (Chat / Preview)
- On mobile, suggested actions wrap to 2 rows
- Loading carousel cards are full-width

---

## Implementation Order (Recommended)

```
Session 1: Phase A (Prompt Home) + Phase F partial (prompt→builder transition)
Session 2: Phase B (AI Thinking & Design Direction)
Session 3: Phase C (File Progress) + Phase D (Loading Cards)
Session 4: Phase E (Completion + Suggested Actions)
Session 5: Phase F (remaining polish, responsive, testing)
```

---

## Icon Consistency Note

The existing `ThinkingState` and `LoadingCarousel` components both use **Lucide** icons (`Lightbulb`, `ChevronDown`, `Cloud`, `Globe`, `Sparkles`). All new components in this plan should also use Lucide icons for consistency within the builder-v2 feature. Do not introduce `MaterialIcon` for builder-v2 components — it would create an inconsistent mix. If a future decision is made to switch to MaterialIcon, do it as a single sweep across all builder-v2 components.

---

## Claude Code Agent Prompt

Below is the prompt you give to Claude Code to implement this. Copy everything between the `---` markers.

---

### PROMPT START

Read `docs/plans/lovable-flow-implementation-plan.md` (this file). Implement the Lovable-style builder UX in the following order. After completing each section, verify the app runs (`npm run dev`), then move to the next.

**IMPORTANT CONTEXT:**
- The project is a Next.js 15 app with Convex backend, deployed to Vercel
- The builder already works: chat sends to `/api/chat/generate`, gets a FragmentResult (code), creates an E2B sandbox, renders in an iframe
- Design tokens are in `src/app/globals.css` — use the existing Material 3 color tokens (`--color-primary`, `--color-surface-container-low`, etc.)
- Use `motion/react` (already installed as `motion`) for all animations
- Use **Lucide** icons for all builder-v2 components (consistent with existing `ThinkingState` and `LoadingCarousel`)
- Use the existing component library in `src/shared/components/ui/`
- The builder page is at `src/app/(app)/builder/page.tsx`
- Chat component is at `src/features/builder-v2/components/chat.tsx`
- Preview component is at `src/features/builder-v2/components/preview.tsx`
- **Existing components to modify (not recreate):** `thinking-state.tsx` (ThinkingState), `loading-carousel.tsx` (LoadingCarousel), `chat-message.tsx` (ChatMessage)
- The `useTemplateStarter` hook (`src/features/builder-v2/hooks/use-template-starter.ts`) handles `?prompt=` URL params for external entry points

---

#### Step 1: Prompt Home Screen

Create `src/features/builder-v2/components/prompt-home.tsx`:
- Full-viewport centered prompt screen with cinematic input and action bar built inline (no separate prompt-input component)
- Warm greeting: "What does your child need today?" in `font-headline`
- Large textarea (rounded-2xl, sanctuary-shadow, min-height 100px) with placeholder "Describe the therapy tool you need — a morning routine, token board, communication board..."
- Action bar: Templates dropdown button (links to `/templates`), Send button with `bg-primary-gradient`
- Below input: 4 template quick-start cards (horizontal row, each with emoji icon + tool name + short description). Clicking a card calls `onSubmit(starterPrompt)` with a pre-written prompt for that tool type. Note: `onSubmit` is the correct approach here since the component is already inside the builder page. The `useTemplateStarter` hook handles `?prompt=` URL params for external entry points (e.g., landing page CTAs).
- Subtle gradient background using `from-primary/3 via-surface to-secondary/3`
- Template cards data:
  ```
  { icon: "⭐", name: "Token Board", prompt: "Build a 5-star token board..." }
  { icon: "📅", name: "Visual Schedule", prompt: "Create a morning routine..." }
  { icon: "💬", name: "Communication Board", prompt: "Build a snack request board..." }
  { icon: "✅", name: "Choice Board", prompt: "Make a choice board..." }
  ```

Create test: `src/features/builder-v2/components/__tests__/prompt-home.test.tsx`

Modify `src/app/(app)/builder/page.tsx`:
- Add `mode` state: `"prompt" | "building"`
- When `mode === "prompt"`, render `PromptHome` full-screen
- When user submits from `PromptHome`, set `mode = "building"` and pass the message as `initialMessage` to the `Chat` component
- Wrap the transition in `AnimatePresence` from `motion/react` — the prompt fades out (opacity + scale down) and the builder layout fades in

---

#### Step 2: Two-Phase AI Generation (Plan → Build)

Create `/api/chat/plan/route.ts`:
- Uses `streamText` with `anthropic("claude-sonnet-4-20250514")`
- System prompt asks Claude to produce a concise therapy-aware build plan with: Tool Type, Design Direction (3-5 bullets), Features for V1 (4-7 bullets), and end with "Let me build this now."
- Returns `result.toTextStreamResponse()`

Modify `src/features/builder-v2/components/thinking-state.tsx` (existing file):
- Add live elapsed timer via `useEffect` + `setInterval` (replace the hardcoded `time` prop usage)
- Add `isComplete` prop — when true, stop the timer and display "Thought for {n}s" (static text, no pulsing)
- Add pulsing dot animation (CSS `animate-pulse` on a teal circle) next to the Lucide `Lightbulb` icon while thinking is active
- Keep existing Lucide icons (`Lightbulb`, `ChevronDown`) for consistency

Create `src/features/builder-v2/components/design-plan.tsx`:
- Renders the plan text with styled sections
- Detects section headers ("Design Direction:", "Features for V1:") and renders them as bold headings
- Bullet points get teal dot indicators
- The final "Let me build this now." line gets a subtle divider below it

Modify `src/features/builder-v2/components/chat.tsx`:
- Add a `type` field to the `Message` type: `type?: "text" | "thinking" | "plan" | "building" | "complete"`
- Change `handleSubmit` to two phases:
  1. **Plan phase:** POST to `/api/chat/plan` with the conversation. Stream the response into a new assistant message (type: `"thinking"` while streaming, then `"plan"` when complete). Show `ThinkingState` while streaming. When stream completes, render the plan via `DesignPlan`.
  2. **Build phase:** Immediately after plan completes, POST to `/api/chat/generate` (existing). Add a message with type `"building"` and show `FileProgress` component with real stream-driven progress.
  3. **Complete phase:** When code is generated, update message type to `"complete"` with `CompletionMessage` and show `SuggestedActions`.

Modify `src/features/builder-v2/components/chat-message.tsx`:
- Update `ChatMessageProps` to accept optional `type` field: `type?: "text" | "thinking" | "plan" | "building" | "complete"`
- Replace the `content.includes("Building your tool")` / `content.includes("Updating your tool")` string matching with type-based rendering
- Render `ThinkingState` for `type === "thinking"` or `type === "building"`
- Render `DesignPlan` for `type === "plan"`
- Render `CompletionMessage` for `type === "complete"`
- Fall back to current text rendering for `type === "text"` or undefined (backwards compatibility)

Create tests: `src/features/builder-v2/components/__tests__/design-plan.test.tsx`, extend `thinking-state` tests

---

#### Step 3: File Progress & Loading Cards

Create `src/features/builder-v2/components/file-progress.tsx`:
- Receives `progressPhase` prop (derived from real stream progress, not timers)
- Progress phases map to therapy-aware steps:
  - `"started"` → "Analyzing therapy requirements"
  - `"title"` → "Naming your tool"
  - `"description"` → "Planning the design"
  - `"code-started"` → "Writing component code"
  - `"code-streaming"` → "Building interactive elements"
  - `"file-path"` → "Applying therapy-safe styling"
  - `"dependencies"` → "Finalizing accessibility"
  - `"complete"` → All steps marked complete
- Each step shows: ✓ (completed, green Lucide `Check`), ⟳ (in progress, spinning teal Lucide `Loader2`), ○ (pending, gray Lucide `Circle`)
- Step status derived from comparing step's phase to current `progressPhase` — no timers
- When `progressPhase === "complete"`, all steps instantly mark as completed
- Use `motion/react` for enter animations on each step

Modify `src/features/builder-v2/components/chat.tsx` (stream progress tracking):
- Add `progressPhase` state of type `ProgressPhase`
- In the `handleSubmit` stream reader loop, as accumulated text grows, detect `FragmentSchema` field markers:
  - `'"title"'` detected → `setProgressPhase("title")`
  - `'"description"'` detected → `setProgressPhase("description")`
  - `'"code"'` detected → `setProgressPhase("code-started")`
  - `'"file_path"'` detected → `setProgressPhase("file-path")`
  - `'"has_additional_dependencies"'` detected → `setProgressPhase("dependencies")`
  - Stream end → `setProgressPhase("complete")`
- Pass `progressPhase` down to `FileProgress` component

Modify `src/features/builder-v2/components/loading-carousel.tsx` (existing file):
- Replace the `CAROUSEL_ITEMS` array with the 5 therapy-specific cards (Share Instantly, Built for Small Hands, Talk Out Loud, Customize Anytime, Works Offline-Ready) using Lucide icons (`Share2`, `Hand`, `Volume2`, `Pencil`, `WifiOff`)
- Change the auto-advance interval from `4000` to `5000` ms
- Keep the component name `LoadingCarousel` — `preview.tsx` already imports and renders it at line 73, no wiring changes needed

Create test: `src/features/builder-v2/components/__tests__/file-progress.test.tsx`

---

#### Step 4: Completion Message & Suggested Actions

Create `src/features/builder-v2/components/completion-message.tsx`:
- Takes `fragment: FragmentResult` as prop
- Renders: "✓ Your {title} is ready!" heading, description paragraph, "What's next?" section with 3 tips (Customize, Share, Try it), and links to docs/templates
- Styled with Bridges design tokens — primary color accents, rounded cards
- Uses Lucide icons (`Check`, `Share2`, `MousePointer`)

Create `src/features/builder-v2/components/suggested-actions.tsx`:
- Takes `fragment: FragmentResult` and `onAction: (prompt: string) => void` as props
- Analyzes fragment title/description to determine likely tool type
- Returns 3-4 contextual action chips as horizontally scrollable buttons
- Each chip: Lucide icon + short label, `bg-surface-container-low` with `hover:bg-surface-container-high`
- Clicking a chip calls `onAction(prompt)` which fills the chat input and auto-submits

Modify `src/features/builder-v2/components/chat.tsx`:
- After successful generation, update message type to `"complete"` with `CompletionMessage`
- Render `SuggestedActions` as a sticky bar above the chat input (only visible after first generation)
- When a suggested action is clicked, it triggers `handleSubmit(prompt)` directly

Create tests: `src/features/builder-v2/components/__tests__/completion-message.test.tsx`, `src/features/builder-v2/components/__tests__/suggested-actions.test.tsx`

---

#### Step 5: Polish Pass

Animations to add:
- Prompt → Builder transition: `AnimatePresence` with `motion.div` opacity/scale
- Chat messages: slide up + fade in on enter (`initial={{ opacity: 0, y: 12 }}`)
- ThinkingState: pulse animation on the dot (added in Step 2)
- FileProgress steps: stagger in with 200ms delay between each
- Preview iframe: fade in when ready
- SuggestedActions chips: stagger in from left

Responsive fixes:
- Mobile prompt home: full-width input, template cards scroll horizontally
- Mobile builder: stack chat/preview with toggle tabs
- Loading carousel: full-width on mobile, centered on desktop
- Suggested actions: wrap to multiple rows on narrow screens

Accessibility:
- All new components need `aria-label` or `aria-live` where appropriate
- ThinkingState: `aria-live="polite"` for screen reader updates
- Loading carousel: `role="status"` on the container
- Suggested actions: proper button `aria-label` with the full prompt text

### PROMPT END

---

## Architecture Decisions

### Why two-phase generation?
The plan phase serves dual purposes: (1) it gives users something meaningful to watch during the 15-second generation wait, making it feel faster, and (2) it improves code quality by having the AI think through design decisions before committing to code.

### Why real stream-driven progress instead of fake timers?
The `streamObject` response streams JSON tokens in a predictable field order (`title` → `description` → `code` → `file_path` → `dependencies`). By detecting which fields have appeared in the partial output, we get real progress tracking that accurately reflects what the AI is actually doing. This is more honest than timed delays and naturally adapts to varying generation speeds — a fast generation completes steps quickly, a slow one shows accurate "in progress" states. The progress steps are still labeled with therapy-specific language rather than raw field names, keeping the UX warm and domain-aware.

### Why loading cards instead of a blank preview?
15 seconds of staring at a spinner is an eternity. The rotating cards teach users about Bridges' capabilities while they wait, reducing perceived wait time and setting expectations for what they'll see next.

### Why suggested actions?
After the magic moment of seeing their tool appear, users often don't know what to do next. The contextual chips remove the "blank prompt" problem and guide users toward the most common next steps — which increases engagement and tool quality.

---

## Verification Fixes Applied

| Issue ID | Fix Type | What Changed |
| -------- | --------------- | ------------------------------------------------ |
| V1 | Reuse existing component | `thinking-indicator.tsx` / `ThinkingIndicator` → modify existing `thinking-state.tsx` / `ThinkingState`. Changed from "Create" to "Modify" in Phase B file list, Step 2 instructions, Step 5 accessibility. Added: live elapsed timer via useEffect, `isComplete` prop, pulsing dot. Kept Lucide icons. |
| V2 | Reuse existing component | `loading-cards.tsx` / `LoadingCards` → modify existing `loading-carousel.tsx` / `LoadingCarousel`. Changed from "Create" to "Modify" in Phase D file list, Step 3 instructions, Step 5 responsive/accessibility. Updated CAROUSEL_ITEMS content, interval 4000→5000ms. Noted preview.tsx already wires it. |
| V3 | File removal | Removed `prompt-input.tsx` from Phase A file list. Cinematic input is built inline within `prompt-home.tsx`. |
| V4 | Missing file + type system | Added `chat-message.tsx` to Phase B file list with modification instructions. Added `Message.type` field (`"text" \| "thinking" \| "plan" \| "building" \| "complete"`) to replace brittle `content.includes()` string matching. Updated Step 2 with ChatMessage type-based rendering. |
| V5 | Missing context note | Added note in Phase A and Step 1 that PromptHome template cards use `onSubmit` prop (correct for in-builder context), while `useTemplateStarter` hook handles `?prompt=` URL params for external entry points. |
| V6 | Missing test files | Added test file sections to Phase A (prompt-home), Phase B (design-plan, thinking-state), Phase C (file-progress), Phase E (completion-message, suggested-actions). Added `Create test:` lines in corresponding agent prompt steps. |
| V7 | Icon consistency | Added "Icon Consistency Note" section. Existing builder-v2 components use Lucide — all new components use Lucide too. Replaced MaterialIcon references in SuggestedActions, LoadingCarousel card specs, FileProgress step icons with Lucide equivalents. Updated IMPORTANT CONTEXT in agent prompt. |
| NEW1 | Replace fake progress with real | Replaced `PROGRESS_STEPS` array with `setTimeout`/`delay` timers with real stream-driven progress tracking. Added `ProgressPhase` type, stream field detection logic in `chat.tsx`, phase-to-step mapping in `FileProgress`. Updated Phase C section, implementation code blocks, Step 3 instructions, and Architecture Decisions. Removed all `setTimeout`/`delay` patterns from progress tracking. |
