"use client";

import { Highlight, themes } from "prism-react-renderer";
import { useState } from "react";

import { cn } from "@/core/utils";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { useSessionFiles } from "../hooks/use-session";

function getLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    tsx: "tsx",
    ts: "typescript",
    jsx: "jsx",
    js: "javascript",
    css: "css",
    json: "json",
    html: "markup",
    md: "markdown",
  };
  return map[ext ?? ""] ?? "typescript";
}

function getFileIcon(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    tsx: "code",
    ts: "code",
    jsx: "code",
    js: "code",
    css: "palette",
    json: "data_object",
    html: "web",
    md: "description",
  };
  return map[ext ?? ""] ?? "draft";
}

interface CodePanelProps {
  sessionId: Id<"sessions"> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session?: any;
}

export function CodePanel({ sessionId, session }: CodePanelProps) {
  const files = useSessionFiles(sessionId);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const selectedFile = files?.find((f: Doc<"files">) => f.path === selectedPath);

  const isGenerating =
    session &&
    ["phase_generating", "phase_implementing"].includes(session.state);

  if (!sessionId || !files || files.length === 0) {
    if (isGenerating) {
      return (
        <div className="flex h-full flex-col bg-surface-container-low p-6">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Generating files...
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full flex-col items-center justify-center bg-surface-container-low p-8">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-highest">
          <span className="material-symbols-outlined text-3xl text-outline">
            code
          </span>
        </div>
        <p className="text-sm text-on-surface-variant">
          Files will appear here as your app is built.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-surface-container-low">
      {/* File explorer sidebar */}
      <div className="w-48 shrink-0 bg-surface-container-lowest">
        <div className="p-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          Files
        </div>
        <ScrollArea className="h-[calc(100%-2.5rem)]">
          {files.map((file: Doc<"files">) => (
            <button
              key={file._id}
              onClick={() => setSelectedPath(file.path)}
              className={cn(
                "block w-full truncate px-3 py-2 text-left text-xs transition-colors",
                "hover:bg-surface-container-high",
                selectedPath === file.path
                  ? "bg-primary/5 font-medium text-primary"
                  : "text-on-surface-variant"
              )}
              title={file.path}
            >
              <span className="material-symbols-outlined mr-1.5 align-middle text-sm">
                {getFileIcon(file.path)}
              </span>
              {file.path.split("/").pop()}
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* File contents */}
      <div className="flex-1 overflow-hidden bg-surface-container-low">
        {selectedFile ? (
          <ScrollArea className="h-full">
            <div className="bg-surface-container-high px-4 py-2 text-xs font-medium text-on-surface-variant">
              {selectedFile.path}
            </div>
            <Highlight
              theme={themes.nightOwl}
              code={selectedFile.contents}
              language={getLanguage(selectedFile.path)}
            >
              {({ style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  style={{ ...style, background: "transparent" }}
                  className="p-4 text-xs leading-relaxed"
                >
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })}>
                      <span className="mr-4 inline-block w-8 select-none text-right text-on-surface-variant/30">
                        {i + 1}
                      </span>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          </ScrollArea>
        ) : (
          <div className="flex h-full items-center justify-center text-on-surface-variant">
            <p className="text-sm">Select a file to view its contents.</p>
          </div>
        )}
      </div>
    </div>
  );
}
