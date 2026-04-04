"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { AACBoardRuntime } from "./runtime";
import type { AACBoardConfig } from "./schema";
import { AACBoardConfigSchema } from "./schema";

export function AACBoardMainPage({
  data,
  config: initialConfig,
  ...rest
}: PageProps<AACBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = AACBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return <AACBoardRuntime {...rest} config={config} />;
}
