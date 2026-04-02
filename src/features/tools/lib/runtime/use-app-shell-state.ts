"use client";

import { useCallback, useState } from "react";

import type { AppShellConfig } from "./app-shell-types";

export type DifficultyLevel = "easy" | "medium" | "hard";

function useLocalStorageState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [key]
  );

  return [value, set] as const;
}

export function useAppShellState({
  storageKey,
  shell,
}: {
  storageKey: string;
  shell: AppShellConfig;
}) {
  const [difficulty, setDifficulty] = useLocalStorageState<DifficultyLevel>(
    `${storageKey}:difficulty`,
    "medium"
  );
  const [soundsEnabled, setSoundsEnabled] = useLocalStorageState<boolean>(
    `${storageKey}:sounds`,
    shell.enableSounds
  );
  const [progress, setProgress] = useLocalStorageState<number>(
    `${storageKey}:progress`,
    0
  );

  return {
    difficulty,
    setDifficulty,
    soundsEnabled,
    setSoundsEnabled,
    progress,
    setProgress,
  };
}
