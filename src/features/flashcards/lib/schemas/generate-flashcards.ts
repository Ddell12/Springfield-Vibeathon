import { z } from "zod";

export const GenerateFlashcardsInputSchema = z.object({
  query: z.string().min(1, "Prompt is required").max(10_000, "Prompt too long (max 10,000 characters)").optional(),
  prompt: z.string().min(1, "Prompt is required").max(10_000, "Prompt too long (max 10,000 characters)").optional(),
  sessionId: z.string().optional(),
}).refine(
  (data) => data.query?.trim() || data.prompt?.trim(),
  { message: "A prompt is required" },
);

export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;
