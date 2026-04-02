# SLP Tools Builder Redesign — Design Spec

**Date:** 2026-04-02  
**Scope:** `src/features/tools/` — creation flow, editor, publish, runtime quality, SLP data visibility  
**Approach:** Hybrid AI-first entry + template architecture preserved (Approach 3)  
**Focus:** A) SLP creation experience + wow factor, B) Generated app quality for kids

---

## Problem Statement

The current 4-step wizard inverts the product's value proposition. The AI that "speaks therapy language" is buried as an optional textarea in step 3, beneath color pickers, after the SLP has already manually picked a template. The first 30 seconds of the experience are forgettable. Meanwhile, the generated apps lack the clinical quality signals (symbols, Fitzgerald colors, session data, motor planning) that SLPs need to trust and adopt them.

The template + config registry architecture is solid and should be preserved. The problems are the front door and the output quality.

---

## Section 1: Entry & Creation Flow

### Current State
- Step 1: patient assignment before any inspiration (cold start)
- Step 2: text-card template picker with no visual previews
- AI assist: opt-in textarea labeled "optional," buried in step 3
- `childProfile: {}` always passed empty — selected patient data never reaches AI

### Redesigned `/tools/new` Entry

Replace the 4-step wizard with a 3-phase flow: **AI entry → editor → publish**.

The `/tools/new` route renders a single full-attention prompt:

```
[Centered heading]
"What do you want to build?"

[Large textarea, autofocused]
placeholder: "Token board for Marcus, 5 tokens, reward is iPad time. He loves dinosaurs."

[Primary CTA] → Build it

[Below, subtle row of 5 quick-start cards]
AAC Board · First/Then · Token Board · Visual Schedule · Matching Game
```

Quick-start cards serve SLPs who know exactly what they want; clicking one skips to the editor with default config. The textarea is the recommended, highlighted path.

### AI Creation Path

1. SLP types description → "Build it"
2. POST `/api/tools/generate-config` with `{ description, childProfile }` (child profile from patient record if navigating from patient profile)
   - Response: `{ templateType, configJson, suggestedTitle }`
   - AI picks the template type — SLP does not
3. Redirect to editor with pre-built result
4. Toast: "Built a Token Board — looks wrong? Change type ↓" (escape hatch to template picker)

### Child Profile Piped to AI

When navigating from a patient's profile page (`/patients/:id/tools/new`), pass the patient's `ageRange`, `interests`, and `communicationLevel` fields into the AI call. Currently `childProfile: {}` is always empty even when a patient is selected.

### Patient Assignment Timing

Removed from creation entirely. Moved to publish step (delivery decision, not creation decision).

---

## Section 2: Editor Redesign

### Current State
- Left panel stacks: AppearanceControls → AIAssistPanel → ConfigEditor (appearance before content, AI buried)
- 50/50 left/right split — preview doesn't get dominant real estate
- "Save & Publish →" conflates draft-saving and publishing
- No inline title editing — title buried inside template-specific config editors

### Redesigned Layout

```
[Top bar]
← Back   [Tool title — inline editable]   [Save draft]   [Publish →]

[Main: 40% left | 60% right]
────────────────────────────   ─────────────────────────────
[AI Refine — top, always       [Live preview — full height]
 visible, prominent]            [Device toggle: tablet | phone]
  textarea                      [Fullscreen ↗]
  pre-filled with original
  description if AI-created
  [Apply] button
────────────────────────────
[Tabs: Content | Appearance]
  Content = ConfigEditor
  Appearance = AppearanceControls
```

### Changes

**AI Refine at top, always visible.** Not collapsible. Pre-filled with original description for AI-created tools so SLPs can iterate ("change the reward to free play") rather than stare at a blank box. This converts AI from one-shot generator to conversational refinement loop.

**Content / Appearance tabs.** Collapses current stacked layout. Content first (words, buttons, items). Appearance second (colors, high contrast, theme). Matches SLP mental priority.

**Inline title editing** in top bar — always visible regardless of template type.

**Save draft / Publish split.** "Save draft" = outline button (also auto-saves on 1.5s debounce, already implemented). "Publish →" = primary gradient CTA. Removes the conflation of saving and publishing.

**60% preview panel.** The tool preview is the product — dominant position. Left panel is controls.

**Device frame toggle** (tablet / phone) in preview. Most children use iPads; some parents use phones. Layout differences matter.

---

