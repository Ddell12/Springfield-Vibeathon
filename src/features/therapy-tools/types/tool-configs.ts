import { z } from "zod";

// VisualSchedule
export const VisualScheduleSchema = z.object({
  type: z.literal("visual-schedule"),
  title: z.string(),
  steps: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      icon: z.string(),
      completed: z.boolean(),
    }),
  ),
  orientation: z.enum(["vertical", "horizontal"]).default("vertical"),
  showCheckmarks: z.boolean().default(true),
  theme: z.string().default("default"),
});

export type VisualScheduleConfig = z.infer<typeof VisualScheduleSchema>;

// TokenBoard
export const TokenBoardSchema = z.object({
  type: z.literal("token-board"),
  title: z.string(),
  totalTokens: z.number(),
  earnedTokens: z.number(),
  tokenIcon: z.string(),
  reinforcers: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      icon: z.string(),
    }),
  ),
  celebrationAnimation: z.boolean(),
});

export type TokenBoardConfig = z.infer<typeof TokenBoardSchema>;

// CommunicationBoard
export const CommunicationBoardSchema = z.object({
  type: z.literal("communication-board"),
  title: z.string(),
  sentenceStarter: z.string(),
  cards: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      icon: z.string(),
      category: z.string(),
      imageUrl: z.string().optional(),
    }),
  ),
  enableTTS: z.boolean(),
  voiceId: z.string(),
  columns: z.number(),
});

export type CommunicationBoardConfig = z.infer<typeof CommunicationBoardSchema>;

// ChoiceBoard
export const ChoiceBoardSchema = z.object({
  type: z.literal("choice-board"),
  title: z.string(),
  prompt: z.string(),
  choices: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      icon: z.string(),
    }),
  ),
  maxSelections: z.number(),
  showConfirmButton: z.boolean(),
});

export type ChoiceBoardConfig = z.infer<typeof ChoiceBoardSchema>;

// FirstThenBoard
export const FirstThenBoardSchema = z.object({
  type: z.literal("first-then-board"),
  title: z.string(),
  firstTask: z.object({
    label: z.string(),
    icon: z.string(),
    completed: z.boolean(),
  }),
  thenReward: z.object({
    label: z.string(),
    icon: z.string(),
  }),
  showTimer: z.boolean(),
  timerMinutes: z.number(),
});

export type FirstThenBoardConfig = z.infer<typeof FirstThenBoardSchema>;

// Discriminated union
export const ToolConfigSchema = z.discriminatedUnion("type", [
  VisualScheduleSchema,
  TokenBoardSchema,
  CommunicationBoardSchema,
  ChoiceBoardSchema,
  FirstThenBoardSchema,
]);

export type ToolConfig = z.infer<typeof ToolConfigSchema>;
