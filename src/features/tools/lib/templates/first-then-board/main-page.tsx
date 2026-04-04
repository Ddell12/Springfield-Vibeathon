"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { FirstThenBoardRuntime } from "./runtime";
import type { FirstThenBoardConfig } from "./schema";
import { FirstThenBoardConfigSchema } from "./schema";

export function FirstThenBoardMainPage({
  data,
  config: initialConfig,
  ...rest
}: PageProps<FirstThenBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = FirstThenBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return <FirstThenBoardRuntime {...rest} config={config} />;
}
