import { z } from "zod";

import { TherapyBlueprintSchema } from "./index";

export const GenerateInputSchema = z.object({
  query: z.string().min(1, "Prompt is required").max(10_000, "Prompt too long (max 10,000 characters)").optional(),
  prompt: z.string().min(1).max(10_000).optional(),
  sessionId: z.string().optional(),
  mode: z.enum(["builder", "flashcards"]).default("builder"),
  blueprint: TherapyBlueprintSchema.optional(),
  patientId: z.string().optional(),
}).refine(
  (data) => data.query?.trim() || data.prompt?.trim(),
  { message: "Either query or prompt is required" }
);

export type GenerateInput = z.infer<typeof GenerateInputSchema>;
