"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { TokenBoardRuntime } from "./runtime";
import type { TokenBoardConfig } from "./schema";
import { TokenBoardConfigSchema } from "./schema";

export function TokenBoardMainPage({
  data,
  config: initialConfig,
  ...rest
}: PageProps<TokenBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = TokenBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return <TokenBoardRuntime {...rest} config={config} />;
}
