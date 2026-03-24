"use client";

import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { Skeleton } from "@/shared/components/ui/skeleton";

import { ToolConfigSchema } from "../types/tool-configs";
import { CommunicationBoard } from "./communication-board";
import { TokenBoard } from "./token-board";
import { VisualSchedule } from "./visual-schedule";

// Lazy variants are available for direct use where code-splitting is needed.
// The renderer itself uses direct imports so vi.mock works in tests.
export const LazyVisualSchedule = lazy(() =>
  import("./visual-schedule").then((m) => ({ default: m.VisualSchedule })),
);

export const LazyTokenBoard = lazy(() =>
  import("./token-board").then((m) => ({ default: m.TokenBoard })),
);

export const LazyCommunicationBoard = lazy(() =>
  import("./communication-board").then((m) => ({
    default: m.CommunicationBoard,
  })),
);

function ToolSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  );
}

function ToolRendererInner({ config }: { config: unknown }) {
  const result = ToolConfigSchema.safeParse(config);
  if (!result.success) {
    if (process.env.NODE_ENV === "development") {
      console.warn("ToolRenderer: config validation failed", JSON.stringify(result.error.issues));
      console.warn("ToolRenderer: received config", JSON.stringify(config));
    }
    return (
      <div className="p-8 text-center text-muted">
        This tool couldn&apos;t be displayed.
      </div>
    );
  }

  switch (result.data.type) {
    case "visual-schedule":
      return (
        <Suspense fallback={<ToolSkeleton />}>
          <VisualSchedule config={result.data} />
        </Suspense>
      );
    case "token-board":
      return (
        <Suspense fallback={<ToolSkeleton />}>
          <TokenBoard config={result.data} />
        </Suspense>
      );
    case "communication-board":
      return (
        <Suspense fallback={<ToolSkeleton />}>
          <CommunicationBoard config={result.data} />
        </Suspense>
      );
    case "choice-board":
      return (
        <div className="p-8 text-center">
          <p className="font-headline text-xl font-bold text-primary">
            {result.data.title}
          </p>
          <p className="text-on-surface-variant mt-2">
            Choice Board — coming soon
          </p>
        </div>
      );
    case "first-then-board":
      return (
        <div className="p-8 text-center">
          <p className="font-headline text-xl font-bold text-primary">
            {result.data.title}
          </p>
          <p className="text-on-surface-variant mt-2">
            First-Then Board — coming soon
          </p>
        </div>
      );
    default:
      return <div className="p-4 text-muted">Tool type coming soon</div>;
  }
}

function ErrorFallback() {
  return (
    <div className="p-8 text-center text-muted">
      This tool couldn&apos;t be displayed.
    </div>
  );
}

export function ToolRenderer({ config }: { config: unknown }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ToolRendererInner config={config} />
    </ErrorBoundary>
  );
}
