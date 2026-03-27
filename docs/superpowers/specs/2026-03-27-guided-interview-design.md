# Guided Interview Feature — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Approach:** Hybrid — Hardcoded UI + LLM Refinement (Approach C)

## Overview

Add a guided interview to the builder chat panel that helps ABA therapists, SLPs, and parents of ASD children build the right therapy app through targeted questions. The interview replaces the blank prompt screen with a structured, category-driven flow that produces a precise blueprint for the AI code generation agent.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Target users | Both therapists and parents — adaptive language, no jargon by default |
| Location | Inside the chat panel (not a separate page or form) |
| Category picker | Hybrid: 5 visual cards + expandable "More options" for remaining 5 |
| Number of categories | 10 |
| Interview depth | Adaptive: 2-3 essential questions → optional "Customize more" gate → 3-4 extended |
| Question engine | Hybrid: hardcoded UI for structured questions, single LLM call for smart follow-ups |
| Output | Rich text prompt in chat history + structured TherapyBlueprint metadata on session |
| Approval | BlueprintCard shown before generation, user must tap "Build this!" to proceed |

## Categories (10)

**Top 5 — Visual Cards:**
1. Communication Board (AAC) — icon: `message_square`
2. Visual Schedule / Routine — icon: `calendar_clock`
3. Token/Reward Board — icon: `star`
4. Social Story — icon: `book_open`
5. Feelings Check-In — icon: `heart`

**Expandable "More options" — Chips:**
6. Flashcards / Matching Game
7. Data Collection / Behavior Tracker
8. Timer / Transition Tool
9. Choice Board
10. Articulation / Speech Practice

**Escape hatch:** Muted text link "Or just describe what you want" focuses the text input for free-form prompting.

## Interview Flow

```
User lands on builder (no session)
  → Category Picker replaces current THERAPY_SUGGESTIONS chips
  → User taps a category card/chip
  → System message: "Let's build a Communication Board!"
  → Essential Questions (2-3, hardcoded per category)
    → Rendered as assistant chat bubbles with interactive chips/select/text
    → Each answer locks in as a user message
  → Adaptive Gate: "Want to customize further?"
    → [Show me the plan] → skip to LLM follow-up
    → [Customize more] → Extended Questions (3-4)
  → LLM Follow-Up Call (single Haiku call)
    → Returns 1-2 smart contextual follow-ups + draft blueprint
    → Follow-ups render as chat bubbles with chips (skippable)
  → Blueprint Assembly (client-side)
    → Merges: category defaults + user answers + LLM output
    → Produces: TherapyBlueprint + rich text prompt
  → BlueprintCard shown in chat for approval
    → [Build this!] → triggers generation
    → [Change something] → re-enter interview at gate phase
```

## Category Question Definitions

### Question Schema

```typescript
interface InterviewQuestion {
  id: string;
  text: string;
  type: "chips" | "select" | "text";
  options?: string[];
  defaultValue?: string;
  required: boolean;
  phase: "essential" | "extended";
}

interface CategoryConfig {
  id: string;
  label: string;
  icon: string;           // Material icon name
  description: string;    // user-facing subtitle
  questions: InterviewQuestion[];
  defaults: Partial<TherapyBlueprint>;
  promptTemplate: (answers: Record<string, string | string[]>) => string;
}
```

### Example: Communication Board

**Essential:**
1. "Who will use this app?" — chips: `["Toddler (1-3)", "Preschool (3-5)", "School-age (6-12)", "Teen/Adult"]`
2. "How many words on the board?" — chips: `["6 (simple)", "9 (standard)", "12+ (advanced)"]`
3. "What kind of words?" — chips: `["Core words (want, help, more...)", "Food & drink", "Feelings", "Activities", "Custom — I'll type them"]`

**Extended:**
- Interaction style — chips: `["Tap to select", "Drag and drop", "Sequence/order", "Free-form"]`
- Reinforcement — chips: `["Stars/tokens", "Animations", "Sounds", "Points", "Just a checkmark"]`
- Accessibility — multi-select chips: `["High contrast", "Large touch targets", "No sound required", "Simple animations only", "None of these"]`
- Color preference — chips: `["Calm/cool tones", "Warm/cheerful", "High contrast", "Let AI decide"]`

### Example: Token/Reward Board

**Essential:**
1. "Who will use this app?" — same age chips
2. "How many tokens to earn a reward?" — chips: `["3 (quick)", "5 (standard)", "10 (challenge)"]`
3. "What kind of rewards?" — chips: `["Child picks from options", "Stickers & praise", "Screen time", "Custom"]`

**Extended:** Same extended questions as Communication Board (shared across categories).

## LLM Follow-Up Endpoint

### `POST /api/interview-followup`

**Request:**
```json
{
  "category": "communication-board",
  "answers": {
    "age_range": "Preschool (3-5)",
    "word_count": "9 (standard)",
    "word_type": "Core words (want, help, more...)"
  }
}
```

**Response (via Claude Haiku tool_use):**
```json
{
  "followUps": [
    {
      "id": "color_coding",
      "text": "Should words be organized by color category (like Fitzgerald Key) or in a simple grid?",
      "type": "chips",
      "options": ["Fitzgerald Key colors", "Simple grid", "Let AI decide"]
    }
  ],
  "blueprint": { /* draft TherapyBlueprint */ }
}
```

