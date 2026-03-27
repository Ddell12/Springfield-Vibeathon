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
