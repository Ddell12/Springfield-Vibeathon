# Guided Interview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a guided interview flow to the builder that asks targeted questions based on 10 therapy categories, then assembles a structured blueprint for AI code generation.

**Architecture:** Client-side interview state machine with hardcoded UI questions rendered as chat bubbles, a single Haiku LLM call for smart follow-ups, and a BlueprintApprovalCard for user confirmation before generation. The interview replaces the current prompt screen in `builder-page.tsx`.

**Tech Stack:** React (useReducer), Vitest + RTL (testing), Anthropic SDK with Haiku (follow-up endpoint), existing shadcn/ui components, existing TherapyBlueprintSchema (Zod)

**Spec:** `docs/superpowers/specs/2026-03-27-guided-interview-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/features/builder/lib/interview/types.ts` | `QuestionOption`, `InterviewQuestion`, `CategoryConfig`, `InterviewState` types |
| `src/features/builder/lib/interview/categories.ts` | 10 category configs with questions, defaults, and prompt templates |
| `src/features/builder/lib/interview/interview-state.ts` | `interviewReducer` + action types — drives phase transitions and answer accumulation |
| `src/features/builder/lib/interview/blueprint-assembler.ts` | Merges category defaults + user answers + LLM output → `TherapyBlueprint` + rich prompt string |
| `src/features/builder/hooks/use-interview.ts` | `useInterview()` hook — wraps `useReducer`, exposes `answer()`, `advance()`, `reset()` |
| `src/features/builder/components/interview/category-picker.tsx` | 5 visual cards + expandable "More options" chips + escape hatch link |
| `src/features/builder/components/interview/interview-question.tsx` | Single question rendered as chat bubble with chips/select/text input |
| `src/features/builder/components/interview/blueprint-approval-card.tsx` | Wraps read-only `BlueprintCard` + "Build this!" / "Change something" buttons |
| `src/features/builder/components/interview/interview-controller.tsx` | Orchestrates full interview flow: category → questions → LLM → approval |
| `src/app/api/interview-followup/route.ts` | Haiku endpoint: category + answers → follow-up questions + draft blueprint |

### Modified Files

| File | Change |
|------|--------|
| `src/features/builder/lib/schemas/generate.ts` | Add optional `blueprint` field (`z.any().optional()`) |
| `src/features/builder/hooks/use-streaming.ts:329-412` | `generate()` accepts optional `blueprint?: TherapyBlueprint` param, passes it in fetch body |
| `src/features/builder/components/builder-page.tsx:155-211` | `showPromptScreen` branch renders interview instead of prompt input. `handleGenerate` accepts optional blueprint param. |
| `src/app/api/generate/route.ts:86,155` | If `blueprint` present, prepend as structured context in user message |

**Note:** `chat-panel.tsx` is NOT modified. Per the spec, the `showPromptScreen` branch in `builder-page.tsx` renders before `ChatPanel` is ever mounted, so the interview lives entirely in the prompt screen — not in the chat panel's empty state.

### Test Files

| File | Tests |
|------|-------|
| `src/features/builder/lib/interview/__tests__/interview-state.test.ts` | Reducer: phase transitions, answer accumulation, reset |
| `src/features/builder/lib/interview/__tests__/blueprint-assembler.test.ts` | Merging logic, prompt template output, edge cases |
| `src/features/builder/lib/interview/__tests__/categories.test.ts` | All 10 categories have required fields, valid question options |
| `src/features/builder/hooks/__tests__/use-interview.test.ts` | Hook: answer, advance, reset actions |
| `src/features/builder/components/interview/__tests__/category-picker.test.tsx` | Renders cards, expand/collapse, escape hatch, click handlers |
| `src/features/builder/components/interview/__tests__/interview-question.test.tsx` | Renders chips/select/text, emits answers |
| `src/features/builder/components/interview/__tests__/blueprint-approval-card.test.tsx` | Renders blueprint, button clicks |
| `src/features/builder/components/interview/__tests__/interview-controller.test.tsx` | Integration: full flow with mocked LLM |

---

## Task 1: Interview Types

**Files:**
- Create: `src/features/builder/lib/interview/types.ts`
- Test: `src/features/builder/lib/interview/__tests__/categories.test.ts` (types used implicitly)

- [ ] **Step 1: Create the types file**

```typescript
// src/features/builder/lib/interview/types.ts
import type { TherapyBlueprint } from "../schemas";

export interface QuestionOption {
  label: string;
  value: string;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  type: "chips" | "select" | "text";
  options?: QuestionOption[];
  defaultValue?: string;
  required: boolean;
  phase: "essential" | "extended";
}

export type InterviewPhase =
  | "category_select"
  | "essential"
  | "gate"
  | "extended"
  | "followup"
  | "review";

export interface InterviewState {
  phase: InterviewPhase;
  category: string | null;
  answers: Record<string, string | string[]>;
  freeformNotes: string[];
  currentQuestionIndex: number;
  draftBlueprint: TherapyBlueprint | null;
  followUpQuestions: InterviewQuestion[];
  richPrompt: string | null;
}

export interface CategoryConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
  questions: InterviewQuestion[];
  defaults: Partial<TherapyBlueprint>;
  promptTemplate: (answers: Record<string, string | string[]>) => string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/builder/lib/interview/types.ts
git commit -m "feat(interview): add interview type definitions"
```

---

## Task 2: Interview State Reducer

