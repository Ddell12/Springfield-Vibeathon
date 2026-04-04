"use client";

import type { PageProps } from "@/features/tools/lib/registry";
import type { DifficultyLevel } from "@/features/tools/lib/runtime/use-app-shell-state";

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

  const difficulty = data.get<DifficultyLevel>("difficulty", "medium");

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="mg-difficulty"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Difficulty
        </label>
        <select
          id="mg-difficulty"
          value={difficulty}
          onChange={(e) =>
            data.set("difficulty", e.target.value as DifficultyLevel)
          }
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="easy">Easy (2 pairs)</option>
          <option value="medium">Medium (4 pairs)</option>
          <option value="hard">Hard (all pairs)</option>
        </select>
      </div>

      <MatchingGameEditor
        config={config}
        onChange={(updated) => data.set("config", updated)}
      />
    </div>
  );
}
