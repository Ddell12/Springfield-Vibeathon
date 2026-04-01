import { z } from "zod";

export const TokenBoardConfigSchema = z.object({
  title: z.string().min(1).max(100),
  tokenCount: z.number().int().min(3).max(10).default(5),
  rewardLabel: z.string().min(1).max(100),
  rewardImageUrl: z.string().url().optional(),
  tokenShape: z.enum(["star", "circle", "heart"]).default("star"),
  tokenColor: z.string().default("#FBBF24"),
  highContrast: z.boolean().default(false),
});

export type TokenBoardConfig = z.infer<typeof TokenBoardConfigSchema>;