**Files:**
- Create: `src/features/builder/lib/interview/interview-state.ts`
- Test: `src/features/builder/lib/interview/__tests__/interview-state.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/builder/lib/interview/__tests__/interview-state.test.ts
import { describe, expect, it } from "vitest";

import {
  createInitialState,
  interviewReducer,
} from "../interview-state";
import type { InterviewQuestion } from "../types";

describe("interviewReducer", () => {
  it("initializes in category_select phase", () => {
    const state = createInitialState();
    expect(state.phase).toBe("category_select");
    expect(state.category).toBeNull();
    expect(state.answers).toEqual({});
  });

  it("SELECT_CATEGORY transitions to essential phase", () => {
    const state = createInitialState();
    const next = interviewReducer(state, {
      type: "SELECT_CATEGORY",
      categoryId: "communication-board",
    });
    expect(next.phase).toBe("essential");
    expect(next.category).toBe("communication-board");
    expect(next.currentQuestionIndex).toBe(0);
  });

  it("ANSWER stores the answer and advances question index", () => {
    const state = {
      ...createInitialState(),
      phase: "essential" as const,
      category: "communication-board",
      currentQuestionIndex: 0,
    };
    const next = interviewReducer(state, {
      type: "ANSWER",
      questionId: "age_range",
      value: "preschool",
    });
    expect(next.answers["age_range"]).toBe("preschool");
    expect(next.currentQuestionIndex).toBe(1);
  });

  it("SHOW_GATE transitions to gate phase", () => {
    const state = {
      ...createInitialState(),
      phase: "essential" as const,
      category: "communication-board",
    };
    const next = interviewReducer(state, { type: "SHOW_GATE" });
    expect(next.phase).toBe("gate");
  });

  it("CHOOSE_CUSTOMIZE transitions to extended phase", () => {
    const state = {
      ...createInitialState(),
      phase: "gate" as const,
      category: "communication-board",
    };
    const next = interviewReducer(state, { type: "CHOOSE_CUSTOMIZE" });
    expect(next.phase).toBe("extended");
    expect(next.currentQuestionIndex).toBe(0);
  });

  it("CHOOSE_SKIP transitions to followup phase", () => {
    const state = {
      ...createInitialState(),
      phase: "gate" as const,
      category: "communication-board",
    };
    const next = interviewReducer(state, { type: "CHOOSE_SKIP" });
    expect(next.phase).toBe("followup");
  });

  it("SET_FOLLOWUPS stores follow-up questions and draft blueprint", () => {
    const state = {
      ...createInitialState(),
      phase: "followup" as const,
      category: "communication-board",
    };
    const followUps: InterviewQuestion[] = [
      { id: "color_coding", text: "Use Fitzgerald Key?", type: "chips", options: [{ label: "Yes", value: "yes" }], required: false, phase: "extended" },
    ];
    const draftBlueprint = { title: "My Board" } as any;
    const next = interviewReducer(state, {
      type: "SET_FOLLOWUPS",
      followUpQuestions: followUps,
      draftBlueprint,
    });
    expect(next.followUpQuestions).toHaveLength(1);
    expect(next.draftBlueprint?.title).toBe("My Board");
  });

  it("SHOW_REVIEW transitions to review phase", () => {
    const state = {
      ...createInitialState(),
      phase: "followup" as const,
    };
    const next = interviewReducer(state, {
      type: "SHOW_REVIEW",
      blueprint: { title: "Final" } as any,
      richPrompt: "Build a board",
    });
    expect(next.phase).toBe("review");
    expect(next.draftBlueprint?.title).toBe("Final");
    expect(next.richPrompt).toBe("Build a board");
  });

  it("ADD_FREEFORM appends to freeformNotes", () => {
    const state = createInitialState();
    const next = interviewReducer(state, {
      type: "ADD_FREEFORM",
      note: "my kid loves dinosaurs",
    });
    expect(next.freeformNotes).toContain("my kid loves dinosaurs");
  });

  it("RESET returns to initial state", () => {
    const state = {
      ...createInitialState(),
      phase: "review" as const,
      category: "communication-board",
      answers: { age_range: "preschool" },
    };
    const next = interviewReducer(state, { type: "RESET" });
    expect(next.phase).toBe("category_select");
    expect(next.category).toBeNull();
    expect(next.answers).toEqual({});
  });

  it("RE_ENTER preserves answers and returns to gate", () => {
    const state = {
      ...createInitialState(),
      phase: "review" as const,
      category: "communication-board",
      answers: { age_range: "preschool", word_count: "9" },
    };
    const next = interviewReducer(state, { type: "RE_ENTER" });
    expect(next.phase).toBe("gate");
    expect(next.answers).toEqual({ age_range: "preschool", word_count: "9" });
    expect(next.draftBlueprint).toBeNull();
    expect(next.richPrompt).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/lib/interview/__tests__/interview-state.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the reducer**

```typescript
// src/features/builder/lib/interview/interview-state.ts
import type { TherapyBlueprint } from "../schemas";
import type { InterviewPhase, InterviewQuestion, InterviewState } from "./types";

export type InterviewAction =
  | { type: "SELECT_CATEGORY"; categoryId: string }
  | { type: "ANSWER"; questionId: string; value: string | string[] }
  | { type: "SHOW_GATE" }
  | { type: "CHOOSE_CUSTOMIZE" }
  | { type: "CHOOSE_SKIP" }
  | { type: "SET_FOLLOWUPS"; followUpQuestions: InterviewQuestion[]; draftBlueprint: TherapyBlueprint }
  | { type: "SHOW_REVIEW"; blueprint: TherapyBlueprint; richPrompt: string }
  | { type: "ADD_FREEFORM"; note: string }
  | { type: "RESET" }
  | { type: "RE_ENTER" };

export function createInitialState(): InterviewState {
  return {
    phase: "category_select",
    category: null,
    answers: {},
    freeformNotes: [],
    currentQuestionIndex: 0,
    draftBlueprint: null,
    followUpQuestions: [],
    richPrompt: null,
  };
}

export function interviewReducer(
  state: InterviewState,
  action: InterviewAction,
): InterviewState {
  switch (action.type) {
    case "SELECT_CATEGORY":
      return {
        ...state,
        phase: "essential",
        category: action.categoryId,
        currentQuestionIndex: 0,
        answers: {},
        freeformNotes: [],
      };

    case "ANSWER":
      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: action.value },
        currentQuestionIndex: state.currentQuestionIndex + 1,
      };

    case "SHOW_GATE":
      return { ...state, phase: "gate" };

    case "CHOOSE_CUSTOMIZE":
      return { ...state, phase: "extended", currentQuestionIndex: 0 };

    case "CHOOSE_SKIP":
      return { ...state, phase: "followup" };

    case "SET_FOLLOWUPS":
      return {
        ...state,
        followUpQuestions: action.followUpQuestions,
        draftBlueprint: action.draftBlueprint,
        currentQuestionIndex: 0,
      };

    case "SHOW_REVIEW":
      return {
        ...state,
        phase: "review",
        draftBlueprint: action.blueprint,
        richPrompt: action.richPrompt,
      };

    case "ADD_FREEFORM":
      return {
        ...state,
        freeformNotes: [...state.freeformNotes, action.note],
      };

    case "RESET":
      return createInitialState();

    case "RE_ENTER":
      return {
        ...state,
        phase: "gate",
        currentQuestionIndex: 0,
        draftBlueprint: null,
        followUpQuestions: [],
        richPrompt: null,
      };

    default:
      return state;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/lib/interview/__tests__/interview-state.test.ts`
Expected: All 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/lib/interview/interview-state.ts src/features/builder/lib/interview/__tests__/interview-state.test.ts
git commit -m "feat(interview): add interview state reducer with tests"
```

