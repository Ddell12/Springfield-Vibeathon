"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { FirstThenBoardEditor } from "./editor";
import type { FirstThenBoardConfig } from "./schema";
import { FirstThenBoardConfigSchema } from "./schema";

export function FirstThenBoardSettingsPage({
  config: initialConfig,
  data,
}: PageProps<FirstThenBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = FirstThenBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return (
    <div className="overflow-y-auto">
      <FirstThenBoardEditor
        config={config}
        onChange={(updated) => data.set("config", updated)}
      />
    </div>
  );
}
