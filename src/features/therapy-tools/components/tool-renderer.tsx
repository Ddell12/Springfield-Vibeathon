"use client";

import { ErrorBoundary } from "react-error-boundary";
import { ToolConfigSchema, type ToolConfig } from "../types/tool-configs";
import { TokenBoard } from "./token-board";
import { VisualSchedule } from "./visual-schedule";
import { CommunicationBoard } from "./communication-board";

function ToolRendererInner({ config }: { config: unknown }) {
  const result = ToolConfigSchema.safeParse(config);
  if (!result.success) {
    return <div className="p-8 text-center text-muted">This tool couldn&apos;t be displayed.</div>;
  }

  switch (result.data.type) {
    case "visual-schedule":
      return <VisualSchedule config={result.data} />;
    case "token-board":
      return <TokenBoard config={result.data} />;
    case "communication-board":
      return <CommunicationBoard config={result.data} />;
    case "choice-board":
      return (
        <div className="p-8 text-center">
          <p className="font-headline text-xl font-bold text-primary">{result.data.title}</p>
          <p className="text-on-surface-variant mt-2">Choice Board — coming soon</p>
        </div>
      );
    case "first-then-board":
      return (
        <div className="p-8 text-center">
          <p className="font-headline text-xl font-bold text-primary">{result.data.title}</p>
          <p className="text-on-surface-variant mt-2">First-Then Board — coming soon</p>
        </div>
      );
    default:
      return <div className="p-4 text-muted">Tool type coming soon</div>;
  }
}

function ErrorFallback() {
  return <div className="p-8 text-center text-muted">This tool couldn&apos;t be displayed.</div>;
}

export function ToolRenderer({ config }: { config: unknown }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ToolRendererInner config={config} />
    </ErrorBoundary>
  );
}
