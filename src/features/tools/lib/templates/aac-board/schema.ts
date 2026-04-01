import { z } from "zod";

export const AACButtonSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(50),
  speakText: z.string().min(1).max(200),
  imageUrl: z.string().url().optional(),
  backgroundColor: z.string().optional(),
});

export const AACBoardConfigSchema = z.object({
  title: z.string().min(1).max(100),
  gridCols: z.number().int().min(2).max(6).default(3),
  gridRows: z.number().int().min(1).max(4).default(2),
  buttons: z.array(AACButtonSchema).min(1).max(24),
  showTextLabels: z.boolean().default(true),
  autoSpeak: z.boolean().default(true),
  voice: z.enum(["child-friendly", "warm-female", "calm-male"]).default("child-friendly"),
  highContrast: z.boolean().default(false),
});

export type AACBoardConfig = z.infer<typeof AACBoardConfigSchema>;
export type AACButton = z.infer<typeof AACButtonSchema>;
