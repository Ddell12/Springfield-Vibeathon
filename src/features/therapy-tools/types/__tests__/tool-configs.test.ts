import {
  CommunicationBoardSchema,
  TokenBoardSchema,
  ToolConfigSchema,
  VisualScheduleSchema,
} from "../tool-configs";

const validVisualSchedule = {
  type: "visual-schedule" as const,
  title: "Morning Routine",
  steps: [
    { id: "1", label: "Brush teeth", icon: "toothbrush", completed: false },
  ],
  orientation: "vertical" as const,
  showCheckmarks: true,
  theme: "default",
};

const validTokenBoard = {
  type: "token-board" as const,
  title: "Star Chart",
  totalTokens: 5,
  earnedTokens: 2,
  tokenIcon: "star",
  reinforcers: [{ id: "1", label: "iPad time", icon: "tablet" }],
  celebrationAnimation: "confetti",
};

const validCommunicationBoard = {
  type: "communication-board" as const,
  title: "I want",
  sentenceStarter: "I want",
  cards: [
    { id: "1", label: "Water", icon: "water", category: "drinks" },
  ],
  enableTTS: true,
  voiceId: "voice-1",
  columns: 3,
};

const validChoiceBoard = {
  type: "choice-board" as const,
  title: "Pick a snack",
  prompt: "What do you want?",
  choices: [{ id: "1", label: "Apple", icon: "apple" }],
  maxSelections: 1,
  showConfirmButton: true,
};

const validFirstThenBoard = {
  type: "first-then-board" as const,
  title: "First Then",
  firstTask: { label: "Homework", icon: "pencil", completed: false },
  thenReward: { label: "Play", icon: "gamepad" },
  showTimer: true,
  timerMinutes: 10,
};

describe("tool-configs schemas", () => {
  it("parses a valid VisualScheduleConfig", () => {
    const result = VisualScheduleSchema.safeParse(validVisualSchedule);
    expect(result.success).toBe(true);
  });

  it("parses a valid TokenBoardConfig", () => {
    const result = TokenBoardSchema.safeParse(validTokenBoard);
    expect(result.success).toBe(true);
  });

  it("parses a valid CommunicationBoardConfig", () => {
    const result = CommunicationBoardSchema.safeParse(validCommunicationBoard);
    expect(result.success).toBe(true);
  });

  it("ToolConfigSchema accepts any of the 5 tool types", () => {
    expect(ToolConfigSchema.safeParse(validVisualSchedule).success).toBe(true);
    expect(ToolConfigSchema.safeParse(validTokenBoard).success).toBe(true);
    expect(ToolConfigSchema.safeParse(validCommunicationBoard).success).toBe(true);
    expect(ToolConfigSchema.safeParse(validChoiceBoard).success).toBe(true);
    expect(ToolConfigSchema.safeParse(validFirstThenBoard).success).toBe(true);
  });

  it("fails when a required field is missing", () => {
    const { title: _, ...incomplete } = validTokenBoard;
    const result = TokenBoardSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("fails on an invalid type string in the discriminated union", () => {
    const invalid = { ...validTokenBoard, type: "nonexistent-board" };
    const result = ToolConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
