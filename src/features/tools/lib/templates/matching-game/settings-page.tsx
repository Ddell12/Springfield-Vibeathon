"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { MatchingGameEditor } from "./editor";
import type { MatchingGameConfig } from "./schema";
import { MatchingGameConfigSchema } from "./schema";

export function MatchingGameSettingsPage({
  config: initialConfig,
  data,
}: PageProps<MatchingGameConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = MatchingGameConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return (
    <div className="overflow-y-auto">
      <MatchingGameEditor
        config={config}
        onChange={(updated) => data.set("config", updated)}
      />
    </div>
  );
}