## Section 3: Publish & Patient Assignment

### Current State
- Dead-end page — shows raw share token, no next action
- No guidance on what to do with the link
- No way to unpublish or retract
- No versioning visibility

### Redesigned Publish Panel (slide-over, not new page)

Clicking "Publish →" opens a slide-over panel:

```
ASSIGN TO CHILD (optional)
  [Patient dropdown — searchable from caseload]
  Attaches usage data to child's profile

SHARE LINK
  [Copy link]  https://vocali.health/t/abc123
  [QR code — for beaming to child's tablet]

OPEN IN SESSION (primary CTA — gradient, full width)
  Opens tool fullscreen, immediately ready for child

[Secondary] Share with family →
  Routes through family dashboard (not raw link)

[Footer] Unpublish · Version 2 — family link auto-updates
```

### Key Changes

**"Open in Session" as primary CTA.** SLPs often build and use immediately. One tap opens fullscreen on same device, ready for child.

**QR code.** SLPs frequently run tools on a second device (child's iPad). QR code eliminates manual URL entry.

**Family share via dashboard.** Routes through the existing caregiver notification system — parent sees "Liam's therapist shared a new tool" rather than a random URL in a text message.

**Versioning indicator.** "Version N — family link auto-updates" addresses anxiety about whether parents are using old versions.

**Unpublish.** Currently unreachable. Add to panel footer.

---

## Section 4: Runtime Quality

### AAC Communication Board

**Fitzgerald color coding.**  
Buttons get background color by grammatical category. AI assigns categories at generation; SLP overrides in editor. Standard mapping:
- Green = verbs/actions
- Yellow = pronouns/people  
- Orange = nouns
- Blue = describing words
- Pink = social phrases
- White = core/function words

**Symbol slots.**  
Each button gets an image well with three fill options:
1. Upload photo
2. Search bundled SVG symbol library (~200 core vocabulary symbols minimum)
3. AI-generated image for fringe vocabulary (Gemini image generation, already in stack)

**Motor planning layout.**  
Button positions locked by grid slot index. Adding/removing buttons does not shuffle existing positions. Hard requirement for non-verbal AAC users — position scrambling destroys muscle memory.

**Sentence strip (optional).**  
Strip at top of board accumulates tapped words before speaking. Toggle in editor. Enables sentence composition before output.

### Token Board

**Animated token fill.**  
300ms scale+opacity bounce per token using existing `cubic-bezier(0.4, 0, 0.2, 1)`. No instant state switch.

**Completion celebration.**  
Replace `ReinforcementBanner` with full-screen moment: confetti burst (CSS-only; disabled when `highContrast: true` per motion sensitivity), reward image, large reward label.

**Reward image upload.**  
Photo of the actual reward (actual iPad, actual playground, actual snack) dramatically increases motivation for pre-readers. New `rewardImageUrl` field on `TokenBoardConfig`.

**Undo last token.**  
Long-press or subtle undo button to un-add last token without full reset. Fixes accidental taps mid-session.

### Visual Schedule

**Step countdown timer.**  
`durationMinutes` already in schema. In runtime, tapping the active step starts a visual countdown ring around the step icon. Configurable per step in editor.

**Per-step completion animation.**  
Checkmark animates on tap. Completed step recedes (opacity + slight scale down) so attention flows to next step.

**All-done moment.**  
Brief celebration screen when last step is checked before reset or hold-on-completion (configurable).

### Matching Game

**Difficulty wired to content.**  
`difficulty` shell toggle currently has no effect on content. Wire it: easy = 2 pairs, medium = 4 pairs, hard = all pairs.

**Answer feedback.**  
Correct = green pulse + audio chime. Incorrect = gentle red shake (no buzzer — avoids negative auditory feedback for ASD users). No "wrong!" text.

**Image prompt support.**  
Extend `MatchingGameConfig` pairs to support `promptImageUrl` — match picture of dog to word "dog." Opens template to expressive language goals.

### All Templates: Session Mode

**Session URL param.**  
When opened via "Open in Session," URL carries `?session=true&patientId=<id>`. Runtime detects this and enables session mode features.

**Session context banner.**  
Small top bar visible to SLP: `Session · Liam · Oct 2 · 8:42am · elapsed time`. Below fold on mobile, not visible to child if iPad is in child's hands.

**Floating SLP dot.**  
Small circular button in corner (session mode only). Opens slide-up SLP overlay without interrupting child's view:
- Live event feed: "tapped 'more' · 14s ago"
- Current progress (tokens earned, schedule step)
- "End session" button

**Post-session summary modal.**  
```
Session summary · Liam · 8 min 23 sec
────────────────────────────────
Tokens earned: 4 of 5
Total taps: 12
Most used button: "more" (4×)
────────────────────────────────
[Add note]     [Save to Liam's profile]
```
Saves to `tool_events`. Auto-generates pre-filled session note text for EMR copy-paste.

---

## Section 5: SLP Data Visibility

### Current State
- `tool_events` table logs: `app_opened`, `item_tapped`, `answer_correct`, `answer_incorrect`, `activity_completed`, `token_added`, `audio_played`, `app_closed`
- `getEventSummaryByPatient` query exists and aggregates completions + interactions
- None surfaced in UI — data is invisible

### Patient Profile: Tool Activity Panel

Below existing tool list on patient profile:

```
Tool Activity — Liam Chen
[Last 7 days] [Last 30 days] [All time]

Marcus Token Board          Last used: Today
  ████████░░  4 sessions · 87% completion rate
  Most used: "free play" reward

AAC Board: Snack Requests   Last used: 2 days ago
  ████░░░░░░  8 sessions · 23 total taps
  Most tapped: "more" (34%), "help" (22%)
```

Each row expandable to session-by-session breakdown. Built from `getEventSummaryByPatient` — needs completion rate and frequency calculations added to existing query.

### IEP Goal Linking (lightweight)

New `goalTags: v.optional(v.array(v.string()))` field on `app_instances`. In editor Content tab, a "Goal tags" field — SLP types or selects from existing tags used for this patient. Free-text strings, no complex schema.

On patient profile, tool activity groups by goal tag: "For '/s/ production' goal: 3 tools, 12 sessions this month."

This is not clinical documentation — it is a lightweight organizational layer for IEP meeting prep and goal justification.

### Auto-Generated Session Note

After "Save to Liam's profile" from post-session summary, pre-filled note ready for EMR copy-paste:

```
Session date: April 2, 2026
Tool: Marcus Token Board
Duration: 8 min 23 sec
Data: Earned 4/5 tokens. 12 total interactions.
Goal tags: positive reinforcement, on-task behavior
Notes: [SLP adds clinical observations]
```

### My Tools Page Enhancements

**Activity badges.** Tool cards show green dot + "Used today" or "3 sessions this week" if used in last 7 days. Built from `getEventSummaryByPatient`.

**"Use for another child →" button.** Surfaces existing `duplicate` mutation on each tool card. Currently buried in a dialog. This is the primary SLP reuse pattern — one good tool adapted for multiple children.

---

## Schema Changes Required

| Table | Change | Purpose |
|---|---|---|
| `app_instances` | Add `goalTags: v.optional(v.array(v.string()))` | IEP goal linking |
| `app_instances` | Add `sessionMode: v.optional(v.boolean())` | Detect session vs. standalone open |
| `tool_events` | Add `sessionId: v.optional(v.string())` | Group events into sessions |
| `tool_events` | Add `eventSource: v.optional(v.union(v.literal("child"), v.literal("slp")))` | Distinguish child tap vs. SLP-assisted |
| Template configs | AAC: add `symbolUrl`, `wordCategory` per button | Fitzgerald + symbol support |
| Template configs | Token: add `rewardImageUrl` | Reward image |
| Template configs | Matching: add `promptImageUrl` per pair | Image prompt support |

---

## What Is Explicitly Out of Scope

- Full IEP documentation system (HIPAA-compliant clinical records)
- Billing/insurance integration
- Real-time multiplayer (SLP + child on separate devices simultaneously)
- Custom template creation by SLPs
- Offline mode
- New template types beyond the existing 5

---

## Complexity Summary

| Section | Complexity | Key risk |
|---|---|---|
| Entry flow (AI-first) | Medium | AI template inference wrong type — need graceful correction flow |
| Editor layout | Low-Medium | State management when AI Refine overwrites existing edits |
| Publish panel | Low | QR code library selection |
| Runtime: symbols + Fitzgerald | High | Symbol library sourcing and bundling size |
| Runtime: animations + session mode | Medium | Motion sensitivity — all animations must respect `highContrast` flag |
| Data visibility | Medium | `getEventSummaryByPatient` N+1 query pattern at scale |
