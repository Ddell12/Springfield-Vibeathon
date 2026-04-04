import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart3, BookOpen, LayoutGrid, Settings2 } from "lucide-react";
import { z } from "zod";

import { type AppShellConfig, DEFAULT_APP_SHELL } from "./runtime/app-shell-types";
import type { TemplateDataStore } from "./runtime/page-types";
import { AACBoardEditor } from "./templates/aac-board/editor";
import { AACBoardHistoryPage } from "./templates/aac-board/history-page";
import { AACBoardMainPage } from "./templates/aac-board/main-page";
import { AACBoardRuntime } from "./templates/aac-board/runtime";
import { type AACBoardConfig,AACBoardConfigSchema } from "./templates/aac-board/schema";
import { AACBoardSettingsPage } from "./templates/aac-board/settings-page";
import { AACBoardWordBankPage } from "./templates/aac-board/word-bank-page";
import { FirstThenBoardEditor } from "./templates/first-then-board/editor";
import { FirstThenBoardRuntime } from "./templates/first-then-board/runtime";
import { type FirstThenBoardConfig,FirstThenBoardConfigSchema } from "./templates/first-then-board/schema";
import { MatchingGameEditor } from "./templates/matching-game/editor";
import { MatchingGameRuntime } from "./templates/matching-game/runtime";
import { type MatchingGameConfig,MatchingGameConfigSchema } from "./templates/matching-game/schema";
import { TokenBoardEditor } from "./templates/token-board/editor";
import { TokenBoardHistoryPage } from "./templates/token-board/history-page";
import { TokenBoardMainPage } from "./templates/token-board/main-page";
import { TokenBoardRuntime } from "./templates/token-board/runtime";
import { TokenBoardSettingsPage } from "./templates/token-board/settings-page";
import { type TokenBoardConfig,TokenBoardConfigSchema } from "./templates/token-board/schema";
import { VisualScheduleEditor } from "./templates/visual-schedule/editor";
import { VisualScheduleRuntime } from "./templates/visual-schedule/runtime";
import { type VisualScheduleConfig,VisualScheduleConfigSchema } from "./templates/visual-schedule/schema";

export interface RuntimeProps<TConfig = unknown> {
  config: TConfig;
  appInstanceId?: string;           // NEW — optional to avoid breaking existing tests
  mode: "preview" | "published";
  onEvent: (type: string, payloadJson?: string) => void;
  voice: {
    speak: (args: { text: string; voice?: string }) => Promise<void>;
    stop: () => void;
    status: "idle" | "loading" | "ready" | "error";
  };
}

export interface EditorProps<TConfig = unknown> {
  config: TConfig;
  onChange: (config: TConfig) => void;
}

export interface PageDefinition<TConfig = unknown> {
  id: string;
  label: string;
  icon: LucideIcon;
  audience: "slp" | "child" | "both";
  component: ComponentType<PageProps<TConfig>>;
}

