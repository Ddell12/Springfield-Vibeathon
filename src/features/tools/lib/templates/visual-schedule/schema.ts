import { z } from "zod";

export const ScheduleItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(100),
  imageUrl: z.string().url().optional(),
  durationMinutes: z.number().int().min(1).max(120).optional(),
});

export const VisualScheduleConfigSchema = z.object({
  title: z.string().min(1).max(100),
  items: z.array(ScheduleItemSchema).min(1).max(12),
  showDuration: z.boolean().default(false),
  highContrast: z.boolean().default(false),
  showCheckmarks: z.boolean().default(true),
});

export type VisualScheduleConfig = z.infer<typeof VisualScheduleConfigSchema>;
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;
