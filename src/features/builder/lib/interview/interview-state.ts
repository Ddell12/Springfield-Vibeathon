import type { TherapyBlueprint } from "../schemas";
import type { InterviewQuestion, InterviewState } from "./types";

export type InterviewAction =
  | { type: "SELECT_CATEGORY"; categoryId: string }
  | { type: "ANSWER"; questionId: string; value: string | string[] }
  | { type: "SHOW_GATE" }
  | { type: "CHOOSE_CUSTOMIZE" }
  | { type: "CHOOSE_SKIP" }
  | { type: "SET_FOLLOWUPS"; followUpQuestions: InterviewQuestion[]; draftBlueprint: TherapyBlueprint | null }
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

export function interviewReducer(state: InterviewState, action: InterviewAction): InterviewState {
  switch (action.type) {
    case "SELECT_CATEGORY":
      return { ...state, phase: "essential", category: action.categoryId, currentQuestionIndex: 0, answers: {}, freeformNotes: [] };
    case "ANSWER":
      return { ...state, answers: { ...state.answers, [action.questionId]: action.value }, currentQuestionIndex: state.currentQuestionIndex + 1 };
    case "SHOW_GATE":
      return { ...state, phase: "gate" };
    case "CHOOSE_CUSTOMIZE":
      return { ...state, phase: "extended", currentQuestionIndex: 0 };
    case "CHOOSE_SKIP":
      return { ...state, phase: "followup" };
    case "SET_FOLLOWUPS":
      return { ...state, followUpQuestions: action.followUpQuestions, draftBlueprint: action.draftBlueprint, currentQuestionIndex: 0 };
    case "SHOW_REVIEW":
      return { ...state, phase: "review", draftBlueprint: action.blueprint, richPrompt: action.richPrompt };
    case "ADD_FREEFORM":
      return { ...state, freeformNotes: [...state.freeformNotes, action.note] };
    case "RESET":
      return createInitialState();
    case "RE_ENTER":
      return { ...state, phase: "gate", currentQuestionIndex: 0, draftBlueprint: null, followUpQuestions: [], richPrompt: null };
    default:
      return state;
  }
}
