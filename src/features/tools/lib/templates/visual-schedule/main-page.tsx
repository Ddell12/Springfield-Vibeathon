"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { VisualScheduleRuntime } from "./runtime";
import type { VisualScheduleConfig } from "./schema";
import { VisualScheduleConfigSchema } from "./schema";

export function VisualScheduleMainPage({
  data,
  config: initialConfig,
  ...rest
}: PageProps<VisualScheduleConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = VisualScheduleConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return <VisualScheduleRuntime {...rest} config={config} />;
}
