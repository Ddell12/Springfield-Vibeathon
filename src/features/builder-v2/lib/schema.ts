import { z } from "zod";

export const FragmentTemplate = z.enum([
  "vite-therapy",
  "nextjs-developer",
  "vue-developer",
  "html-developer",
]);

export const FragmentPersistence = z.enum(["session", "device", "cloud"]);

export const FragmentSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    template: FragmentTemplate,
    code: z.string(),
    file_path: z.string(),
    has_additional_dependencies: z.boolean(),
    additional_dependencies: z.array(z.string()).optional(),
    port: z.number().optional(),
    persistence: FragmentPersistence.optional().default("device"),
  })
  .transform((data) => {
    const isVite = data.template === "vite-therapy";
    return {
      ...data,
      port: data.port ?? (isVite ? 5173 : 3000),
    };
  });

export type FragmentResult = z.infer<typeof FragmentSchema>;
