# UX Fixes Omnibus — Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Scope:** 4 sub-projects covering 10 UX issues across builder, My Apps, feature discoverability, and landing page

---

## Overview

This spec addresses a batch of UX issues identified during manual testing. The issues span multiple areas of the app and are organized into 4 independent sub-projects, ordered by user impact. Each sub-project can be implemented, tested, and shipped independently.

| # | Sub-project | Issues Covered |
|---|------------|----------------|
| 1 | Builder UX Overhaul | Progress tracking widget, source/preview toggle, template instant load, session persistence on nav |
| 2 | My Apps & Cards Polish | Card thumbnails/images, play button fix, bulk delete |
| 3 | Feature Discoverability | Speech coach sidebar access, flashcard deck tab navigation |
| 4 | Landing Page Refresh | Role-specific value props, feature showcase, updated copy |

---

## Sub-project 1: Builder UX Overhaul

### 1.1 Progress Tracking Card

**Problem:** Users see a loading spinner in chat during generation, with no indication of progress. Generation takes ~5 minutes for complex apps, leading to abandonment.

**Solution:** Replace the chat spinner with a progress card showing 4 high-level phases.

**Phases:**
1. "Understanding your request" — triggered by SSE `thinking` event
2. "Writing components" — triggered by first `file_written` event
3. "Bundling & styling" — triggered by `bundling` event
4. "Ready to preview" — triggered by `complete` event

**Card layout:**
- Title: "Building your app..."
- 4 phase rows, each with a status indicator: checkmark (done), spinner (active), circle (pending)
- Subtle progress bar at bottom
- After completion, collapses to a single line: "Built in X seconds"

**Styling:** Follows DESIGN.md — warm canvas background, Fraunces heading, Instrument Sans body, 300ms+ cubic-bezier animations, no hard borders.

**Implementation notes:**
- New component: `src/features/builder/components/progress-card.tsx`
- Consumes existing SSE event stream from `use-streaming.ts`
- Renders inline in the chat message list as a special message type

### 1.2 Source/Preview Toggle

**Problem:** Source and preview are controlled by two separate buttons. Users expect a single toggle to flip between views.

**Solution:** Replace the two buttons with a single segmented control.

**Behavior:**
- Two segments: "Preview" | "Source"
- Active segment: primary teal fill (`#00595c`)
- Inactive segment: transparent with subtle text
- Clicking either side sets `viewMode` state
- Keyboard shortcut: `Cmd/Ctrl + Shift + S`

**Implementation notes:**
- Modify existing toolbar in `builder-page.tsx`
- Replace two buttons with a single `ToggleGroup` (shadcn/ui) or custom segmented control
- Same `viewMode` state and localStorage persistence

### 1.3 Template Instant Load

**Problem:** Clicking a template starts a full AI generation cycle (~5 minutes). Templates should load instantly since they have pre-built bundles.

**Solution:** When a user selects a template, load its pre-built bundle HTML directly into the preview iframe.

**Flow:**
1. User clicks template on templates page
2. Navigate to `/builder/[sessionId]` with template data
3. Load pre-built bundle HTML into iframe immediately (< 1 second)
4. Pre-populate chat with template description as context
5. User can iterate via chat (existing iterative editing pipeline)

**Implementation notes:**
- Templates already have pre-built bundles (last commit)
- Modify template click handler to create a session with the bundle pre-loaded
- Skip the generation SSE call for templates — go straight to "live" state

### 1.4 Session Persistence on Navigation

**Problem:** When a user starts a template/custom generation and navigates away from the builder, the generation appears to disappear. No way to know if it's still running or when it's done.

**Solution:** Inform users that generation continues, and surface status in My Apps.

