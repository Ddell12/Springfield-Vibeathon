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
1. Communication Board (AAC) — icon: `forum`
2. Visual Schedule / Routine — icon: `schedule`
3. Token/Reward Board — icon: `star`
4. Social Story — icon: `menu_book`
5. Feelings Check-In — icon: `favorite`

**Expandable "More options" — Chips:**
6. Flashcards / Matching Game
7. Data Collection / Behavior Tracker
8. Timer / Transition Tool
9. Choice Board
10. Articulation / Speech Practice

**Escape hatch:** Muted text link "Or just describe what you want" focuses the text input for free-form prompting.

## Interview Flow

**Integration point:** The `showPromptScreen` branch in `builder-page.tsx` (the full-width centered prompt, rendered when there's no session) is where the interview lives. This is the primary entry point — the `ChatPanel` empty state is never reached because `builder-page.tsx` renders the prompt screen before ever mounting `ChatPanel`.

```
User lands on builder (no session)
  → builder-page.tsx showPromptScreen renders CategoryPicker (replaces current prompt input + THERAPY_SUGGESTIONS)
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
interface QuestionOption {
  label: string;          // user-facing text (e.g., "Toddler (1-3)")
  value: string;          // schema-compatible value (e.g., "toddler")
}

interface InterviewQuestion {
  id: string;
  text: string;
  type: "chips" | "select" | "text";
  options?: QuestionOption[];   // label/value pairs — labels shown to user, values stored + mapped to schema enums
  defaultValue?: string;
  required: boolean;
  phase: "essential" | "extended";
}

interface CategoryConfig {
  id: string;
  label: string;
  icon: string;           // Material Symbols icon name (e.g., "forum", "schedule", "star")
  description: string;    // user-facing subtitle
  questions: InterviewQuestion[];
  defaults: Partial<TherapyBlueprint>;
  promptTemplate: (answers: Record<string, string | string[]>) => string;
  // Produces the natural-language prompt only. Blueprint is assembled separately by blueprint-assembler.ts.
}
```

### Example: Communication Board

**Essential:**
1. "Who will use this app?" — chips: `[{label: "Toddler (1-3)", value: "toddler"}, {label: "Preschool (3-5)", value: "preschool"}, {label: "School-age (6-12)", value: "school-age"}, {label: "Teen/Adult", value: "adolescent"}]`
2. "How many words on the board?" — chips: `[{label: "6 (simple)", value: "6"}, {label: "9 (standard)", value: "9"}, {label: "12+ (advanced)", value: "12"}]`
3. "What kind of words?" — chips: `[{label: "Core words (want, help, more...)", value: "core"}, {label: "Food & drink", value: "food"}, {label: "Feelings", value: "feelings"}, {label: "Activities", value: "activities"}, {label: "Custom — I'll type them", value: "custom"}]`

**Extended (shared across categories):**
- Interaction style — chips: `[{label: "Tap to select", value: "tap"}, {label: "Drag and drop", value: "drag"}, {label: "Sequence/order", value: "sequence"}, {label: "Free-form", value: "free-form"}]`
- Reinforcement — chips: `[{label: "Stars/tokens", value: "tokens"}, {label: "Animations", value: "animation"}, {label: "Sounds", value: "sound"}, {label: "Points", value: "points"}, {label: "Just a checkmark", value: "completion"}]`
- Accessibility — multi-select chips: `[{label: "High contrast", value: "high-contrast"}, {label: "Large touch targets", value: "large-targets"}, {label: "No sound required", value: "no-sound"}, {label: "Simple animations only", value: "simple-animations"}, {label: "None of these", value: "none"}]`
- Color preference — chips: `[{label: "Calm/cool tones", value: "cool"}, {label: "Warm/cheerful", value: "warm"}, {label: "High contrast", value: "high-contrast"}, {label: "Let AI decide", value: "auto"}]`

The `value` fields map directly to `TherapyBlueprintSchema` enum values (e.g., `ageRange`, `interactionModel`, `reinforcementStrategy.type`). The `blueprint-assembler.ts` module reads `value` fields, not labels.

### Example: Token/Reward Board

**Essential:**
1. "Who will use this app?" — same age chips as Communication Board
2. "How many tokens to earn a reward?" — chips: `[{label: "3 (quick)", value: "3"}, {label: "5 (standard)", value: "5"}, {label: "10 (challenge)", value: "10"}]`
3. "What kind of rewards?" — chips: `[{label: "Child picks from options", value: "child-choice"}, {label: "Stickers & praise", value: "stickers"}, {label: "Screen time", value: "screen-time"}, {label: "Custom", value: "custom"}]`

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
      "options": [
        { "label": "Fitzgerald Key colors", "value": "fitzgerald" },
        { "label": "Simple grid", "value": "simple-grid" },
        { "label": "Let AI decide", "value": "auto" }
      ]
    }
  ],
  "blueprint": { /* draft TherapyBlueprint */ }
}
```

**Model:** `claude-haiku-4-5-20251001` — this is a lightweight structuring task (not code gen), so Haiku is sufficient and keeps latency under 2s. The main generation pipeline uses `claude-sonnet-4-6` for code generation; this is intentionally a cheaper, faster model.

**System prompt focus:** "Given therapy app requirements, return 1-2 smart follow-up questions that would meaningfully improve the app, and a complete TherapyBlueprint conforming to the schema. Each follow-up question must use `QuestionOption[]` format with `{label, value}` pairs so values can be mapped to blueprint schema fields."

### Error Handling

If the follow-up call fails, times out (>5s), or returns malformed JSON:
- Skip follow-ups entirely and proceed to blueprint assembly using only category defaults + user answers
- Show a subtle toast: "Couldn't load suggestions, building with your answers."
- The user can still approve or modify the blueprint via the BlueprintCard

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

A new `BlueprintApprovalCard` component wraps the existing read-only `BlueprintCard` and adds action buttons below it. The existing `BlueprintCard` remains unchanged (it's also used during/after generation to display the blueprint).

`BlueprintApprovalCard` renders:
- The existing `BlueprintCard` (displays title, therapy goal, target skill, age range, interaction model, description)
- **"Build this!"** (primary gradient button) — fires `onApprove()`, which triggers generation
- **"Change something"** (ghost button) — fires `onEdit()`, which re-enters the interview

### "Change something" Re-Entry

Re-entering preserves all previous answers. The user sees the adaptive gate again and can:
- Scroll up and re-select any previous answer (chips re-render as interactive)
- Type freeform adjustments in the text input (e.g., "Actually, make it 12 words instead of 9")
- Freeform changes get folded into the next LLM follow-up call to re-generate the blueprint
- A new BlueprintApprovalCard appears for re-approval

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
    interview-controller.tsx — orchestrates flow, calls follow-up endpoint, shows BlueprintApprovalCard
    blueprint-approval-card.tsx — wraps read-only BlueprintCard + "Build this!" / "Change something" buttons
  hooks/
    use-interview.ts         — useReducer wrapper, exposes answer/advance/reset

src/app/api/interview-followup/
  route.ts                   — Haiku endpoint: category + answers → follow-ups + draft blueprint
```

