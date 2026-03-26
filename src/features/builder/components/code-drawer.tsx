"use client";

import { useMemo, useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

import type { StreamingFile } from "../hooks/use-streaming";

interface CodeDrawerProps {
  files: StreamingFile[];
  onClose: () => void;
}

interface FileTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: FileTreeNode[];
}

function buildFileTree(files: StreamingFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const existingNode = currentLevel.find((n) => n.name === part);

      if (existingNode) {
        currentLevel = existingNode.children;
      } else {
        const newNode: FileTreeNode = {
          name: part,
          path: isLast ? file.path : parts.slice(0, i + 1).join("/"),
          isDir: !isLast,
          children: [],
        };
        currentLevel.push(newNode);
        currentLevel = newNode.children;
      }
    }
  }

  return root;
}

function FileTreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => {
          if (node.isDir) {
            setExpanded(!expanded);
          } else {
            onSelect(node.path);
          }
        }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors",
          selectedPath === node.path
            ? "bg-primary/10 text-primary"
            : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.isDir ? (
          <>
            <MaterialIcon
              icon="chevron_right"
              className={cn(
                "text-sm flex-shrink-0 transition-transform",
                expanded && "rotate-90"
              )}
            />
            <MaterialIcon icon="folder" className="text-sm flex-shrink-0 text-primary/60" />
          </>
        ) : (
          <>
            <span className="w-3" />
            <MaterialIcon icon="description" className="text-sm flex-shrink-0 text-on-surface-variant/60" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {node.isDir && expanded && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CodeDrawer({ files, onClose }: CodeDrawerProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(
    files[0]?.path ?? null
  );
  const [activeTab, setActiveTab] = useState<"files" | "search">("files");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedFile = files.find((f) => f.path === selectedPath) ?? null;
  const fileTree = useMemo(() => buildFileTree(files), [files]);

  const filteredFiles = searchQuery
    ? files.filter((f) =>
        f.path.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="flex h-full flex-col bg-surface-container-lowest">
      {/* Top bar */}
      <div className="flex h-10 items-center justify-between border-b border-outline-variant/30 px-4">
        <div className="w-16" />
        <span className="text-xs font-semibold text-on-surface">Code</span>
        <button
          onClick={onClose}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
        >
          Close
          <MaterialIcon icon="close" className="text-sm" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* File sidebar */}
        <div className="flex w-56 flex-shrink-0 flex-col border-r border-outline-variant/30 bg-surface-container-low/50">
          {/* Tabs: Files / Search */}
          <div className="flex border-b border-outline-variant/30">
            <button
              onClick={() => setActiveTab("files")}
              className={cn(
                "flex-1 py-2 text-xs font-medium transition-colors",
                activeTab === "files"
                  ? "border-b-2 border-primary text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Files
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={cn(
                "flex-1 py-2 text-xs font-medium transition-colors",
                activeTab === "search"
                  ? "border-b-2 border-primary text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Search
            </button>
          </div>

          {activeTab === "search" && (
            <div className="p-2">
              <div className="relative">
                <MaterialIcon icon="search" className="absolute left-2 top-1/2 text-sm -translate-y-1/2 text-on-surface-variant" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files&#8230;"
                  className="h-7 pl-7 text-xs"
                />
              </div>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="py-1">
              {activeTab === "files" ? (
                fileTree.map((node) => (
                  <FileTreeItem
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedPath={selectedPath}
                    onSelect={setSelectedPath}
                  />
                ))
              ) : searchQuery ? (
                filteredFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => {
                      setSelectedPath(file.path);
                      setActiveTab("files");
                    }}
                    className={cn(
                      "flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs transition-colors",
                      selectedPath === file.path
                        ? "bg-primary/10 text-primary"
                        : "text-on-surface-variant hover:bg-surface-container-low"
                    )}
                  >
                    <MaterialIcon icon="description" className="text-sm flex-shrink-0" />
                    <span className="truncate">{file.path}</span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-4 text-xs text-on-surface-variant">
                  Type to search files&#8230;
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Source code viewer */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {selectedFile ? (
            <>
              <div className="flex items-center border-b border-outline-variant/30 px-4 py-1.5">
                <span className="text-xs text-on-surface-variant">
                  {selectedFile.path}
                </span>
              </div>
              <ScrollArea className="flex-1">
                <pre className="p-4 font-mono text-xs leading-relaxed text-on-surface">
                  {selectedFile.contents}
                </pre>
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-on-surface-variant">
                Select a file to view its contents
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
