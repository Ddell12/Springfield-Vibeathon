import { z } from "zod";

export const generationProfileSchema = z.object({
  targetSetting: z.enum(["clinic", "home", "both"]).optional(),
  interactionRichness: z.enum(["standard", "high"]).optional(),
  voicePreference: z.literal("elevenlabs-first").optional(),
  sensoryMode: z.enum(["calm", "energetic"]).optional(),
});

export const childProfileSchema = z.object({
  ageRange: z.string().optional(),
  interests: z.array(z.string()).optional(),
  communicationLevel: z.string().optional(),
});

export const generateConfigRequestSchema = z.object({
  templateType: z.string(),
  description: z.string().min(1),
  childProfile: childProfileSchema,
  generationProfile: generationProfileSchema.optional(),
});

export const inferTemplateRequestSchema = z.object({
  description: z.string().min(1).max(1000),
  childProfile: childProfileSchema.optional(),
});
