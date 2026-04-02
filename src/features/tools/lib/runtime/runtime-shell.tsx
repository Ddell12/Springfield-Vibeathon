"use client";

import { X } from "lucide-react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import type { AppShellConfig } from "./app-shell-types";
import { useAppShellState } from "./use-app-shell-state";

export function RuntimeShell({
  mode,
  shell,
  title,
  onExit,
  children,
}: {
  mode: "preview" | "published";
  shell: AppShellConfig;
  title: string;
  onExit?: () => void;
  children: React.ReactNode;
}) {
  const state = useAppShellState({
    storageKey: `${mode}:${title}`,
    shell,
  });

  const hasSidebar =
    shell.enableDifficulty || shell.enableSounds || shell.enableProgress;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {mode === "preview" ? "Live preview" : "Published app"}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExit}
          aria-label={mode === "preview" ? "Exit fullscreen" : "Exit app"}
        >
          <X className="mr-1 h-4 w-4" />
          Exit
        </Button>
      </header>
      <div
        className={cn(
          "gap-4 px-4 pb-6 pt-4",
          hasSidebar ? "grid lg:grid-cols-[280px_minmax(0,1fr)]" : "block"
        )}
      >
        {hasSidebar && (
          <aside className="flex flex-col gap-4 rounded-2xl bg-muted/30 p-4">
            {shell.enableDifficulty && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Difficulty
                </label>
                <select
                  value={state.difficulty}
                  onChange={(e) =>
                    state.setDifficulty(
                      e.target.value as "easy" | "medium" | "hard"
                    )
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            )}
            {shell.enableSounds && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Sounds
                </label>
                <input
                  type="checkbox"
                  checked={state.soundsEnabled}
                  onChange={(e) => state.setSoundsEnabled(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </div>
            )}
            {shell.enableProgress && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Progress
                </label>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${state.progress}%` }}
                    role="progressbar"
                    aria-valuenow={state.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {state.progress}% complete
                </p>
              </div>
            )}
          </aside>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}