export interface PageProps<TConfig = unknown> extends RuntimeProps<TConfig> {
  data: TemplateDataStore;
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
  shell: AppShellConfig;
  aiConfigSchema: z.ZodTypeAny;
  schemaPrompt: string;
  pages: PageDefinition[];          // NEW
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
  sentenceStripEnabled: false,
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
    shell: {
      ...DEFAULT_APP_SHELL,
      themePreset: "calm",
      enableSounds: true,
      enableDifficulty: false,
      instructionsText:
        "Tap a picture to hear the word. Use the board to build a short message one step at a time.",
    },
    // Note: Anthropic structured output does not support min/max on integer types.
    // Use plain z.number().int() or z.number() — range hints go in schemaPrompt only.
    aiConfigSchema: z.object({
      title: z.string().optional(),
      gridCols: z.number().optional(),
      gridRows: z.number().optional(),
      buttons: z.array(z.object({
        id: z.string(),
        label: z.string(),
        speakText: z.string(),
        imageUrl: z.string().optional(),
        backgroundColor: z.string().optional(),
        wordCategory: z.enum(["verb", "pronoun", "noun", "descriptor", "social", "core"]).optional(),
      })).optional(),
      showTextLabels: z.boolean().optional(),
      autoSpeak: z.boolean().optional(),
      sentenceStripEnabled: z.boolean().optional(),
      voice: z.enum(["child-friendly", "warm-female", "calm-male"]).optional(),
      highContrast: z.boolean().optional(),
    }),
    schemaPrompt: `Generate buttons that match the clinician request and child context.
- Apply Fitzgerald key colors via wordCategory: "verb" (green), "pronoun" (yellow), "noun" (orange), "descriptor" (blue), "social" (pink)
- speakText should be a natural spoken phrase (e.g. "I want more please", not just "More")
- Prefer 6–12 buttons in a 3×2 or 3×3 grid appropriate to the child's communication level
- Use vocabulary appropriate for the child's age range and interests
- Set autoSpeak: true unless the request implies sentence building
- Set sentenceStripEnabled: true if the request mentions sentence building or combining words`,
    pages: [
      { id: "main", label: "Board", icon: LayoutGrid, audience: "both", component: AACBoardMainPage },
      { id: "settings", label: "Settings", icon: Settings2, audience: "slp", component: AACBoardSettingsPage },
      { id: "history", label: "History", icon: BarChart3, audience: "slp", component: AACBoardHistoryPage },
      { id: "word-bank", label: "Word Bank", icon: BookOpen, audience: "slp", component: AACBoardWordBankPage },
    ],
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
    shell: {
      ...DEFAULT_APP_SHELL,
      themePreset: "calm",
      enableSounds: true,
      enableDifficulty: false,
      instructionsText:
        "Finish the first activity on the left, then move to the reward on the right.",
    },
    aiConfigSchema: z.object({
      title: z.string().optional(),
      firstLabel: z.string().optional(),
      thenLabel: z.string().optional(),
      firstColor: z.string().optional(),
      thenColor: z.string().optional(),
      highContrast: z.boolean().optional(),
      showCheckmark: z.boolean().optional(),
    }),
    schemaPrompt: `Set firstLabel and thenLabel to specific, concrete activities — never generic placeholders.
- firstLabel should name the task the child must complete (e.g. "Finish your worksheet")
- thenLabel should name the motivating reward (e.g. "5 minutes of dinosaur videos")
- If child interests are provided, weave them into the thenLabel
- firstColor and thenColor should be visually distinct bright hex values
- showCheckmark: true by default`,
    pages: [],
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
    shell: {
      ...DEFAULT_APP_SHELL,
      themePreset: "calm",
      enableSounds: true,
      enableDifficulty: false,
      instructionsText:
        "Tap one token each time the task is done. Fill the whole board to earn the reward.",
    },
    // Note: Anthropic structured output does not support min/max on integer types.
    aiConfigSchema: z.object({
      title: z.string().optional(),
      tokenCount: z.number().optional(),
      rewardLabel: z.string().optional(),
      tokenShape: z.enum(["star", "circle", "heart"]).optional(),
      tokenColor: z.string().optional(),
      highContrast: z.boolean().optional(),
    }),
    schemaPrompt: `Set rewardLabel to a specific, motivating reward matching the child profile — never "Reward" or "Prize".
- tokenCount: 3–5 for young children (ages 3–5), 5–8 for older children
- tokenShape: "star" by default; "circle" for simpler visual needs
- tokenColor should be bright and positive — gold (#FBBF24), green (#22c55e), or aligned with child interests`,
    pages: [
      { id: "main", label: "Board", icon: LayoutGrid, audience: "both", component: TokenBoardMainPage },
      { id: "settings", label: "Settings", icon: Settings2, audience: "slp", component: TokenBoardSettingsPage },
      { id: "history", label: "History", icon: BarChart3, audience: "slp", component: TokenBoardHistoryPage },
    ],
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
    shell: {
      ...DEFAULT_APP_SHELL,
      themePreset: "calm",
      enableSounds: true,
      enableDifficulty: false,
      instructionsText:
        "Work through each step in order. Tap a step when it is finished to move forward.",
    },
    // Note: Anthropic structured output does not support min/max on integer types.
    aiConfigSchema: z.object({
      title: z.string().optional(),
      items: z.array(z.object({
        id: z.string(),
        label: z.string(),
        imageUrl: z.string().optional(),
        durationMinutes: z.number().optional(),
      })).optional(),
      showDuration: z.boolean().optional(),
      highContrast: z.boolean().optional(),
      showCheckmarks: z.boolean().optional(),
    }),
    schemaPrompt: `Generate 3–8 schedule items with concrete, specific labels — never "Activity 1" or "Step 2".
- Each item label should name a real activity (e.g. "Put on shoes", "Eat breakfast")
- durationMinutes should reflect realistic times for the age range
- Items should follow a logical sequential order appropriate to the context
- showCheckmarks: true and showDuration: true by default`,
    pages: [],
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
    shell: {
      ...DEFAULT_APP_SHELL,
      themePreset: "playful",
      enableSounds: true,
      enableDifficulty: true,
      enableProgress: true,
      instructionsText:
        "Choose an item on the left, then tap the matching answer on the right until all pairs are found.",
    },
    aiConfigSchema: z.object({
      title: z.string().optional(),
      pairs: z.array(z.object({
        id: z.string(),
        prompt: z.string(),
        answer: z.string(),
        imageUrl: z.string().optional(),
        promptImageUrl: z.string().optional(),
      })).optional(),
      showAnswerImages: z.boolean().optional(),
      celebrateCorrect: z.boolean().optional(),
      highContrast: z.boolean().optional(),
    }),
    schemaPrompt: `Generate 4–8 word-answer pairs that match the described vocabulary or concept goal.
- Each pair: prompt is the cue (word, category, or question), answer is the correct match
- Pairs should be meaningfully related and appropriately challenging for the age range
- Avoid trivially easy pairs (dog/cat) unless the request is explicitly for beginners
- celebrateCorrect: true for engagement`,
    pages: [],
  },
};