**Behavior:**
- When user navigates away during active generation, show a toast: "Your app is still building. Check My Apps when it's ready."
- Auto-save triggers when generation completes (existing `ensureApp()` behavior)
- On My Apps page, show a "Building..." badge with a subtle pulse animation on apps whose sessions (owned by the current user) are still in `generating` state — query via `withIndex("by_userId")` filtered to non-terminal session states
- If user returns to `/builder/[sessionId]`, resume with existing `useSessionResume` hook

**Implementation notes:**
- Add a `beforeunload` or route-change listener in the builder page
- Query session status in My Apps page to show building badge
- No backend changes needed — generation already runs server-side to completion

---

## Sub-project 2: My Apps & Cards Polish

### 2.1 App Thumbnails

**Problem:** Template cards and My Apps cards show blank backgrounds with a single letter. No visual indication of what the app looks like.

**Solution:** Different thumbnail strategies for templates vs user-built apps.

**Templates:**
- Curated static images stored in `public/templates/`
- Each template record gets a `thumbnailUrl` field
- Hand-crafted or AI-generated illustrations showing what the template builds

**User-built apps:**
- After generation completes and preview iframe loads, capture a screenshot
- WAB scaffold includes a small `postMessage` listener that renders iframe content to canvas and posts back a data URL
- Upload data URL as PNG to Convex file storage
- Store `storageId` on the app record as `thumbnailId`
- Serve via Convex file URL in the card component

**Fallback:** If no thumbnail exists (older apps), keep current initial-letter display.

**Implementation notes:**
- Add screenshot capture listener to WAB scaffold's `index.html`
- Add `thumbnailId` field to app schema (optional)
- Add Convex mutation to store thumbnail
- Modify `ProjectCard` to render `<img>` when `thumbnailId` exists

### 2.2 Play Button Fix

**Problem:** Pressing the play button on My Apps cards does nothing. The `FullscreenAppView` modal should open.

**Root cause investigation needed:** Likely a missing `onClick` binding or event propagation issue where the card's dropdown menu `stopPropagation` prevents the play button click from firing.

**Solution:**
- Ensure play button has its own isolated click handler with `e.stopPropagation()` to prevent card-level interference
- Handler opens `FullscreenAppView` modal with the app's bundle HTML
- Verify the modal receives and renders the bundle correctly

### 2.3 Bulk Delete

**Problem:** No way to delete multiple apps at once from My Apps.

**Solution:** Selection mode with responsive interaction patterns.

**Desktop:**
- "Select" button in the My Apps toolbar
- Clicking enters selection mode: checkboxes appear on top-left corner of each card
- Sticky action bar at bottom: "{X} selected" + "Delete" button + "Cancel" button
- Delete confirmation dialog: "Delete {X} apps? This can't be undone."
- Clicking "Cancel" or pressing Escape exits selection mode

**Mobile:**
- Long-press any card to enter selection mode (300ms hold threshold)
- Haptic feedback via `navigator.vibrate(50)` if supported
- Same sticky bottom bar and checkbox behavior as desktop
- Tap additional cards to toggle selection
- Tap "Cancel" or press back to exit

**Backend:**
- Add `internalMutation` for batch delete: accepts array of app IDs, deletes all in one transaction
- Validate ownership of all IDs before deletion

**Implementation notes:**
- New state: `selectionMode: boolean`, `selectedIds: Set<string>`
- New component: `src/features/my-tools/components/selection-bar.tsx`
- Long-press detection: `onPointerDown` timer + `onPointerUp` cancel pattern

---

## Sub-project 3: Feature Discoverability

### 3.1 Speech Coach in Sidebar

**Problem:** Speech coach exists at `/family/[patientId]/speech-coach` but is not accessible from any navigation. Users can't find it.

**Solution:** Add "Speech Coach" as a top-level sidebar item visible to both SLPs and caregivers.

**Sidebar placement:** Below "Flashcards", above "Settings"
**Icon:** Microphone or speech bubble (consistent with existing icon set)

