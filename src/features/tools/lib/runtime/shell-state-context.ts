import { createContext, useContext } from "react";

import type { DifficultyLevel } from "./use-app-shell-state";

export interface ShellState {
  difficulty: DifficultyLevel;
  soundsEnabled: boolean;
}

export const ShellStateContext = createContext<ShellState | null>(null);

/** Returns null when rendered outside RuntimeShell (e.g. in tests without a provider). */
export function useShellState(): ShellState | null {
  return useContext(ShellStateContext);
}
