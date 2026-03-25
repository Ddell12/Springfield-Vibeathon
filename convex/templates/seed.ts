import { internalMutation } from "../_generated/server";

const TEMPLATES = [
  {
    name: "Feelings Board",
    description:
      "Helps children identify and express complex emotions using visual cues and relatable icons.",
    category: "communication",
    starterPrompt:
      "Build a feelings board communication app. Show 8 emotion cards (happy, sad, angry, scared, excited, tired, calm, worried) with icons. When tapped, speak the emotion aloud using text-to-speech. Include a sentence builder that says 'I feel [emotion]'.",
    sortOrder: 1,
  },
  {
    name: "Basic Needs Board",
    description:
      "A simplified interface for non-verbal communication of immediate requirements like food, water, and rest.",
    category: "communication",
    starterPrompt:
      "Create a basic needs communication board for a non-verbal child. Show 6 need cards: water, food, bathroom, break, help, sleep. Each card has an icon and label. When tapped, speak 'I want [need]' aloud.",
    sortOrder: 2,
  },
  {
    name: "5-Star Reward Chart",
    description:
      "Encourages positive behavior reinforcement through incremental goals and visual achievement milestones.",
    category: "rewards",
    starterPrompt:
      "Build a token board with 5 star tokens. When all tokens are earned, show a confetti celebration and let the child choose a reward from: screen time, favorite snack, or choose a game.",
    sortOrder: 3,
  },
  {
    name: "Sticker Collection",
    description:
      "A gamified approach to task completion where children earn stickers toward a reward.",
    category: "rewards",
    starterPrompt:
      "Create a sticker collection token board with 10 sticker slots. Animate each sticker being placed when tapped. When all 10 are collected, celebrate with stars and let the child pick a reward: pick a sticker, extra playtime, or special activity.",
    sortOrder: 4,
  },
  {
    name: "Morning Routine",
    description:
      "Step-by-step visual schedule to reduce morning anxiety and build independence in start-of-day tasks.",
    category: "routines",
    starterPrompt:
      "Create a visual morning routine for a child with autism. Steps: wake up, use bathroom, brush teeth, get dressed, eat breakfast, pack backpack, go to school. Each step has a fun icon and can be tapped to mark as done. Show progress at the top.",
    sortOrder: 5,
  },
  {
    name: "Bedtime Routine",
    description:
      "A calming visual guide for wind-down activities, helping transition into a restful night's sleep.",
    category: "routines",
    starterPrompt:
      "Build a calming bedtime routine app. Steps: put on pajamas, brush teeth, wash face, read a book, lights off, deep breaths, go to sleep. Use a dark theme with soothing colors. Each step can be tapped to complete.",
    sortOrder: 6,
  },
];

export const seedTemplates = internalMutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    for (const template of TEMPLATES) {
      // Idempotency: check if template with this name already exists
      const categoryTemplates = await ctx.db
        .query("therapyTemplates")
        .withIndex("by_category", (q) => q.eq("category", template.category))
        .collect();

      const existing = categoryTemplates.find((t) => t.name === template.name);
      if (existing) {
        continue;
      }

      await ctx.db.insert("therapyTemplates", {
        name: template.name,
        description: template.description,
        category: template.category,
        starterPrompt: template.starterPrompt,
        sortOrder: template.sortOrder,
      });
    }
  },
});