**Routing logic:**
- **Caregiver with one child:** Navigate directly to `/family/[patientId]/speech-coach`
- **Caregiver with multiple children:** Show a quick child-picker dropdown, then navigate
- **SLP:** Show a patient selector, pick a patient, then launch speech coach for that patient

**Mobile:** Speech coach appears in the mobile hamburger menu / bottom nav as a top-level item.

**Note:** SLP customization of the speech coach is deferred to a separate sub-project. This work is limited to making the feature discoverable.

### 3.2 Flashcard Page Tab Navigation

**Problem:** The flashcard page only shows the generation chat. Users with existing decks have no way to access them without starting a new generation.

**Solution:** Add a tab bar at the top of the flashcard page.

**Tabs:**
- **"My Decks"** — Default if user has existing decks
  - Grid/list of saved flashcard decks
  - Each card shows: deck name, card count, last used date
  - Tap a deck to open it in study/preview mode
  - Empty state: "No decks yet — switch to Create New to build your first deck"
- **"Create New"** — Default if no decks exist
  - Current centered prompt screen and generation chat flow
  - Behaves exactly as today

**Implementation notes:**
- Tab state managed locally in the flashcard page component
- Deck data already exists in the backend — purely a frontend change
- Use shadcn/ui `Tabs` component for the tab bar
- Reuse existing deck rendering from the "Your Decks" sheet

---

## Sub-project 4: Landing Page Refresh

### 4.1 Hero Section (minor update)

- Update tagline: "AI-powered therapy tools for SLPs and families"
- Keep dual CTA: "Start Building" + "View Templates"
- Replace emoji decorations with a static screenshot or subtle animated preview of the builder

### 4.2 Role-Specific Value Props (new section, replaces HowItWorks)

Two-column layout (stacked on mobile):

**For SLPs:**
- Build custom therapy apps in minutes
- Manage patient caseloads
- Track goals and progress
- Share apps with families
- CTA: "Get Started as SLP"

**For Families:**
- Describe what your child needs
- Access speech coach anytime
- Play therapy apps together
- Track progress at home
- CTA: "Get Started as Family"

**Styling:** Tonal background shift between columns (per DESIGN.md — no hard borders). Each column uses a subtle warm background variation.

### 4.3 Feature Showcase (new section, replaces ProductPreview)

4-5 feature cards, horizontal scroll on mobile, grid on desktop:

| Feature | Visual | One-liner |
|---------|--------|-----------|
| AI App Builder | Builder screenshot | "Describe it in plain language, get a working app" |
| Template Library | Templates page screenshot | "Start from proven therapy tools, customize to fit" |
| Flashcard Creator | Flashcards screenshot | "Generate interactive flashcard decks with AI" |
| Speech Coach | Speech coach screenshot | "Practice speech skills with an AI coach" |
| Family Play Mode | Play grid screenshot | "Kid-friendly interface with PIN-protected exit" |

Each card: image on top, Fraunces heading + Instrument Sans one-liner below.

### 4.4 Social Proof / Testimonials

Keep existing section. Update testimonial content if new quotes are available.

### 4.5 CTA Section (minor update)

- Headline: "Ready to bridge the gap?"
- Primary CTA: Sign-up button
- Secondary: "Browse Templates" link for exploring without account

### 4.6 Footer

Keep as-is.

---

## Implementation Order

1. **Sub-project 1** (Builder UX Overhaul) — highest user impact, addresses core journey friction
2. **Sub-project 2** (My Apps & Cards Polish) — improves post-build experience
3. **Sub-project 3** (Feature Discoverability) — surfaces existing but hidden features
4. **Sub-project 4** (Landing Page Refresh) — marketing/conversion improvement

Each sub-project is independent and can be shipped on its own branch.

---

## Out of Scope

- SLP customization of speech coach (separate sub-project)
- New template content creation (curated images needed but not generated here)
- Performance optimization of the generation pipeline itself (this spec addresses perceived speed, not actual speed)
- Mobile app / PWA changes
