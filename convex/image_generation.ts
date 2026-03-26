"use node";

import { GoogleGenAI } from "@google/genai";
import { v } from "convex/values";
import { createHash } from "crypto";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const CATEGORY_MODIFIERS: Record<string, string> = {
  emotions: "facial expression, round cartoon face",
  "daily-activities": "single action scene, simple background",
  animals: "cute cartoon animal, front-facing",
  food: "single food item, appetizing colors",
  objects: "single subject, centered",
  people: "single person, simple background",
  places: "simple scene, minimal detail",
};

function buildPrompt(label: string, category: string): string {
  const modifier = CATEGORY_MODIFIERS[category] ?? "single subject, centered";
  return `Simple, clear illustration of "${label}", ${modifier}, flat design, bold black outlines, solid colors, white background, child-friendly, Kawaii style, minimal detail, high contrast, suitable for ABA therapy picture card, no text, no watermark, single subject only`;
}

function getPromptHash(prompt: string): string {
  return createHash("sha256").update(prompt.trim().toLowerCase()).digest("hex");
}

// Public action (not internalAction) because route.ts calls it via ConvexHttpClient
// which can only invoke public functions via api.*
export const generateTherapyImage = action({
  args: {
    label: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args): Promise<{ imageUrl: string }> => {
    const prompt = buildPrompt(args.label, args.category);
    const promptHash = getPromptHash(prompt);

    // Check cache
    const cached = await ctx.runQuery(internal.image_cache.getByHash, { promptHash });
    if (cached) {
      return { imageUrl: cached.imageUrl };
    }

    // Generate via Nano Banana Pro (gemini-3-pro-image-preview)
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
    }

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: prompt,
        config: {
          // responseModalities is optional for gemini-3-pro-image-preview (tested 2026-03-25)
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K",
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData,
      );
      if (!part?.inlineData?.data) {
        throw new Error("No image generated");
      }

      const imageBuffer = Buffer.from(part.inlineData.data, "base64");
      const blob = new Blob([imageBuffer], { type: part.inlineData.mimeType ?? "image/png" });

      // Store in Convex file storage
      const storageId = await ctx.storage.store(blob);
      const imageUrl = await ctx.storage.getUrl(storageId);
      if (!imageUrl) {
        throw new Error("Failed to get image storage URL");
      }

      // Cache
      await ctx.runMutation(internal.image_cache.save, {
        promptHash,
        prompt,
        label: args.label,
        category: args.category,
        storageId,
        imageUrl,
        model: "gemini-3-pro-image-preview",
        createdAt: Date.now(),
      });

      return { imageUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[image_gen] Failed:", message);
      throw new Error(
        message.includes("No image generated") ? message : "Image generation failed. Please try again.",
      );
    }
  },
});
