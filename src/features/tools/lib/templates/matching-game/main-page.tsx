"use client";

import type { PageProps } from "@/features/tools/lib/registry";

import { MatchingGameRuntime } from "./runtime";
import type { MatchingGameConfig } from "./schema";
import { MatchingGameConfigSchema } from "./schema";

export function MatchingGameMainPage({
  data,
  config: initialConfig,
  ...rest
}: PageProps<MatchingGameConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = MatchingGameConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  return <MatchingGameRuntime {...rest} config={config} />;
}
