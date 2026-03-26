# Builder Feature Overhaul — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Goal:** Transform the builder into a Lovable-style experience with real-time preview, persistent sessions, Lovable-matched UI flow, and dramatically improved app quality.

---

## 1. Real-Time Preview (Smaller, Faster Turns)

### Problem

`await llmStream.finalMessage()` in `route.ts:252` waits for the entire LLM response before processing tool calls. If Claude writes 5 files in one turn, the user sees nothing in the preview for 30+ seconds.

### Solution

#### 1a. Prompt-Driven Single-File Turns

Restructure the system prompt (`src/features/builder/lib/agent-prompt.ts`) to instruct Claude:

> "Write ONE file per response. After each `write_file` tool call, STOP and wait for the tool result before writing the next file. Never batch multiple write_file calls in a single response."

The existing multi-turn tool loop (`MAX_TOOL_TURNS = 10` in `route.ts`) already supports this — each turn produces 1 file, tool result returns, Claude continues. Preview updates after each ~3-5 second turn.

**Risk:** This is prompt-only enforcement. If Claude ignores the instruction and batches multiple `write_file` calls in one response, all files still arrive at once after `finalMessage()`. This is acceptable for the vibeathon — in practice, Claude respects explicit tool-use instructions reliably. A future iteration could use `llmStream.on("tool_use")` for true per-tool-call streaming reactivity.

#### 1b. Skip npm Install via @webcontainer/snapshot

**Build-time snapshot generation:**
- Create a script `scripts/generate-wc-snapshot.ts` that:
  1. Creates a temp directory with the template files (from `webcontainer-files.ts`)
  2. Runs `npm install` locally
  3. Uses `@webcontainer/snapshot` to generate a binary snapshot including `node_modules`
  4. Writes the snapshot to `public/wc-snapshot.bin`
- Run this script in CI and during development (`npm run snapshot`)

**Runtime mounting:**
- Modify `use-webcontainer.ts` to:
  1. `fetch('/wc-snapshot.bin')` and get the `ArrayBuffer`
  2. `webcontainer.mount(snapshotBuffer)` instead of `mount(templateFiles)` + `npm install`
  3. Immediately spawn `npm run dev` (Vite) — no install step
  4. Remove the `installing` status state — goes directly from `booting` to `ready`
  5. Update the `WebContainerStatus` type union from `"booting" | "installing" | "ready" | "error"` to `"booting" | "ready" | "error"` and audit all downstream consumers (`builder-toolbar.tsx`, `preview-panel.tsx`, `builder-page.tsx`)

**Note:** `wc.mount()` with a binary snapshot (`ArrayBuffer`) uses a different overload than the current `wc.mount(templateFiles)` (`FileSystemTree`). The call signature changes but both are supported by the WebContainer API.

**Expected boot time:** <2 seconds (down from 15-30s).

**New dependency:** `@webcontainer/snapshot` (devDependency, used only in build script).

#### 1c. Immediate Placeholder Scaffold

On first prompt submission, before the LLM responds:
- Write a placeholder `src/App.tsx` to WebContainer:
  ```tsx
  export default function App() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
          <p className="text-lg font-medium text-teal-800">Building your app...</p>
        </div>
      </div>
    );
  }
  ```
- Write the placeholder only after `wcStatus === "ready"` (WebContainer booted and Vite running). If the user submits before ready, queue the write and execute when ready.
- This renders in the preview within 1-2s of the user's prompt (assuming snapshot boot is <2s)
- As Claude's real `src/App.tsx` arrives via `file_complete`, it overwrites this and Vite HMR updates the preview

**Expected end-to-end latency:** Prompt → placeholder visible (~1-2s) → first real file (~3-5s) → subsequent files every ~3-5s → complete app in 15-25s with incremental visual progress.

---

## 2. Lovable-Style Builder Layout & Flow

### Reference

12 Lovable screenshots in `docs/design/Lovable Web Creating a website with AI/`. Copy the flow, layout, component patterns, and spacing. Keep Bridges' own color palette (teal/primary tokens from design system).

### Three Phases

#### Phase 1: Home/Prompt (no active session)

**Layout:** Full-width centered, no split view yet.

**Components:**
- Large greeting text: "What would you like to build?" centered with `font-headline text-3xl font-bold`
- Subtext: "Describe a therapy tool and I'll build it for you."
- **Floating prompt input bar** — centered, pill-shaped, with:
  - Text input placeholder: "Ask Bridges to create..."
  - Send button (icon) on the right
  - Below: therapy suggestion chips (existing `SuggestionChips` component)
- **Auto-resume card** — if a recent session exists (from `sessions.getMostRecent` query), show a card above the input: "[App Name] — Continue where you left off" with a resume button. Clicking loads that session.

**File:** Modify `builder-page.tsx` to conditionally render this layout when `!sessionId && status === "idle"`.

