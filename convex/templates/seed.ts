import { nanoid } from "nanoid";

import { internalMutation } from "../_generated/server";

const TEMPLATES = [
  {
    title: "Feelings Board",
    description:
      "Helps children identify and express complex emotions using visual cues and relatable icons.",
    toolType: "communication-board" as const,
    templateCategory: "communication",
    config: {
      type: "communication-board",
      title: "Feelings Board",
      sentenceStarter: "I feel",
      enableTTS: true,
      voiceId: "21m00Tcm4TlvDq8ikWAM",
      columns: 4,
      cards: [
        { id: "card-1", label: "happy", icon: "smile", category: "emotion" },
        { id: "card-2", label: "sad", icon: "frown", category: "emotion" },
        { id: "card-3", label: "angry", icon: "angry", category: "emotion" },
        { id: "card-4", label: "scared", icon: "alert-circle", category: "emotion" },
        { id: "card-5", label: "excited", icon: "zap", category: "emotion" },
        { id: "card-6", label: "tired", icon: "moon", category: "emotion" },
        { id: "card-7", label: "calm", icon: "cloud", category: "emotion" },
        { id: "card-8", label: "worried", icon: "help-circle", category: "emotion" },
      ],
    },
  },
  {
    title: "Basic Needs Board",
    description:
      "A simplified interface for non-verbal communication of immediate requirements like food, water, and rest.",
    toolType: "communication-board" as const,
    templateCategory: "communication",
    config: {
      type: "communication-board",
      title: "Basic Needs Board",
      sentenceStarter: "I want",
      enableTTS: true,
      voiceId: "21m00Tcm4TlvDq8ikWAM",
      columns: 3,
      cards: [
        { id: "card-1", label: "water", icon: "droplets", category: "needs" },
        { id: "card-2", label: "food", icon: "apple", category: "needs" },
        { id: "card-3", label: "bathroom", icon: "bath", category: "needs" },
        { id: "card-4", label: "break", icon: "pause-circle", category: "needs" },
        { id: "card-5", label: "help", icon: "hand-helping", category: "needs" },
        { id: "card-6", label: "sleep", icon: "bed", category: "needs" },
      ],
    },
  },
  {
    title: "5-Star Reward Chart",
    description:
      "Encourages positive behavior reinforcement through incremental goals and visual achievement milestones.",
    toolType: "token-board" as const,
    templateCategory: "rewards",
    config: {
      type: "token-board",
      title: "5-Star Reward Chart",
      totalTokens: 5,
      earnedTokens: 0,
      tokenIcon: "star",
      celebrationAnimation: "confetti",
      reinforcers: [
        { id: "r-1", label: "Screen time", icon: "tv" },
        { id: "r-2", label: "Favorite snack", icon: "cookie" },
        { id: "r-3", label: "Choose a game", icon: "gamepad" },
      ],
    },
  },
  {
    title: "Sticker Collection",
    description:
      "A gamified approach to task completion where children earn stickers toward a reward.",
    toolType: "token-board" as const,
    templateCategory: "rewards",
    config: {
      type: "token-board",
      title: "Sticker Collection",
      totalTokens: 10,
      earnedTokens: 0,
      tokenIcon: "sticker",
      celebrationAnimation: "stars",
      reinforcers: [
        { id: "r-1", label: "Pick a sticker", icon: "star" },
        { id: "r-2", label: "Extra playtime", icon: "play" },
        { id: "r-3", label: "Special activity", icon: "heart" },
      ],
    },
  },
  {
    title: "Morning Routine",
    description:
      "Step-by-step visual schedule to reduce morning anxiety and build independence in start-of-day tasks.",
    toolType: "visual-schedule" as const,
    templateCategory: "routines",
    config: {
      type: "visual-schedule",
      title: "Morning Routine",
      orientation: "vertical",
      showCheckmarks: true,
      theme: "light",
      steps: [
        { id: "step-1", label: "Wake up", icon: "sun", completed: false },
        { id: "step-2", label: "Use bathroom", icon: "droplets", completed: false },
        { id: "step-3", label: "Brush teeth", icon: "toothbrush", completed: false },
        { id: "step-4", label: "Get dressed", icon: "shirt", completed: false },
        { id: "step-5", label: "Eat breakfast", icon: "utensils", completed: false },
        { id: "step-6", label: "Pack backpack", icon: "briefcase", completed: false },
        { id: "step-7", label: "Go to school", icon: "bus", completed: false },
      ],
    },
  },
  {
    title: "Bedtime Routine",
    description:
      "A calming visual guide for wind-down activities, helping transition into a restful night's sleep.",
    toolType: "visual-schedule" as const,
    templateCategory: "routines",
    config: {
      type: "visual-schedule",
      title: "Bedtime Routine",
      orientation: "vertical",
      showCheckmarks: true,
      theme: "dark",
      steps: [
        { id: "step-1", label: "Put on pajamas", icon: "shirt", completed: false },
        { id: "step-2", label: "Brush teeth", icon: "toothbrush", completed: false },
        { id: "step-3", label: "Wash face", icon: "droplets", completed: false },
        { id: "step-4", label: "Read a book", icon: "book", completed: false },
        { id: "step-5", label: "Lights off", icon: "moon", completed: false },
        { id: "step-6", label: "Deep breaths", icon: "wind", completed: false },
        { id: "step-7", label: "Go to sleep", icon: "bed", completed: false },
      ],
    },
  },
];

export const seedTemplates = internalMutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    for (const template of TEMPLATES) {
      // Check if a template with this title already exists (idempotency).
      // Query all templates in the category via index, then check title in JS.
      const categoryTemplates = await ctx.db
        .query("tools")
        .withIndex("by_template", (q) =>
          q.eq("isTemplate", true).eq("templateCategory", template.templateCategory),
        )
        .collect();

      const existing = categoryTemplates.find((t) => t.title === template.title);
      if (existing) {
        continue;
      }

      const now = Date.now();
      await ctx.db.insert("tools", {
        title: template.title,
        description: template.description,
        toolType: template.toolType,
        templateCategory: template.templateCategory,
        config: template.config,
        isTemplate: true,
        shareSlug: nanoid(10),
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
