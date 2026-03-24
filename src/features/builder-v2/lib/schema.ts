import { z } from "zod";

export const FragmentTemplate = z.enum([
  "nextjs-developer",
  "vue-developer",
  "html-developer",
]);

export const FragmentSchema = z.object({
  title: z.string(),
  description: z.string(),
  template: FragmentTemplate,
  code: z.string(),
  file_path: z.string(),
  has_additional_dependencies: z.boolean(),
  additional_dependencies: z.array(z.string()).optional(),
  port: z.number().optional().default(3000),
});

export type FragmentResult = z.infer<typeof FragmentSchema>;
