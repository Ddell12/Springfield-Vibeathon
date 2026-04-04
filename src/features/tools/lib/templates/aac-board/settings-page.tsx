"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { AACBoardEditor } from "./editor";
import type { AACBoardConfig } from "./schema";
import { AACBoardConfigSchema } from "./schema";

export function AACBoardSettingsPage({
  config: initialConfig,
  data,
}: PageProps<AACBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = AACBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return (
    <div className="overflow-y-auto">
      <AACBoardEditor
        config={config}
        onChange={(updated) => data.set("config", updated)}
      />
    </div>
  );
}