---

## Task 3: Category Definitions (First 3 + Shared Extended)

**Files:**
- Create: `src/features/builder/lib/interview/categories.ts`
- Test: `src/features/builder/lib/interview/__tests__/categories.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/builder/lib/interview/__tests__/categories.test.ts
import { describe, expect, it } from "vitest";

import { CATEGORIES, getCategoryById, getEssentialQuestions, getExtendedQuestions } from "../categories";

describe("categories", () => {
  it("has exactly 10 categories", () => {
    expect(CATEGORIES).toHaveLength(10);
  });

  it("every category has required fields", () => {
    for (const cat of CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.icon).toBeTruthy();
      expect(cat.description).toBeTruthy();
      expect(cat.questions.length).toBeGreaterThanOrEqual(2);
      expect(typeof cat.promptTemplate).toBe("function");
    }
  });

  it("every question has label/value options (not bare strings)", () => {
    for (const cat of CATEGORIES) {
      for (const q of cat.questions) {
        if (q.options) {
          for (const opt of q.options) {
            expect(opt).toHaveProperty("label");
            expect(opt).toHaveProperty("value");
          }
        }
      }
    }
  });

  it("getCategoryById returns the correct category", () => {
    const cat = getCategoryById("communication-board");
    expect(cat?.label).toBe("Communication Board");
  });

  it("getCategoryById returns undefined for unknown id", () => {
    expect(getCategoryById("nonexistent")).toBeUndefined();
  });

  it("getEssentialQuestions returns only essential phase questions", () => {
    const essential = getEssentialQuestions("communication-board");
    expect(essential.length).toBeGreaterThanOrEqual(2);
    expect(essential.every((q) => q.phase === "essential")).toBe(true);
  });

  it("getExtendedQuestions returns only extended phase questions", () => {
    const extended = getExtendedQuestions("communication-board");
    expect(extended.length).toBeGreaterThanOrEqual(3);
    expect(extended.every((q) => q.phase === "extended")).toBe(true);
  });

  it("communication-board promptTemplate includes age and word count", () => {
    const cat = getCategoryById("communication-board")!;
    const prompt = cat.promptTemplate({
      age_range: "preschool",
      word_count: "9",
      word_type: "core",
    });
    expect(prompt).toContain("preschool");
    expect(prompt).toContain("9");
  });

  it("top 5 categories have correct icons for visual cards", () => {
    const top5 = CATEGORIES.slice(0, 5);
    const expectedIcons = ["forum", "schedule", "star", "menu_book", "favorite"];
    expect(top5.map((c) => c.icon)).toEqual(expectedIcons);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/lib/interview/__tests__/categories.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement categories**

Create `src/features/builder/lib/interview/categories.ts` with:
- 10 `CategoryConfig` objects in a `CATEGORIES` array
- Top 5: communication-board, visual-schedule, token-board, social-story, feelings-checkin
- Bottom 5: flashcards, data-tracker, timer-tool, choice-board, articulation-practice
- Each category has 2-3 essential questions with `QuestionOption[]` (label/value pairs)
- 4 shared extended questions (interaction style, reinforcement, accessibility, color preference)
- `promptTemplate` function per category that interpolates answer values into a natural language prompt
- `defaults` partial blueprint per category (e.g., communication-board defaults to `interactionModel: "tap"`)
- Helper functions: `getCategoryById(id)`, `getEssentialQuestions(categoryId)`, `getExtendedQuestions(categoryId)`

**Key implementation details:**
- Age chips shared across all categories: `[{label: "Toddler (1-3)", value: "toddler"}, {label: "Preschool (3-5)", value: "preschool"}, {label: "School-age (6-12)", value: "school-age"}, {label: "Teen/Adult", value: "adolescent"}]`
- Extended question values must map to `TherapyBlueprintSchema` enums exactly: `interactionModel` values are `"tap" | "drag" | "sequence" | "free-form"`, `reinforcementStrategy.type` values are `"tokens" | "animation" | "sound" | "points" | "completion"`
- Prompt templates should produce detailed natural language like the examples in the spec (see spec lines 182-184)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/lib/interview/__tests__/categories.test.ts`
Expected: All 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/lib/interview/categories.ts src/features/builder/lib/interview/__tests__/categories.test.ts
git commit -m "feat(interview): add 10 therapy category definitions with tests"
```

---

## Task 4: Blueprint Assembler

**Files:**
- Create: `src/features/builder/lib/interview/blueprint-assembler.ts`
- Test: `src/features/builder/lib/interview/__tests__/blueprint-assembler.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/builder/lib/interview/__tests__/blueprint-assembler.test.ts
import { describe, expect, it } from "vitest";

import { TherapyBlueprintSchema } from "../../schemas";
import { assembleBlueprint } from "../blueprint-assembler";
import { getCategoryById } from "../categories";

