import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("therapyTemplates")
      .withIndex("by_sortOrder")
      .collect();
  },
});

export const getByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("therapyTemplates")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("therapyTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("therapyTemplates").first();
    if (existing) return;

    const templates = [
      {
        name: "Snack Request Board",
        description: "A picture communication board with 8 common snack requests for children to express food preferences",
        category: "Communication",
        starterPrompt: "Build a picture communication board with 8 common snack requests like goldfish crackers, apple slices, juice box, and more. Make it colorful and child-friendly with large tap targets.",
        sortOrder: 1,
      },
      {
        name: "Feelings Check-In",
        description: "An emotions board with 6 feelings for daily emotional check-ins and social-emotional learning",
        category: "Communication",
        starterPrompt: "Create a feelings check-in board with 6 emotions — happy, sad, angry, scared, tired, excited — with emoji-style pictures and large labels. Include a sentence starter like 'I feel...'",
        sortOrder: 2,
      },
      {
        name: "5-Star Token Board",
        description: "A token reward system with 5 stars for reinforcing positive behaviors during therapy sessions",
        category: "Behavior Support",
        starterPrompt: "Build a token board with 5 stars where a child earns tokens for positive behavior. Show a fun animation when each token is earned, and reveal a reward choice screen when all 5 are collected.",
        sortOrder: 3,
      },
      {
        name: "First-Then Transition Board",
        description: "A two-panel visual showing what to do first and what comes next, helping with activity transitions",
        category: "Behavior Support",
        starterPrompt: "Create a first-then board for transitioning between activities — first finish homework, then play outside. Use two large panels side-by-side with clear icons and a progress indicator.",
        sortOrder: 4,
      },
      {
        name: "Morning Routine Schedule",
        description: "A step-by-step visual schedule for morning routines with checkable items",
        category: "Daily Routines",
        starterPrompt: "Build a visual schedule for a morning routine: wake up, brush teeth, get dressed, eat breakfast, pack backpack. Each step should be tappable to mark complete with a satisfying checkmark animation.",
        sortOrder: 5,
      },
      {
        name: "Bedtime Schedule",
        description: "A calming bedtime routine visual schedule to help children wind down independently",
        category: "Daily Routines",
        starterPrompt: "Create a visual bedtime routine: bath time, put on pajamas, brush teeth, read a story, lights out. Use calming colors (blues, purples) and gentle animations. Steps should be tappable to complete.",
        sortOrder: 6,
      },
      {
        name: "Letter Choice Board",
        description: "An interactive letter recognition activity with 4 uppercase letters for early literacy",
        category: "Academic",
        starterPrompt: "Build a choice board with 4 uppercase letters (A, B, C, D) for a letter recognition activity. When a child taps a letter, show it large with a fun animation and say the letter name.",
        sortOrder: 7,
      },
      {
        name: "Color Matching Board",
        description: "An interactive color matching game with 6 colors for learning color names",
        category: "Academic",
        starterPrompt: "Create an interactive color matching activity with 6 colors (red, blue, green, yellow, orange, purple) and their names. The child taps a color swatch and it highlights with the color name shown prominently.",
        sortOrder: 8,
      },
    ];

    for (const template of templates) {
      await ctx.db.insert("therapyTemplates", template);
    }
  },
});
