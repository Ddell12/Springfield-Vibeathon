import type { ComponentType } from "react";

import { AACBoardEditor } from "./templates/aac-board/editor";
import { AACBoardRuntime } from "./templates/aac-board/runtime";
import { AACBoardConfigSchema, type AACBoardConfig } from "./templates/aac-board/schema";

import { FirstThenBoardEditor } from "./templates/first-then-board/editor";
import { FirstThenBoardRuntime } from "./templates/first-then-board/runtime";
import { FirstThenBoardConfigSchema, type FirstThenBoardConfig } from "./templates/first-then-board/schema";

import { TokenBoardEditor } from "./templates/token-board/editor";
import { TokenBoardRuntime } from "./templates/token-board/runtime";
import { TokenBoardConfigSchema, type TokenBoardConfig } from "./templates/token-board/schema";

import { VisualScheduleEditor } from "./templates/visual-schedule/editor";
import { VisualScheduleRuntime } from "./templates/visual-schedule/runtime";
import { VisualScheduleConfigSchema, type VisualScheduleConfig } from "./templates/visual-schedule/schema";

import { MatchingGameEditor } from "./templates/matching-game/editor";
import { MatchingGameRuntime } from "./templates/matching-game/runtime";
import { MatchingGameConfigSchema, type MatchingGameConfig } from "./templates/matching-game/schema";

export interface RuntimeProps<TConfig = unknown> {
  config: TConfig;
  shareToken: string;
  onEvent: (type: string, payloadJson?: string) => void;
}

export interface EditorProps<TConfig = unknown> {
  config: TConfig;
  onChange: (config: TConfig) => void;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  intendedFor: string;
  estimatedSetupMinutes: number;
}

export interface TemplateRegistration {
  meta: TemplateMeta;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Editor: ComponentType<EditorProps<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Runtime: ComponentType<RuntimeProps<any>>;
  defaultConfig: unknown;
  parseConfig: (json: string) => unknown;
}

const DEFAULT_AAC_CONFIG: AACBoardConfig = {
  title: "New Communication Board",
  gridCols: 3,
  gridRows: 2,
  buttons: [
    { id: "1", label: "Yes", speakText: "Yes" },
    { id: "2", label: "No", speakText: "No" },
    { id: "3", label: "Help", speakText: "I need help" },
    { id: "4", label: "More", speakText: "More please" },
    { id: "5", label: "Done", speakText: "I am done" },
    { id: "6", label: "Break", speakText: "I need a break" },
  ],
  showTextLabels: true,
  autoSpeak: true,
  voice: "child-friendly",
  highContrast: false,
};

const DEFAULT_FIRST_THEN_CONFIG: FirstThenBoardConfig = {
  title: "First / Then",
  firstLabel: "Clean up",
  thenLabel: "Free time",
  firstColor: "#3B82F6",
  thenColor: "#10B981",
  highContrast: false,
  showCheckmark: true,
};

const DEFAULT_TOKEN_BOARD_CONFIG: TokenBoardConfig = {
  title: "Token Board",
  tokenCount: 5,
  rewardLabel: "5 minutes of free choice",
  tokenShape: "star",
  tokenColor: "#FBBF24",
  highContrast: false,
};

const DEFAULT_VISUAL_SCHEDULE_CONFIG: VisualScheduleConfig = {
  title: "Morning Routine",
  items: [
    { id: "1", label: "Wake up", durationMinutes: 5 },
    { id: "2", label: "Get dressed", durationMinutes: 10 },
    { id: "3", label: "Eat breakfast", durationMinutes: 15 },
    { id: "4", label: "Brush teeth", durationMinutes: 5 },
  ],
  showDuration: true,
  highContrast: false,
  showCheckmarks: true,
};

const DEFAULT_MATCHING_GAME_CONFIG: MatchingGameConfig = {
  title: "Animal Sounds",
  pairs: [
    { id: "1", prompt: "Dog", answer: "Woof" },
    { id: "2", prompt: "Cat", answer: "Meow" },
    { id: "3", prompt: "Cow", answer: "Moo" },
    { id: "4", prompt: "Duck", answer: "Quack" },
  ],
  showAnswerImages: false,
  celebrateCorrect: true,
  highContrast: false,
};

export const templateRegistry: Record<string, TemplateRegistration> = {
  aac_board: {
    meta: {
      id: "aac_board",
      name: "AAC Communication Board",
      description: "Tappable picture-and-word buttons that speak aloud when pressed.",
      intendedFor: "Children using AAC or building functional communication",
      estimatedSetupMinutes: 5,
    },
    Editor: AACBoardEditor,
    Runtime: AACBoardRuntime,
    defaultConfig: DEFAULT_AAC_CONFIG,
    parseConfig: (json: string) => AACBoardConfigSchema.parse(JSON.parse(json)),
  },
  first_then_board: {
    meta: {
      id: "first_then_board",
      name: "First / Then Board",
      description: "Visual sequencing — First complete a task, Then earn a reward.",
      intendedFor: "Children who benefit from understanding task-reward sequences",
      estimatedSetupMinutes: 3,
    },
    Editor: FirstThenBoardEditor,
    Runtime: FirstThenBoardRuntime,
    defaultConfig: DEFAULT_FIRST_THEN_CONFIG,
    parseConfig: (json: string) => FirstThenBoardConfigSchema.parse(JSON.parse(json)),
  },
  token_board: {
    meta: {
      id: "token_board",
      name: "Token Board",
      description: "Positive reinforcement — earn tokens for completing tasks, exchange for a reward.",
      intendedFor: "Children working on positive behavior reinforcement",
      estimatedSetupMinutes: 3,
    },
    Editor: TokenBoardEditor,
    Runtime: TokenBoardRuntime,
    defaultConfig: DEFAULT_TOKEN_BOARD_CONFIG,
    parseConfig: (json: string) => TokenBoardConfigSchema.parse(JSON.parse(json)),
  },
  visual_schedule: {
    meta: {
      id: "visual_schedule",
      name: "Visual Schedule",
      description: "Step-by-step activity sequence to reduce transition anxiety.",
      intendedFor: "Children who need structure and predictability in their routine",
      estimatedSetupMinutes: 5,
    },
    Editor: VisualScheduleEditor,
    Runtime: VisualScheduleRuntime,
    defaultConfig: DEFAULT_VISUAL_SCHEDULE_CONFIG,
    parseConfig: (json: string) => VisualScheduleConfigSchema.parse(JSON.parse(json)),
  },
  matching_game: {
    meta: {
      id: "matching_game",
      name: "Matching Game",
      description: "Vocabulary and concept matching for language development.",
      intendedFor: "Children building word-concept associations and vocabulary",
      estimatedSetupMinutes: 5,
    },
    Editor: MatchingGameEditor,
    Runtime: MatchingGameRuntime,
    defaultConfig: DEFAULT_MATCHING_GAME_CONFIG,
    parseConfig: (json: string) => MatchingGameConfigSchema.parse(JSON.parse(json)),
  },
};
