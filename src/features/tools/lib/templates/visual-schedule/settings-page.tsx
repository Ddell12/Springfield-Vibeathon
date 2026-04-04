"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { VisualScheduleEditor } from "./editor";
import type { VisualScheduleConfig } from "./schema";
import { VisualScheduleConfigSchema } from "./schema";

export function VisualScheduleSettingsPage({
  config: initialConfig,
  data,
}: PageProps<VisualScheduleConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = VisualScheduleConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return (
    <div className="overflow-y-auto">
      <VisualScheduleEditor
        config={config}
        onChange={(updated) => data.set("config", updated)}
      />
    </div>
  );
}
