import { z } from "zod";

export const FirstThenBoardConfigSchema = z.object({
  title: z.string().min(1).max(100),
  firstLabel: z.string().min(1).max(100),
  thenLabel: z.string().min(1).max(100),
  firstImageUrl: z.string().url().optional(),
  thenImageUrl: z.string().url().optional(),
  firstColor: z.string().default("#3B82F6"),
  thenColor: z.string().default("#10B981"),
  highContrast: z.boolean().default(false),
  showCheckmark: z.boolean().default(true),
});

export type FirstThenBoardConfig = z.infer<typeof FirstThenBoardConfigSchema>;