**Model:** Claude Haiku (fast, cheap — this is a structuring task, not code gen).

**System prompt focus:** "Given therapy app requirements, return 1-2 smart follow-up questions that would meaningfully improve the app, and a complete TherapyBlueprint conforming to the schema."

## Blueprint Assembly

Three sources merged in order of precedence:

1. **Category defaults** — hardcoded per category (interaction model, frameworks, pitfalls, base color palette)
2. **User answers** — from interview questions (age, content, preferences)
3. **LLM-generated fields** — from follow-up call (therapy goal description, detailed description, smart defaults for untouched fields)

Output conforms to existing `TherapyBlueprintSchema` — no schema changes.

### Rich Prompt Assembly

A `promptTemplate` function per category converts answers to natural language. Example:

> "Build a communication board for a preschool-age nonverbal child. Include a 3x3 grid with 9 core words: want, help, more, stop, yes, no, eat, drink, play. Each card has a picture and label. Tapping a card speaks the word aloud and adds it to a sentence strip at the top. Use calm/cool tones, tap-to-select interaction, and star animations for reinforcement."

This prompt is posted as the user message in chat history.

## Blueprint Approval

The existing `BlueprintCard` component renders in the chat after assembly. Two buttons below it:

- **"Build this!"** (primary gradient) — fires `onGenerate(richPrompt)` + `onBlueprintReady(blueprint)`, generation begins
- **"Change something"** (ghost) — re-enters interview at gate phase, user can re-answer or type freeform adjustments

## Generation Handoff

1. Rich text prompt sent as `query` field to `POST /api/generate` (existing field)
2. Structured blueprint attached as new optional `blueprint` field on request
3. Generate route prepends blueprint to user message: `"## Pre-Approved Blueprint\n\n{JSON}\n\n## User Request\n\n{prompt}"`
4. Blueprint stored on session document in Convex (existing `blueprint` field, `v.any()`)

## Free-Form Input Fallback

At any point during the interview, if the user types in the text input instead of tapping chips:
- Their message is treated as freeform context
- The LLM follow-up call incorporates it alongside structured answers
- Handles cases like: "my son loves dinosaurs, can the words be dinosaur-themed?"

## File Architecture

### New Files

```
src/features/builder/
  lib/interview/
    categories.ts            — 10 category configs (id, label, icon, questions, defaults, promptTemplate)
    interview-state.ts       — InterviewState type + reducer
    blueprint-assembler.ts   — merges answers + LLM output → TherapyBlueprint + rich prompt
  components/interview/
    category-picker.tsx      — visual cards + expandable "More options" + escape hatch
    interview-question.tsx   — single question as chat bubble + chips/select/text
    interview-controller.tsx — orchestrates flow, calls follow-up endpoint, shows BlueprintCard
  hooks/
    use-interview.ts         — useReducer wrapper, exposes answer/advance/reset

src/app/api/interview-followup/
  route.ts                   — Haiku endpoint: category + answers → follow-ups + draft blueprint
```

### Modified Files

| File | Change |
|------|--------|
| `chat-panel.tsx` | When idle + no session, render `InterviewController` instead of empty state. New `onBlueprintReady` prop. |
| `builder-page.tsx` | Thread blueprint from chat panel to generate call. Minimal wiring. |
| `constants.ts` | `THERAPY_SUGGESTIONS` replaced or kept as fallback for escape hatch. |
| `schemas/generate.ts` | Add optional `blueprint` field to `GenerateInputSchema`. |
| `route.ts` (generate) | If `blueprint` present, prepend as structured context in user message. |

### Unchanged Files

- `blueprint-card.tsx` — used as-is
- `agent-prompt.ts` — system prompt unchanged
- `convex/schema.ts` — `blueprint` field already `v.any()`
- `convex/sessions.ts` — no changes

## Component Responsibilities

| Component | Responsibility | State Owned |
|-----------|---------------|-------------|
| `CategoryPicker` | Renders cards + chips, emits `onSelect(categoryId)` | None (stateless) |
| `InterviewQuestion` | Renders one question bubble + answer UI, emits `onAnswer(id, value)` | None (stateless) |
| `useInterview` | Manages interview state via reducer | `InterviewState` |
| `InterviewController` | Orchestrates: which question, when to call LLM, when to show blueprint | Reads `useInterview`, owns `followUpLoading` |
| `ChatPanel` | Decides interview vs normal chat | None new |

## InterviewState Shape

```typescript
interface InterviewState {
  phase: "category_select" | "essential" | "gate" | "extended" | "followup" | "review";
  category: string | null;
  answers: Record<string, string | string[]>;
  freeformNotes: string[];
  currentQuestionIndex: number;
  draftBlueprint: TherapyBlueprint | null;
  followUpQuestions: InterviewQuestion[];
  richPrompt: string | null;
}
```

## Testing Strategy

- **Unit tests** for `interview-state.ts` reducer (phase transitions, answer accumulation)
- **Unit tests** for `blueprint-assembler.ts` (merging logic, prompt template output)
- **Component tests** for `CategoryPicker`, `InterviewQuestion` (render + interaction)
- **Integration test** for `InterviewController` (mock LLM endpoint, verify full flow from category select to blueprint approval)
- **E2E test** for the happy path: select category → answer questions → approve blueprint → verify generation starts
