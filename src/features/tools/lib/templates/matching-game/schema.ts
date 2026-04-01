import { z } from "zod";

export const MatchPairSchema = z.object({
  id: z.string(),
  prompt: z.string().min(1).max(100),
  answer: z.string().min(1).max(100),
  imageUrl: z.string().url().optional(),
});

export const MatchingGameConfigSchema = z.object({
  title: z.string().min(1).max(100),
  pairs: z.array(MatchPairSchema).min(2).max(8),
  showAnswerImages: z.boolean().default(false),
  celebrateCorrect: z.boolean().default(true),
  highContrast: z.boolean().default(false),
});

export type MatchingGameConfig = z.infer<typeof MatchingGameConfigSchema>;
export type MatchPair = z.infer<typeof MatchPairSchema>;