describe("assembleBlueprint", () => {
  const baseAnswers = {
    age_range: "preschool",
    word_count: "9",
    word_type: "core",
    interaction_style: "tap",
    reinforcement: "tokens",
    accessibility: ["none"],
    color_preference: "cool",
  };

  it("produces a valid TherapyBlueprint from category defaults + answers", () => {
    const result = assembleBlueprint("communication-board", baseAnswers, null);
    const parsed = TherapyBlueprintSchema.safeParse(result.blueprint);
    expect(parsed.success).toBe(true);
  });

  it("maps age_range answer to blueprint ageRange field", () => {
    const result = assembleBlueprint("communication-board", baseAnswers, null);
    expect(result.blueprint.ageRange).toBe("preschool");
  });

  it("maps interaction_style answer to blueprint interactionModel", () => {
    const result = assembleBlueprint("communication-board", baseAnswers, null);
    expect(result.blueprint.interactionModel).toBe("tap");
  });

  it("maps reinforcement answer to reinforcementStrategy.type", () => {
    const result = assembleBlueprint("communication-board", baseAnswers, null);
    expect(result.blueprint.reinforcementStrategy.type).toBe("tokens");
  });

  it("produces a non-empty richPrompt string", () => {
    const result = assembleBlueprint("communication-board", baseAnswers, null);
    expect(result.richPrompt.length).toBeGreaterThan(50);
    expect(result.richPrompt).toContain("preschool");
  });

  it("LLM draft blueprint fields override category defaults", () => {
    const llmDraft = {
      therapyGoal: "LLM-generated goal",
      detailedDescription: "LLM detailed desc",
    };
    const result = assembleBlueprint("communication-board", baseAnswers, llmDraft);
    expect(result.blueprint.therapyGoal).toBe("LLM-generated goal");
  });

  it("user answers take precedence over LLM draft for mapped fields", () => {
    const llmDraft = { ageRange: "adult" }; // LLM suggests adult
    const result = assembleBlueprint("communication-board", baseAnswers, llmDraft);
    // User answered "preschool" — should win
    expect(result.blueprint.ageRange).toBe("preschool");
  });

  it("works for token-board category", () => {
    const tokenAnswers = {
      age_range: "school-age",
      token_count: "5",
      reward_type: "child-choice",
      interaction_style: "tap",
      reinforcement: "tokens",
      accessibility: ["none"],
      color_preference: "warm",
    };
    const result = assembleBlueprint("token-board", tokenAnswers, null);
    const parsed = TherapyBlueprintSchema.safeParse(result.blueprint);
    expect(parsed.success).toBe(true);
    expect(result.blueprint.ageRange).toBe("school-age");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/lib/interview/__tests__/blueprint-assembler.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the assembler**

Create `src/features/builder/lib/interview/blueprint-assembler.ts`:
- `assembleBlueprint(categoryId: string, answers: Record<string, string | string[]>, llmDraft: Partial<TherapyBlueprint> | null): { blueprint: TherapyBlueprint; richPrompt: string }`
- Merge order (lowest to highest precedence): category `defaults` → `llmDraft` → mapped user `answers`
- Map answer keys to blueprint fields: `age_range` → `ageRange`, `interaction_style` → `interactionModel`, `reinforcement` → `reinforcementStrategy.type`, `accessibility` → `accessibilityNotes`, `color_preference` → `colorPalette`
- Fill remaining required fields with sensible defaults (e.g., `frameworks: ["motion"]`, `pitfalls: []`, `implementationRoadmap: [{ phase: "Build", description: "Generate app" }]`, `initialPhase` with empty structure)
- Call `category.promptTemplate(answers)` to produce `richPrompt`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/lib/interview/__tests__/blueprint-assembler.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/lib/interview/blueprint-assembler.ts src/features/builder/lib/interview/__tests__/blueprint-assembler.test.ts
git commit -m "feat(interview): add blueprint assembler with tests"
```

---

## Task 5: useInterview Hook

**Files:**
- Create: `src/features/builder/hooks/use-interview.ts`
- Test: `src/features/builder/hooks/__tests__/use-interview.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/builder/hooks/__tests__/use-interview.test.ts
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useInterview } from "../use-interview";

describe("useInterview", () => {
  it("initializes in category_select phase", () => {
    const { result } = renderHook(() => useInterview());
    expect(result.current.state.phase).toBe("category_select");
  });

  it("selectCategory transitions to essential", () => {
    const { result } = renderHook(() => useInterview());
    act(() => result.current.selectCategory("communication-board"));
    expect(result.current.state.phase).toBe("essential");
    expect(result.current.state.category).toBe("communication-board");
  });

  it("answer stores value and advances", () => {
    const { result } = renderHook(() => useInterview());
    act(() => result.current.selectCategory("communication-board"));
    act(() => result.current.answer("age_range", "preschool"));
    expect(result.current.state.answers["age_range"]).toBe("preschool");
    expect(result.current.state.currentQuestionIndex).toBe(1);
  });

  it("reset returns to initial state", () => {
    const { result } = renderHook(() => useInterview());
    act(() => result.current.selectCategory("communication-board"));
    act(() => result.current.reset());
    expect(result.current.state.phase).toBe("category_select");
  });

  it("addFreeform appends note", () => {
    const { result } = renderHook(() => useInterview());
    act(() => result.current.addFreeform("dinosaur themed"));
    expect(result.current.state.freeformNotes).toContain("dinosaur themed");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/hooks/__tests__/use-interview.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the hook**

```typescript
// src/features/builder/hooks/use-interview.ts
"use client";

import { useCallback, useReducer } from "react";

import type { TherapyBlueprint } from "../lib/schemas";
import {
  createInitialState,
  type InterviewAction,
  interviewReducer,
} from "../lib/interview/interview-state";
import type { InterviewQuestion } from "../lib/interview/types";

export function useInterview() {
  const [state, dispatch] = useReducer(interviewReducer, undefined, createInitialState);

  const selectCategory = useCallback((categoryId: string) => {
    dispatch({ type: "SELECT_CATEGORY", categoryId });
  }, []);

  const answer = useCallback((questionId: string, value: string | string[]) => {
    dispatch({ type: "ANSWER", questionId, value });
  }, []);

  const showGate = useCallback(() => {
    dispatch({ type: "SHOW_GATE" });
  }, []);

  const chooseCustomize = useCallback(() => {
    dispatch({ type: "CHOOSE_CUSTOMIZE" });
  }, []);

  const chooseSkip = useCallback(() => {
    dispatch({ type: "CHOOSE_SKIP" });
  }, []);

  const setFollowUps = useCallback(
    (followUpQuestions: InterviewQuestion[], draftBlueprint: TherapyBlueprint) => {
      dispatch({ type: "SET_FOLLOWUPS", followUpQuestions, draftBlueprint });
    },
    [],
  );

  const showReview = useCallback(
    (blueprint: TherapyBlueprint, richPrompt: string) => {
      dispatch({ type: "SHOW_REVIEW", blueprint, richPrompt });
    },
    [],
  );

  const addFreeform = useCallback((note: string) => {
    dispatch({ type: "ADD_FREEFORM", note });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const reEnter = useCallback(() => {
    dispatch({ type: "RE_ENTER" });
  }, []);

  return {
    state,
    selectCategory,
    answer,
    showGate,
    chooseCustomize,
    chooseSkip,
    setFollowUps,
    showReview,
    addFreeform,
    reset,
    reEnter,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/hooks/__tests__/use-interview.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/hooks/use-interview.ts src/features/builder/hooks/__tests__/use-interview.test.ts
git commit -m "feat(interview): add useInterview hook with tests"
```

---

## Task 6: CategoryPicker Component

**Files:**
- Create: `src/features/builder/components/interview/category-picker.tsx`
- Test: `src/features/builder/components/interview/__tests__/category-picker.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/builder/components/interview/__tests__/category-picker.test.tsx
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CategoryPicker } from "../category-picker";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

describe("CategoryPicker", () => {
  it("renders top 5 category cards", () => {
    const { getByText } = render(<CategoryPicker onSelect={vi.fn()} onEscapeHatch={vi.fn()} />);
    expect(getByText("Communication Board")).toBeInTheDocument();
    expect(getByText("Visual Schedule")).toBeInTheDocument();
    expect(getByText("Token/Reward Board")).toBeInTheDocument();
    expect(getByText("Social Story")).toBeInTheDocument();
    expect(getByText("Feelings Check-In")).toBeInTheDocument();
  });

  it("does not show 'More options' categories by default", () => {
    const { queryByText } = render(<CategoryPicker onSelect={vi.fn()} onEscapeHatch={vi.fn()} />);
    expect(queryByText("Flashcards")).not.toBeInTheDocument();
  });

  it("shows expanded categories after clicking 'More options'", () => {
    const { getByText } = render(<CategoryPicker onSelect={vi.fn()} onEscapeHatch={vi.fn()} />);
    fireEvent.click(getByText(/More options/i));
    expect(getByText(/Flashcards/)).toBeInTheDocument();
    expect(getByText(/Timer/)).toBeInTheDocument();
  });

  it("calls onSelect when a card is clicked", () => {
    const onSelect = vi.fn();
    const { getByText } = render(<CategoryPicker onSelect={onSelect} onEscapeHatch={vi.fn()} />);
    fireEvent.click(getByText("Communication Board"));
    expect(onSelect).toHaveBeenCalledWith("communication-board");
  });

  it("renders escape hatch link", () => {
    const onEscapeHatch = vi.fn();
    const { getByText } = render(<CategoryPicker onSelect={vi.fn()} onEscapeHatch={onEscapeHatch} />);
    fireEvent.click(getByText(/describe what you want/i));
    expect(onEscapeHatch).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/components/interview/__tests__/category-picker.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement CategoryPicker**

Create `src/features/builder/components/interview/category-picker.tsx`:
- Import `CATEGORIES` from `../../lib/interview/categories`
- Import `MaterialIcon` from `@/shared/components/material-icon`
- Render top 5 categories as visual cards: 2-column grid on desktop, 1-column on mobile
- Each card shows icon (in a colored circle), label, and description
- "More options" button toggles visibility of remaining 5 categories (rendered as smaller chips)
- Escape hatch: muted text link "Or just describe what you want" calls `onEscapeHatch`
- Props: `onSelect: (categoryId: string) => void`, `onEscapeHatch: () => void`
- Use Tailwind classes matching the existing design system: `bg-surface-container-lowest`, `rounded-2xl`, `font-headline`, gradient accents

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/components/interview/__tests__/category-picker.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/components/interview/category-picker.tsx src/features/builder/components/interview/__tests__/category-picker.test.tsx
git commit -m "feat(interview): add CategoryPicker component with tests"
```

---

## Task 7: InterviewQuestion Component

**Files:**
- Create: `src/features/builder/components/interview/interview-question.tsx`
- Test: `src/features/builder/components/interview/__tests__/interview-question.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/builder/components/interview/__tests__/interview-question.test.tsx
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { InterviewQuestion as IQ } from "../../../lib/interview/types";
import { InterviewQuestion } from "../interview-question";

describe("InterviewQuestion", () => {
  const chipsQuestion: IQ = {
    id: "age_range",
    text: "Who will use this app?",
    type: "chips",
    options: [
      { label: "Toddler (1-3)", value: "toddler" },
      { label: "Preschool (3-5)", value: "preschool" },
    ],
    required: true,
    phase: "essential",
  };

  const textQuestion: IQ = {
    id: "custom_words",
    text: "Type your custom words",
    type: "text",
    required: true,
    phase: "essential",
  };

  it("renders the question text", () => {
    const { getByText } = render(
      <InterviewQuestion question={chipsQuestion} onAnswer={vi.fn()} />,
    );
    expect(getByText("Who will use this app?")).toBeInTheDocument();
  });

  it("renders chip options with labels", () => {
    const { getByText } = render(
      <InterviewQuestion question={chipsQuestion} onAnswer={vi.fn()} />,
    );
    expect(getByText("Toddler (1-3)")).toBeInTheDocument();
    expect(getByText("Preschool (3-5)")).toBeInTheDocument();
  });

  it("calls onAnswer with value (not label) when chip clicked", () => {
    const onAnswer = vi.fn();
    const { getByText } = render(
      <InterviewQuestion question={chipsQuestion} onAnswer={onAnswer} />,
    );
    fireEvent.click(getByText("Preschool (3-5)"));
    expect(onAnswer).toHaveBeenCalledWith("age_range", "preschool");
  });

  it("renders text input for text type questions", () => {
    const { getByRole } = render(
      <InterviewQuestion question={textQuestion} onAnswer={vi.fn()} />,
    );
    expect(getByRole("textbox")).toBeInTheDocument();
  });

  it("submits text input on Enter", () => {
    const onAnswer = vi.fn();
    const { getByRole } = render(
      <InterviewQuestion question={textQuestion} onAnswer={onAnswer} />,
    );
    const input = getByRole("textbox");
    fireEvent.change(input, { target: { value: "hello, help, more" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAnswer).toHaveBeenCalledWith("custom_words", "hello, help, more");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/components/interview/__tests__/interview-question.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement InterviewQuestion**

Create `src/features/builder/components/interview/interview-question.tsx`:
- Renders as an assistant-style chat bubble (same `bg-surface-container rounded-2xl` styling as `AssistantBubble` in `chat-panel.tsx`)
- Question text shown in the bubble
- Below the bubble: interactive answer UI based on `question.type`:
  - `"chips"` — row of clickable chip buttons, each showing `option.label`, emitting `onAnswer(question.id, option.value)`
  - `"select"` — shadcn `Select` component with `SelectItem` per option
  - `"text"` — `Input` with submit on Enter key
- Props: `question: InterviewQuestion`, `onAnswer: (questionId: string, value: string | string[]) => void`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/components/interview/__tests__/interview-question.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/components/interview/interview-question.tsx src/features/builder/components/interview/__tests__/interview-question.test.tsx
git commit -m "feat(interview): add InterviewQuestion component with tests"
```

---

## Task 8: BlueprintApprovalCard Component

**Files:**
- Create: `src/features/builder/components/interview/blueprint-approval-card.tsx`
- Test: `src/features/builder/components/interview/__tests__/blueprint-approval-card.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/builder/components/interview/__tests__/blueprint-approval-card.test.tsx
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BlueprintApprovalCard } from "../blueprint-approval-card";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

const blueprint = {
  title: "My Board",
  therapyGoal: "Communication",
  targetSkill: "Core word usage",
  ageRange: "preschool",
  interactionModel: "tap",
  description: "A communication board",
  projectName: "my-board",
  detailedDescription: "Detailed",
  reinforcementStrategy: { type: "tokens", description: "Stars" },
  dataTracking: [],
  accessibilityNotes: [],
  colorPalette: ["#00595c"],
  views: [{ name: "Main", description: "Main view" }],
  userFlow: { uiLayout: "Grid", uiDesign: "Cards", userJourney: "Tap words" },
  frameworks: ["motion"],
  pitfalls: [],
  implementationRoadmap: [{ phase: "Build", description: "Generate" }],
  initialPhase: { name: "Build", description: "Generate", files: [], installCommands: [], lastPhase: true },
} as any;

describe("BlueprintApprovalCard", () => {
  it("renders the blueprint title", () => {
    const { getByText } = render(
      <BlueprintApprovalCard blueprint={blueprint} onApprove={vi.fn()} onEdit={vi.fn()} />,
    );
    expect(getByText("My Board")).toBeInTheDocument();
  });

  it("renders Build this! button", () => {
    const { getByText } = render(
      <BlueprintApprovalCard blueprint={blueprint} onApprove={vi.fn()} onEdit={vi.fn()} />,
    );
    expect(getByText("Build this!")).toBeInTheDocument();
  });

  it("calls onApprove when Build this! clicked", () => {
    const onApprove = vi.fn();
    const { getByText } = render(
      <BlueprintApprovalCard blueprint={blueprint} onApprove={onApprove} onEdit={vi.fn()} />,
    );
    fireEvent.click(getByText("Build this!"));
    expect(onApprove).toHaveBeenCalled();
  });

  it("calls onEdit when Change something clicked", () => {
    const onEdit = vi.fn();
    const { getByText } = render(
      <BlueprintApprovalCard blueprint={blueprint} onApprove={vi.fn()} onEdit={onEdit} />,
    );
    fireEvent.click(getByText("Change something"));
    expect(onEdit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/components/interview/__tests__/blueprint-approval-card.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement BlueprintApprovalCard**

```typescript
// src/features/builder/components/interview/blueprint-approval-card.tsx
"use client";

import { Button } from "@/shared/components/ui/button";

import type { TherapyBlueprint } from "../../lib/schemas";
import { BlueprintCard } from "../blueprint-card";

interface BlueprintApprovalCardProps {
  blueprint: TherapyBlueprint;
  onApprove: () => void;
  onEdit: () => void;
}

export function BlueprintApprovalCard({ blueprint, onApprove, onEdit }: BlueprintApprovalCardProps) {
  return (
    <div className="space-y-3">
      <BlueprintCard blueprint={blueprint} />
      <div className="flex items-center gap-3">
        <Button
          onClick={onApprove}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold rounded-xl px-6 shadow-md hover:shadow-lg"
        >
          Build this!
        </Button>
        <Button variant="ghost" onClick={onEdit}>
          Change something
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/components/interview/__tests__/blueprint-approval-card.test.tsx`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/components/interview/blueprint-approval-card.tsx src/features/builder/components/interview/__tests__/blueprint-approval-card.test.tsx
git commit -m "feat(interview): add BlueprintApprovalCard component with tests"
```

---

## Task 9: Interview Follow-Up API Endpoint

**Files:**
- Create: `src/app/api/interview-followup/route.ts`

- [ ] **Step 1: Implement the endpoint**

Create `src/app/api/interview-followup/route.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { TherapyBlueprintSchema } from "@/features/builder/lib/schemas";
import { getCategoryById } from "@/features/builder/lib/interview/categories";

export const runtime = "nodejs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const RequestSchema = z.object({
  category: z.string(),
  answers: z.record(z.union([z.string(), z.array(z.string())])),
  freeformNotes: z.array(z.string()).optional(),
});

const FollowUpToolSchema = {
  name: "provide_followups" as const,
  description: "Return follow-up questions and a draft blueprint based on the user's interview answers.",
  input_schema: {
    type: "object" as const,
    properties: {
      followUps: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            id: { type: "string" as const },
            text: { type: "string" as const },
            type: { type: "string" as const, enum: ["chips", "select", "text"] },
            options: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  label: { type: "string" as const },
                  value: { type: "string" as const },
                },
                required: ["label", "value"],
              },
            },
          },
          required: ["id", "text", "type"],
        },
        maxItems: 2,
      },
      blueprint: {
        type: "object" as const,
        description: "A complete TherapyBlueprint conforming to the schema",
      },
    },
    required: ["followUps", "blueprint"],
  },
};

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const category = getCategoryById(parsed.data.category);
  if (!category) {
    return Response.json({ error: "Unknown category" }, { status: 400 });
  }

  const freeformContext = parsed.data.freeformNotes?.length
    ? `\n\nUser's additional notes: ${parsed.data.freeformNotes.join(". ")}`
    : "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      tools: [FollowUpToolSchema],
      tool_choice: { type: "tool", name: "provide_followups" },
      messages: [
        {
          role: "user",
          content: `Category: ${category.label}\nAnswers: ${JSON.stringify(parsed.data.answers)}${freeformContext}\n\nProvide 1-2 smart follow-up questions and a complete draft TherapyBlueprint.`,
        },
      ],
      system: `You are a therapy app design expert. Given interview answers about a ${category.label}, return 1-2 follow-up questions that would meaningfully improve the app, and a complete TherapyBlueprint. Each follow-up question must use {label, value} option pairs. The blueprint must include: title, projectName, description, detailedDescription, therapyGoal, targetSkill, ageRange (toddler|preschool|school-age|adolescent|adult|all), interactionModel (tap|drag|sequence|match|timer|free-form), reinforcementStrategy ({type, description}), dataTracking, accessibilityNotes, colorPalette, views, userFlow, frameworks, pitfalls, implementationRoadmap, initialPhase.`,
    }, { signal: controller.signal });

    clearTimeout(timeout);

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      return Response.json({ followUps: [], blueprint: null });
    }

    const input = toolBlock.input as { followUps: unknown[]; blueprint: unknown };
    return Response.json({
      followUps: input.followUps ?? [],
      blueprint: input.blueprint ?? null,
    });
  } catch {
    // Timeout or API error — caller will skip follow-ups gracefully
    return Response.json({ followUps: [], blueprint: null });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/interview-followup/route.ts
git commit -m "feat(interview): add interview-followup API endpoint (Haiku)"
```

---

## Task 10: InterviewController Component

**Files:**
- Create: `src/features/builder/components/interview/interview-controller.tsx`
- Test: `src/features/builder/components/interview/__tests__/interview-controller.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/builder/components/interview/__tests__/interview-controller.test.tsx
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { InterviewController } from "../interview-controller";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

// Mock fetch for the follow-up endpoint
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("InterviewController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: follow-up endpoint returns empty
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ followUps: [], blueprint: null }),
    });
  });

  it("renders CategoryPicker initially", () => {
    const { getByText } = render(
      <InterviewController onGenerate={vi.fn()} />,
    );
    expect(getByText("Communication Board")).toBeInTheDocument();
  });

  it("shows first question after selecting a category", () => {
    const { getByText } = render(
      <InterviewController onGenerate={vi.fn()} />,
    );
    fireEvent.click(getByText("Communication Board"));
    // First essential question for communication-board
    expect(getByText("Who will use this app?")).toBeInTheDocument();
  });

  it("shows gate after answering all essential questions", async () => {
    const { getByText } = render(
      <InterviewController onGenerate={vi.fn()} />,
    );
    fireEvent.click(getByText("Communication Board"));
    // Answer all 3 essential questions
    fireEvent.click(getByText("Preschool (3-5)"));
    fireEvent.click(getByText("9 (standard)"));
    fireEvent.click(getByText(/Core words/));
    await waitFor(() => {
      expect(getByText(/customize further/i)).toBeInTheDocument();
    });
  });

  it("calls onGenerate with prompt and blueprint when Build this! clicked", async () => {
    const onGenerate = vi.fn();
    const { getByText } = render(
      <InterviewController onGenerate={onGenerate} />,
    );
    // Walk through the flow
    fireEvent.click(getByText("Communication Board"));
    fireEvent.click(getByText("Preschool (3-5)"));
    fireEvent.click(getByText("9 (standard)"));
    fireEvent.click(getByText(/Core words/));
    await waitFor(() => getByText(/Show me the plan/i));
    fireEvent.click(getByText(/Show me the plan/i));
    // Wait for follow-up call + blueprint assembly + review
    await waitFor(() => getByText("Build this!"), { timeout: 3000 });
    fireEvent.click(getByText("Build this!"));
    expect(onGenerate).toHaveBeenCalledWith(
      expect.any(String),       // rich prompt
      expect.objectContaining({ title: expect.any(String) }), // blueprint
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/components/interview/__tests__/interview-controller.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement InterviewController**

Create `src/features/builder/components/interview/interview-controller.tsx`:
- Uses `useInterview()` hook for state management
- Renders different UI based on `state.phase`:
  - `category_select` → `<CategoryPicker onSelect={selectCategory} onEscapeHatch={props.onEscapeHatch} />`
  - `essential` / `extended` → `<InterviewQuestion>` for the current question (index from state). When the user answers the last essential question, auto-dispatch `showGate()`. When they answer the last extended question, auto-dispatch `chooseSkip()` (to trigger follow-up).
  - `gate` → Two buttons: "Show me the plan" (`chooseSkip()`) and "Customize more" (`chooseCustomize()`)
  - `followup` → Calls `fetch("/api/interview-followup", ...)` with category + answers + freeformNotes. On response, calls `setFollowUps()`. If follow-ups exist, shows them as `InterviewQuestion` components. When all answered (or skipped), assembles blueprint via `assembleBlueprint()` and calls `showReview()`. On error, shows toast and skips to assembly.
  - `review` → `<BlueprintApprovalCard blueprint={state.draftBlueprint!} onApprove={handleApprove} onEdit={reEnter} />`
- `handleApprove()` calls `props.onGenerate(state.richPrompt!, state.draftBlueprint!)` — the blueprint is passed directly through `onGenerate` (NOT via a separate `onBlueprintReady` callback) to avoid React async state race conditions
- Shows answered questions as locked-in user message bubbles (scrolling history)
- Props: `onGenerate: (prompt: string, blueprint: TherapyBlueprint) => void`, `onEscapeHatch?: () => void`
- Import `toast` from `sonner` for error handling

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/components/interview/__tests__/interview-controller.test.tsx`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/components/interview/interview-controller.tsx src/features/builder/components/interview/__tests__/interview-controller.test.tsx
git commit -m "feat(interview): add InterviewController with full flow + tests"
```

---

## Task 11: Modify Generate Schema + Streaming Hook

**Files:**
- Modify: `src/features/builder/lib/schemas/generate.ts`
- Modify: `src/features/builder/hooks/use-streaming.ts:329-352`

- [ ] **Step 1: Add blueprint field to GenerateInputSchema**

In `src/features/builder/lib/schemas/generate.ts`, add `blueprint: z.any().optional()` to the schema object:

```typescript
// Change this:
export const GenerateInputSchema = z.object({
  query: z.string().min(1, "Prompt is required").max(10_000, "Prompt too long (max 10,000 characters)").optional(),
  prompt: z.string().min(1).max(10_000).optional(),
  sessionId: z.string().optional(),
  mode: z.enum(["builder", "flashcards"]).default("builder"),
}).refine(

// To this:
export const GenerateInputSchema = z.object({
  query: z.string().min(1, "Prompt is required").max(10_000, "Prompt too long (max 10,000 characters)").optional(),
  prompt: z.string().min(1).max(10_000).optional(),
  sessionId: z.string().optional(),
  mode: z.enum(["builder", "flashcards"]).default("builder"),
  blueprint: z.any().optional(),
}).refine(
```

- [ ] **Step 2: Update generate() in use-streaming.ts to accept optional blueprint**

In `src/features/builder/hooks/use-streaming.ts`:

Change the `generate` signature and `UseStreamingReturn` type (line 36):
```typescript
// UseStreamingReturn.generate changes from:
generate: (prompt: string) => Promise<void>;
// to:
generate: (prompt: string, blueprint?: TherapyBlueprint) => Promise<void>;
```

Change the `generate` callback (line 329-352):
```typescript
// Change from:
const generate = useCallback(
  async (prompt: string): Promise<void> => {
// To:
const generate = useCallback(
  async (prompt: string, blueprint?: TherapyBlueprint): Promise<void> => {
```

Change the fetch body (line 348-351):
```typescript
// Change from:
body: JSON.stringify({
  prompt,
  sessionId: sessionIdRef.current ?? undefined,
}),
// To:
body: JSON.stringify({
  prompt,
  sessionId: sessionIdRef.current ?? undefined,
  ...(blueprint ? { blueprint } : {}),
}),
```

Note: `TherapyBlueprint` is already imported at line 7 of `use-streaming.ts`.

- [ ] **Step 3: Run existing use-streaming tests to verify no regressions**

Run: `npx vitest run src/features/builder/hooks/__tests__/use-streaming.test.ts`
Expected: All existing tests PASS (blueprint param is optional, so no breaking change)

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/lib/schemas/generate.ts src/features/builder/hooks/use-streaming.ts
git commit -m "feat(interview): add blueprint field to generate schema + streaming hook"
```

---

## Task 12: Modify Generate Route to Use Blueprint

**Files:**
- Modify: `src/app/api/generate/route.ts:86,155`

- [ ] **Step 1: Prepend blueprint context to user message**

In `src/app/api/generate/route.ts`:

After line 86 (`const query = parsed.data.query ?? parsed.data.prompt!;`), add blueprint extraction:
```typescript
const query = parsed.data.query ?? parsed.data.prompt!;
const blueprintData = parsed.data.blueprint;
```

At line 155 (the `messages` array in `anthropic.beta.messages.toolRunner`), prepend the blueprint if present:
```typescript
// Change from:
messages: [{ role: "user", content: query }],
// To:
messages: [{ role: "user", content: blueprintData
  ? `## Pre-Approved Blueprint\n\n${JSON.stringify(blueprintData, null, 2)}\n\n## User Request\n\n${query}`
  : query }],
```

- [ ] **Step 2: Run full test suite to check for regressions**

Run: `npx vitest run`
Expected: All existing tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat(interview): prepend blueprint context in generate route"
```

---

## Task 13: Integrate Interview into Builder Page

**Files:**
- Modify: `src/features/builder/components/builder-page.tsx:155-211`

- [ ] **Step 1: Add interview state and imports**

At the top of `builder-page.tsx`, add imports:
```typescript
import { InterviewController } from "./interview/interview-controller";
import type { TherapyBlueprint } from "../lib/schemas";
```

Add an `onEscapeHatch` ref to focus the prompt input:
```typescript
const promptInputRef = useRef<HTMLInputElement>(null);
const [showFreeformInput, setShowFreeformInput] = useState(false);
```

- [ ] **Step 2: Update handleGenerate to pass blueprint**

```typescript
// Change from:
const handleGenerate = useCallback((prompt: string) => {
  lastPromptRef.current = prompt;
  setPendingPrompt(prompt);
  generate(prompt);
}, [generate]);

// To:
const handleGenerate = useCallback((prompt: string, blueprint?: TherapyBlueprint) => {
  lastPromptRef.current = prompt;
  setPendingPrompt(prompt);
  generate(prompt, blueprint);
}, [generate]);
```

- [ ] **Step 3: Replace showPromptScreen content**

Replace the `showPromptScreen` branch (lines 159-211) with:

```tsx
{showPromptScreen ? (
  <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
    <div className="text-center">
      <h1 className="font-headline text-3xl font-semibold text-foreground">
        What would you like to build?
      </h1>
      <p className="mt-2 text-base text-on-surface-variant">
        Choose a category or describe what you need.
      </p>
    </div>

    {showFreeformInput ? (
      /* Escape hatch: free-form input */
      <>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!promptInput.trim()) return;
            handleGenerate(promptInput.trim());
            setPromptInput("");
          }}
          className="w-full max-w-2xl"
        >
          <div className="flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/30">
            <Input
              ref={promptInputRef}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Describe the therapy tool you want to build…"
              className="flex-1 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
              aria-label="Describe the therapy tool you want to build"
            />
            <Button
              type="submit"
              disabled={!promptInput.trim()}
              size="icon"
              className="shrink-0 rounded-full"
              aria-label="Generate app"
            >
              <MaterialIcon icon="auto_fix_high" size="xs" />
            </Button>
          </div>
        </form>
        <SuggestionChips
          suggestions={THERAPY_SUGGESTIONS}
          onSelect={(suggestion) => handleGenerate(suggestion)}
        />
        <button
          type="button"
          onClick={() => setShowFreeformInput(false)}
          className="text-sm text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
        >
          ← Back to categories
        </button>
      </>
    ) : (
      /* Guided interview flow */
      <div className="w-full max-w-2xl">
        <InterviewController
          onGenerate={(prompt, blueprint) => handleGenerate(prompt, blueprint)}
          onEscapeHatch={() => {
            setShowFreeformInput(true);
            setTimeout(() => promptInputRef.current?.focus(), 100);
          }}
        />
      </div>
    )}

    {mostRecent && !continueDismissed && (
      <ContinueCard
        sessionId={mostRecent._id}
        title={mostRecent.title}
        onDismiss={() => setContinueDismissed(true)}
      />
    )}
  </div>
) : (
```

- [ ] **Step 4: Run the builder-page tests to check for regressions**

Run: `npx vitest run src/features/builder/components/__tests__/builder-page.test.tsx`
Expected: Existing tests may need minor updates (the prompt screen content changed). Fix any failures.

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/builder/components/builder-page.tsx
git commit -m "feat(interview): integrate interview flow into builder prompt screen"
```

---

## Task 14: Manual Smoke Test

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Navigate to /builder**

Verify:
- CategoryPicker renders with 5 visual cards
- "More options" expands to show 5 more
- "Or just describe what you want" link switches to free-form input

- [ ] **Step 3: Walk through the interview**

1. Click "Communication Board"
2. Answer "Preschool (3-5)" → "9 (standard)" → "Core words"
3. Verify gate appears: "Want to customize further?"
4. Click "Show me the plan"
5. Verify BlueprintApprovalCard appears with assembled blueprint
6. Click "Build this!"
7. Verify generation starts (status changes to "generating")

- [ ] **Step 4: Test "Change something" flow**

1. Repeat steps 1-5
2. Click "Change something" instead
3. Verify gate re-appears with answers preserved
4. Click "Show me the plan" again
5. Verify new BlueprintApprovalCard appears

- [ ] **Step 5: Test escape hatch**

1. Start fresh at /builder
2. Click "Or just describe what you want"
3. Verify free-form input appears
4. Type a prompt and submit
5. Verify generation starts

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(interview): smoke test fixes"
```

---

## Task 15: Final Test Run

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS, including all new interview tests

- [ ] **Step 2: Run build to verify no TypeScript errors**

Run: `npm run build`
Expected: Build succeeds with no errors
