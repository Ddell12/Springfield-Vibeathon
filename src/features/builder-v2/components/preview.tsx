import type { FragmentResult } from "../lib/schema";
import { FragmentWeb } from "./fragment-web";

type PreviewProps = {
  fragment: FragmentResult | null;
  sandboxUrl: string | null;
  isLoading: boolean;
};

export function Preview({ fragment, sandboxUrl, isLoading }: PreviewProps) {
  return (
    <div className="flex flex-col h-full bg-surface-container-low">
      {/* Header bar */}
      <div className="h-10 flex items-center px-4 bg-surface-container-lowest shrink-0">
        {fragment ? (
          <span className="text-sm font-semibold text-on-surface truncate">
            {fragment.title}
          </span>
        ) : (
          <span className="text-sm text-on-surface-variant">Preview</span>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface-container-low"
            aria-label="Loading preview"
          >
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary" />
            <p className="text-sm text-on-surface-variant">Building your app...</p>
          </div>
        ) : fragment && sandboxUrl ? (
          <FragmentWeb url={sandboxUrl} title={fragment.title} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <span className="text-4xl">&#9654;</span>
            <p className="text-sm font-medium">Your app preview will appear here</p>
            <p className="text-xs opacity-70">Describe a therapy tool in the chat to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
