// src/features/tools/lib/runtime/runtime-shell.tsx
"use client";

import { CircleHelp, X } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import type { AppShellConfig } from "./app-shell-types";
import type { PageDefinition, RuntimeProps } from "../registry";
import type { TemplateDataStore } from "./page-types";
import { ShellStateContext } from "./shell-state-context";
import { useAppShellState } from "./use-app-shell-state";

// --- Children-based props (builder preview, contract tests) ---
interface ChildrenShellProps {
  mode: "preview" | "published";
  shell: AppShellConfig;
  title: string;
  onExit?: () => void;
  children: React.ReactNode;
  pages?: never;
  runtimeProps?: never;
  data?: never;
}

// --- Pages-based props (live runtime with tabs) ---
interface PagesShellProps {
  mode: "preview" | "published";
  shell: AppShellConfig;
  title: string;
  onExit?: () => void;
  children?: never;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pages: PageDefinition<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runtimeProps: RuntimeProps<any>;
  data: TemplateDataStore;
}

type RuntimeShellProps = ChildrenShellProps | PagesShellProps;

export function RuntimeShell({
  mode,
  shell,
  title,
  onExit,
  children,
  pages,
  runtimeProps,
  data,
}: RuntimeShellProps) {
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [activePage, setActivePage] = useState("main");

  const state = useAppShellState({
    storageKey: `${mode}:${title}`,
    shell,
  });

  const shellContextValue = useMemo(
    () => ({ difficulty: state.difficulty, soundsEnabled: state.soundsEnabled }),
    [state.difficulty, state.soundsEnabled]
  );

  // Audience filter: hide slp-only pages in published mode
  const visiblePages = useMemo(
    () =>
      pages?.filter((p) =>
        p.audience === "slp" ? mode !== "published" : true
      ) ?? [],
    [pages, mode]
  );

  const currentPage = visiblePages.find((p) => p.id === activePage) ?? visiblePages[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header — unchanged */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {mode === "preview" ? "Live preview" : "Published app"}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {shell.enableInstructions && shell.instructionsText ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInstructionsOpen(true)}
              aria-label="Open instructions"
            >
              <CircleHelp className="h-4 w-4" />
              <span className="sr-only">Instructions</span>
            </Button>
          ) : null}
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
        </div>
      </header>

      {/* Tab bar — only shown when pages provided and more than 1 visible */}
      {visiblePages.length > 1 && (
        <nav role="tablist" className="sticky top-[57px] z-10 flex border-b border-border bg-background/95 backdrop-blur">
          {visiblePages.map((page) => {
            const Icon = page.icon;
            const isActive = page.id === (currentPage?.id ?? "main");
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => setActivePage(page.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-selected={isActive}
                role="tab"
              >
                <Icon className="h-3.5 w-3.5" />
                {page.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* Content */}
      <ShellStateContext.Provider value={shellContextValue}>
        {/* Children-based (builder preview / contract tests) */}
        {children !== undefined && (
          <div className="px-4 pb-6 pt-4">{children}</div>
        )}

        {/* Pages-based (live runtime) */}
        {currentPage && runtimeProps && data && (
          <div className="pb-6">
            <currentPage.component {...runtimeProps} data={data} />
          </div>
        )}
      </ShellStateContext.Provider>

      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>How to use this app</DialogTitle>
            <DialogDescription className="sr-only">
              Instructions for the current app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            {shell.instructionsText
              ?.split("\n")
              .filter((line) => line.trim().length > 0)
              .map((line) => (
                <p key={line}>{line}</p>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
