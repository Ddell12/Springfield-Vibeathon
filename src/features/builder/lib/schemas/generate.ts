import { z } from "zod";

export const GenerateInputSchema = z.object({
  query: z.string().min(1, "Prompt is required").max(10_000, "Prompt too long (max 10,000 characters)").optional(),
  prompt: z.string().min(1).max(10_000).optional(),
  sessionId: z.string().optional(),
  mode: z.enum(["builder", "flashcards"]).default("builder"),
}).refine(
  (data) => data.query || data.prompt,
  { message: "Either query or prompt is required" }
);

export type GenerateInput = z.infer<typeof GenerateInputSchema>;
