"use node";

import { api } from "../_generated/api";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

const SEED_IMAGES: Array<{ label: string; category: string }> = [
  // Emotions
  { label: "happy", category: "emotions" },
  { label: "sad", category: "emotions" },
  { label: "angry", category: "emotions" },
  { label: "scared", category: "emotions" },
  { label: "tired", category: "emotions" },
  { label: "excited", category: "emotions" },
  { label: "calm", category: "emotions" },
  { label: "worried", category: "emotions" },
  { label: "surprised", category: "emotions" },
  { label: "proud", category: "emotions" },
  // Core words
  { label: "want", category: "objects" },
  { label: "help", category: "people" },
  { label: "more", category: "objects" },
  { label: "stop", category: "objects" },
  { label: "yes", category: "emotions" },
  { label: "no", category: "emotions" },
  { label: "go", category: "daily-activities" },
  { label: "play", category: "daily-activities" },
  { label: "eat", category: "food" },
  { label: "drink", category: "food" },
  { label: "open", category: "objects" },
  { label: "close", category: "objects" },
  // Daily activities
  { label: "wake up", category: "daily-activities" },
  { label: "brush teeth", category: "daily-activities" },
  { label: "get dressed", category: "daily-activities" },
  { label: "eat breakfast", category: "daily-activities" },
  { label: "go to school", category: "daily-activities" },
  { label: "bath", category: "daily-activities" },
  { label: "sleep", category: "daily-activities" },
  { label: "wash hands", category: "daily-activities" },
  // Food
  { label: "apple", category: "food" },
  { label: "banana", category: "food" },
  { label: "juice", category: "food" },
  { label: "milk", category: "food" },
  { label: "water", category: "food" },
  { label: "cookie", category: "food" },
  { label: "cracker", category: "food" },
  { label: "cereal", category: "food" },
  // Animals
  { label: "cat", category: "animals" },
  { label: "dog", category: "animals" },
  { label: "fish", category: "animals" },
  { label: "bird", category: "animals" },
  { label: "rabbit", category: "animals" },
  { label: "bear", category: "animals" },
  // Objects
  { label: "ball", category: "objects" },
  { label: "book", category: "objects" },
  { label: "toy", category: "objects" },
  { label: "tablet", category: "objects" },
  { label: "blanket", category: "objects" },
  { label: "cup", category: "objects" },
];

export const seedImages = internalAction({
  args: {},
  handler: async (ctx) => {
    const hasAny = await ctx.runQuery(internal.image_cache.hasAny);
    if (hasAny) {
      console.log("Image cache already seeded, skipping");
      return;
    }

    console.log(`Seeding ${SEED_IMAGES.length} therapy images...`);
    for (const { label, category } of SEED_IMAGES) {
      try {
        await ctx.runAction(api.image_generation.generateTherapyImage, {
          label,
          category,
        });
        console.log(`Seeded: ${label} (${category})`);
      } catch (err) {
        console.error(`Failed to seed ${label}:`, err);
      }
    }
    console.log("Image seeding complete");
  },
});
