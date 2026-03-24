"use client";

import { ErrorBoundary } from "react-error-boundary";
import { ToolConfigSchema, type ToolConfig } from "../types/tool-configs";

function ToolRendererInner({ config }: { config: unknown }) {
  const result = ToolConfigSchema.safeParse(config);
  if (!result.success) {
    return <div className="p-8 text-center text-muted">This tool couldn&apos;t be displayed.</div>;
  }

  switch (result.data.type) {
    case "visual-schedule":
      return <div className="p-4">Visual Schedule: {result.data.title}</div>;
    case "token-board":
      return <div className="p-4">Token Board: {result.data.title}</div>;
    case "communication-board":
      return <div className="p-4">Communication Board: {result.data.title}</div>;
    case "choice-board":
      return <div className="p-4">Choice Board: {result.data.title}</div>;
    case "first-then-board":
      return <div className="p-4">First-Then Board: {result.data.title}</div>;
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
