"use client";

import { useMemo } from "react";

import type { PageProps } from "@/features/tools/lib/registry";
import {
  ShellStateContext,
  useShellState,
} from "@/features/tools/lib/runtime/shell-state-context";
import type { DifficultyLevel } from "@/features/tools/lib/runtime/use-app-shell-state";

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

  // Read difficulty from persistent data store (set by settings page)
  const shellState = useShellState();
  const storedDifficulty = data.get<DifficultyLevel | null>("difficulty", null);
  const overriddenState = useMemo(
    () => ({
      difficulty: storedDifficulty ?? shellState?.difficulty ?? "medium",
      soundsEnabled: shellState?.soundsEnabled ?? true,
    }),
    [storedDifficulty, shellState]
  );

  return (
    <ShellStateContext.Provider value={overriddenState}>
      <MatchingGameRuntime {...rest} config={config} />
    </ShellStateContext.Provider>
  );
}
