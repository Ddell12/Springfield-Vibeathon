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
    ["generating", "implementing"].includes(session.state);

  if (!sessionId || !files || files.length === 0) {
    if (isGenerating) {
      return (
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      );
    }
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Files will appear here as your app is built.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* File explorer sidebar */}
      <div className="w-48 shrink-0 border-r">
        <div className="p-2 text-xs font-medium uppercase text-muted-foreground">
          Files
        </div>
        <ScrollArea className="h-[calc(100%-2rem)]">
          {files.map((file: Doc<"files">) => (
            <button
              key={file._id}
              onClick={() => setSelectedPath(file.path)}
              className={cn(
                "block w-full truncate px-3 py-1.5 text-left text-xs",
                "hover:bg-muted",
                selectedPath === file.path && "bg-muted font-medium"
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
      <div className="flex-1 overflow-hidden">
        {selectedFile ? (
          <ScrollArea className="h-full">
            <div className="border-b p-2 text-xs text-muted-foreground">
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
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a file to view its contents.</p>
          </div>
        )}
      </div>
    </div>
  );
}
