import { describe, expect, it } from "vitest";

import { createInitialState, interviewReducer } from "../interview-state";
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
    const next = interviewReducer(state, { type: "SELECT_CATEGORY", categoryId: "communication-board" });
    expect(next.phase).toBe("essential");
    expect(next.category).toBe("communication-board");
    expect(next.currentQuestionIndex).toBe(0);
  });

  it("ANSWER stores the answer and advances question index", () => {
    const state = { ...createInitialState(), phase: "essential" as const, category: "communication-board", currentQuestionIndex: 0 };
    const next = interviewReducer(state, { type: "ANSWER", questionId: "age_range", value: "preschool" });
    expect(next.answers["age_range"]).toBe("preschool");
    expect(next.currentQuestionIndex).toBe(1);
  });

  it("SHOW_GATE transitions to gate phase", () => {
    const state = { ...createInitialState(), phase: "essential" as const, category: "communication-board" };
    const next = interviewReducer(state, { type: "SHOW_GATE" });
    expect(next.phase).toBe("gate");
  });

  it("CHOOSE_CUSTOMIZE transitions to extended phase", () => {
    const state = { ...createInitialState(), phase: "gate" as const, category: "communication-board" };
    const next = interviewReducer(state, { type: "CHOOSE_CUSTOMIZE" });
    expect(next.phase).toBe("extended");
    expect(next.currentQuestionIndex).toBe(0);
  });

  it("CHOOSE_SKIP transitions to followup phase", () => {
    const state = { ...createInitialState(), phase: "gate" as const, category: "communication-board" };
    const next = interviewReducer(state, { type: "CHOOSE_SKIP" });
    expect(next.phase).toBe("followup");
  });

  it("SET_FOLLOWUPS stores follow-up questions and draft blueprint", () => {
    const state = { ...createInitialState(), phase: "followup" as const, category: "communication-board" };
    const followUps: InterviewQuestion[] = [
      { id: "color_coding", text: "Use Fitzgerald Key?", type: "chips", options: [{ label: "Yes", value: "yes" }], required: false, phase: "extended" },
    ];
    const draftBlueprint = { title: "My Board" } as any;
    const next = interviewReducer(state, { type: "SET_FOLLOWUPS", followUpQuestions: followUps, draftBlueprint });
    expect(next.followUpQuestions).toHaveLength(1);
    expect(next.draftBlueprint?.title).toBe("My Board");
  });

  it("SHOW_REVIEW transitions to review phase", () => {
    const state = { ...createInitialState(), phase: "followup" as const };
    const next = interviewReducer(state, { type: "SHOW_REVIEW", blueprint: { title: "Final" } as any, richPrompt: "Build a board" });
    expect(next.phase).toBe("review");
    expect(next.draftBlueprint?.title).toBe("Final");
    expect(next.richPrompt).toBe("Build a board");
  });

  it("ADD_FREEFORM appends to freeformNotes", () => {
    const state = createInitialState();
    const next = interviewReducer(state, { type: "ADD_FREEFORM", note: "my kid loves dinosaurs" });
    expect(next.freeformNotes).toContain("my kid loves dinosaurs");
  });

  it("RESET returns to initial state", () => {
    const state = { ...createInitialState(), phase: "review" as const, category: "communication-board", answers: { age_range: "preschool" } };
    const next = interviewReducer(state, { type: "RESET" });
    expect(next.phase).toBe("category_select");
    expect(next.category).toBeNull();
    expect(next.answers).toEqual({});
  });

  it("RE_ENTER preserves answers and returns to gate", () => {
    const state = { ...createInitialState(), phase: "review" as const, category: "communication-board", answers: { age_range: "preschool", word_count: "9" } };
    const next = interviewReducer(state, { type: "RE_ENTER" });
    expect(next.phase).toBe("gate");
    expect(next.answers).toEqual({ age_range: "preschool", word_count: "9" });
    expect(next.draftBlueprint).toBeNull();
    expect(next.richPrompt).toBeNull();
  });
});