### Modified Files

| File | Change |
|------|--------|
| `builder-page.tsx` | The `showPromptScreen` branch (full-width centered prompt) renders `CategoryPicker` + `InterviewController` instead of the current prompt input + suggestion chips. Wire `onBlueprintReady` from `InterviewController` to store blueprint in local state. Pass blueprint into `useStreaming.generate(prompt, blueprint)`. |
| `use-streaming.ts` | `generate()` accepts an optional second parameter `blueprint?: TherapyBlueprint`. Pass it in the fetch body to `POST /api/generate`. |
| `chat-panel.tsx` | When idle + no session, render `InterviewController` instead of empty state. New `onBlueprintReady` prop threaded up to `builder-page.tsx`. |
| `constants.ts` | `THERAPY_SUGGESTIONS` kept as fallback chips for the escape hatch free-text input. |
| `schemas/generate.ts` | Add optional `blueprint` field to `GenerateInputSchema` using `z.any().optional()` (matches the `v.any()` pattern in Convex schema — the blueprint is validated via `TherapyBlueprintSchema` at the application layer, not at the transport schema level). |
| `route.ts` (generate) | If `blueprint` present in request body, prepend as structured context block in user message: `"## Pre-Approved Blueprint\n\n{JSON}\n\n## User Request\n\n{prompt}"`. |

### Unchanged Files

- `blueprint-card.tsx` — used as-is (read-only display, composed inside new `BlueprintApprovalCard`)
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
