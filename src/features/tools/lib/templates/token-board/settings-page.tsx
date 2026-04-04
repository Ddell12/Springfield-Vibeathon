"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { TokenBoardEditor } from "./editor";
import type { TokenBoardConfig } from "./schema";
import { TokenBoardConfigSchema } from "./schema";

export function TokenBoardSettingsPage({
  config: initialConfig,
  data,
}: PageProps<TokenBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = TokenBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return (
    <div className="overflow-y-auto">
      <TokenBoardEditor
        config={config}
        onChange={(updated) => data.set("config", updated)}
      />
    </div>
  );
}