**Transition:** On prompt submit or resume click, animate transition to split view.

#### Phase 2: Generation (split view)

**Layout:** Left chat panel (~30%) + right preview panel (~70%) via `ResizablePanelGroup` (already exists).

**Chat panel redesign (`chat-panel.tsx`):**
- User prompt displayed as a left-aligned message (NOT right-aligned bubble — match Lovable's style where both sides are left-aligned)
- "Thinking..." indicator with spinner and elapsed time counter
- AI response streams as structured markdown (design direction, features list)
- **File badges:** Replace `ProgressSteps` and `ActivityCard` with Lovable-style "Edited [filename]" badges:
  - Each written file shows as: `checkmark icon` + "Edited" + `filename` in a row
  - Collapsible: "Show all" / "Hide" toggle when > 3 files
  - Checkbox-style checkmarks animate in as files complete
- Remove the 4-step progress bar (`ProgressSteps` component) — it's not in Lovable's design

**Preview panel:**
- "Getting ready..." text with spinner (centered) while WebContainer boots
- Placeholder renders within 1-2s
- Real app renders via HMR as files arrive
- Full iframe with no chrome — just the app

#### Phase 3: Live (generation complete)

**Chat panel:**
- Completion message: summary of what was built
- "What's next?" section with suggestion action chips:
  - "Add [feature]" chips contextual to the app type
  - Example: "Add reward sounds", "Add progress tracking", "Make it print-friendly"
- Bottom input always visible: "Ask Bridges..." with send button

**Toolbar (`builder-toolbar.tsx`):**
- Match Lovable's toolbar: project name (editable click), Preview/Code toggle buttons, device size selector, responsive indicators, Share button, Publish button
- Keep existing toolbar but refine spacing and grouping to match Lovable screenshots

### Chat Overflow Fix

**Problem:** Messages get cut off when the container resizes.

**Solution:** Replace Radix `ScrollArea` with a native scrollable div:

```tsx
// Before
<ScrollArea className="min-h-0 flex-1 p-4">

// After
<div className="min-h-0 flex-1 overflow-y-auto p-4">
```

Radix ScrollArea has known issues recalculating scroll dimensions in flex containers with dynamic content. A native `overflow-y: auto` div handles this reliably. The parent flex column (`flex h-full flex-col`) with `min-h-0` on the scroll container ensures proper flex overflow behavior.

Also remove the throttled auto-scroll (`lastScrollRef` 200ms guard) and use a simpler approach:
```tsx
useEffect(() => {
  scrollEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
}, [messages?.length, streamingText, activities.length]);
```

---

## 3. Persistence (Auto-Resume)

### Problem

Navigating away from `/builder` and returning starts a fresh session. The `?sessionId` URL param is lost.

### Solution

#### 3a. New Convex Query: `sessions.getMostRecent`

```typescript
// convex/sessions.ts
export const getMostRecent = query({
  args: {},
  handler: async (ctx) => {
    // For now (no auth), return the most recent session in LIVE state
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_state", (q) => q.eq("state", "live"))
      .order("desc")
      .first();
    return session;
  },
});
```

Requires a new index on sessions: `.index("by_state", ["state"])`.

#### 3b. Auto-Resume Logic in BuilderPage

```typescript
const mostRecent = useQuery(api.sessions.getMostRecent);

const autoResumed = useRef(false);

useEffect(() => {
  if (!sessionIdFromUrl && mostRecent && status === "idle" && wcStatus === "ready" && !autoResumed.current) {
    autoResumed.current = true;
    router.replace(`?sessionId=${mostRecent._id}`);
  }
}, [sessionIdFromUrl, mostRecent, status, wcStatus]);
```

This triggers the existing resume logic (lines 69-96 of `builder-page.tsx`).

#### 3c. localStorage Fallback

On session creation, persist to localStorage:
```typescript
localStorage.setItem("bridges_last_session", sessionId);
```

On mount, if no `?sessionId` and no `mostRecent` from Convex (e.g., Convex query still loading), check localStorage as an immediate fallback to avoid a flash of empty state.

---

## 4. App Quality Improvements

### 4a. System Prompt Overhaul

File: `src/features/builder/lib/agent-prompt.ts`

The existing prompt already has Visual Quality Bar, Therapy Domain Context, Quality Standards, and a gold standard example (lines 63-462). The changes below **augment and strengthen** the existing sections, not replace them. The genuinely new addition is the single-file-per-turn instruction.

Add/strengthen these sections in the system prompt:

**Visual quality rules:**
- "Create visually polished, production-quality apps worthy of a design portfolio."
- "Use generous whitespace (p-8, gap-6 minimum for sections), modern typography hierarchy (text-4xl for hero headings, text-lg for body), smooth animations using the motion library (fadeIn, slideUp, staggered children)."
- "Use professional color palettes — never use raw Tailwind colors. Build cohesive palettes: one primary, one accent, neutral grays, with proper light/dark contrast."
- "Add subtle gradients (bg-gradient-to-br), shadows (shadow-lg), and rounded corners (rounded-2xl) for depth."

**Functionality rules:**
- "Build complete, interactive apps with proper state management (useState, useReducer). Include loading states, empty states, error states, and success feedback."
- "Add realistic data — never use Lorem ipsum. Generate therapy-appropriate sample data."
- "Include micro-interactions: hover effects, click feedback, transitions between states."

**Therapy-specific rules:**
- "Large tap targets (min 48px height/width for interactive elements)."
- "High contrast text (WCAG AA minimum). Never use light gray text on white backgrounds."
- "Celebratory feedback for achievements: confetti animations, star bursts, encouraging messages, optional sound effects."
- "Sensory-friendly design: soft rounded shapes, calming color palettes, no harsh flashing or sudden movements."
- "Child-friendly language and iconography. Use emoji and illustrations where appropriate."

**Code structure rules:**
- "Write ONE file per tool call. Stop after each write_file and wait for the result."
- "For apps with 3+ components, create separate files in src/components/ and import them into App.tsx."
- "Always use the cn() utility for conditional class merging."
- "Use the pre-installed motion library for animations: motion.div with initial/animate/transition props."

**Gold standard example:**
Include a condensed, high-quality example app inline in the prompt showing proper structure, styling, animations, and therapy-specific patterns. ~100 lines showing the expected quality bar.

### 4b. Template Design System Enrichment

File: `webcontainer-files.ts` (the template's CSS)

Add utility classes to the therapy-ui.css section:

```css
/* Layout */
.hero-section { ... }
.feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
.glass-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border-radius: 1rem; }

/* Therapy-specific */
.reward-burst { /* confetti/star animation keyframes */ }
.progress-ring { /* circular progress indicator */ }
.tap-target-lg { min-height: 56px; min-width: 56px; }

/* Typography */
.heading-display { font-family: 'Nunito', sans-serif; font-weight: 800; letter-spacing: -0.02em; }
```

### 4c. Pre-installed Fonts

Add to the template's `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Inter:wght@400;500;600&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
```

This gives the AI three font families to work with for visual variety.

---

## Files Changed (Summary)

| File | Change |
|------|--------|
| `src/features/builder/lib/agent-prompt.ts` | Major system prompt rewrite with quality rules, single-file-per-turn instruction, gold standard example |
| `src/app/api/generate/route.ts` | No structural changes needed — multi-turn loop already works. Add placeholder write before LLM call. |
| `src/features/builder/hooks/use-webcontainer.ts` | Replace npm install with snapshot mounting. Remove `installing` status. |
| `src/features/builder/hooks/webcontainer-files.ts` | Enrich CSS, add fonts. Keep as source of truth for snapshot generation. |
| `src/features/builder/components/builder-page.tsx` | Add Phase 1 full-width prompt layout. Add auto-resume via `getMostRecent`. Add localStorage fallback. |
| `src/features/builder/components/chat-panel.tsx` | Replace ScrollArea with native scroll. Replace ProgressSteps with file badges. Lovable-style message layout. |
| `src/features/builder/components/preview-panel.tsx` | Update "Getting ready" state to match Lovable spinner style. |
| `src/features/builder/components/builder-toolbar.tsx` | Refine spacing/grouping to match Lovable toolbar. |
| `convex/sessions.ts` | Add `getMostRecent` query. Add `by_state` index. |
| `convex/schema.ts` | Add `by_state` index to sessions table. |
| `scripts/generate-wc-snapshot.ts` | New script to generate WebContainer snapshot at build time. |
| `package.json` | Add `@webcontainer/snapshot` devDependency. Add `snapshot` script. |
| `public/wc-snapshot.bin` | Generated binary snapshot (gitignored). |

---

## Out of Scope

- Auth (deferred to Phase 6)
- Visual edits / click-to-edit (Lovable's Vite plugin approach — too complex for vibeathon)
- Code panel redesign (keep existing, functional)
- Landing page (separate phase)
- Template carousel on home screen (nice-to-have, not critical)

---

## Success Criteria

1. **Preview latency:** Placeholder visible within 2s of prompt submit. First real file in preview within 5s. Complete app within 25s.
2. **Chat overflow:** Messages never cut off regardless of container resize or content length.
3. **Persistence:** Navigate away and back to `/builder` — previous session auto-resumes with full preview.
4. **App quality:** Generated apps have professional visual polish, proper animations, multi-component structure, and therapy-specific design patterns.
5. **Lovable parity:** Builder flow matches Lovable's 3-phase layout (full-width prompt → split generation → live preview with suggestions).
