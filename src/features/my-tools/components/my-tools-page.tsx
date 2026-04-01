"use client";

import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ROUTES } from "@/core/routes";
import { cn } from "@/core/utils";

const DeleteConfirmationDialog = dynamic(
  () => import("@/shared/components/delete-confirmation-dialog").then((m) => ({ default: m.DeleteConfirmationDialog })),
  { ssr: false }
);
const DuplicateToolDialog = dynamic(
  () => import("@/features/tools/components/builder/duplicate-tool-dialog").then((m) => ({ default: m.DuplicateToolDialog })),
  { ssr: false }
);

import { MaterialIcon } from "@/shared/components/material-icon";
import { ProjectCard } from "@/shared/components/project-card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type SortOption = "recent" | "alphabetical";

const PAGE_SIZE = 12;

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Last Edited", value: "recent" },
  { label: "A–Z", value: "alphabetical" },
];

interface MyToolsPageProps {
  embedded?: boolean;
}

export function MyToolsPage({ embedded = false }: MyToolsPageProps) {
  const allTools = useQuery(api.tools.listBySLP);
  const archiveTool = useMutation(api.tools.archive);
  const updateTool = useMutation(api.tools.update);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"app_instances">; title: string } | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<Id<"app_instances"> | null>(null);
  const [renamingId, setRenamingId] = useState<Id<"app_instances"> | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const pageParam = searchParams.get("page");
  const parsedPage = Number.parseInt(pageParam ?? "", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const renameInputRef = useRef<HTMLInputElement>(null);

  // Debounce search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const tools = useMemo(() => {
    if (!allTools) return undefined;

    let results = allTools.filter((t) => t.status !== "archived");

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      results = results.filter((t) => t.title.toLowerCase().includes(q));
    }

    switch (sortBy) {
      case "alphabetical":
        results = [...results].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "recent":
      default:
        results = [...results].sort((a, b) => b._creationTime - a._creationTime);
        break;
    }

    return results;
  }, [allTools, debouncedSearch, sortBy]);

  const totalPages = tools ? Math.max(1, Math.ceil(tools.length / PAGE_SIZE)) : 1;
  const safePage = Math.min(page, totalPages);
  const pageItems = tools?.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleRenameSubmit = useCallback((toolId: Id<"app_instances">) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      const existing = allTools?.find((t) => t._id === toolId);
      if (existing) {
        updateTool({ id: toolId, configJson: existing.configJson, title: trimmed }).catch(() => {
          toast.error("Failed to rename tool");
        });
      }
    }
    setRenamingId(null);
  }, [renameValue, updateTool, allTools]);

  if (tools === undefined) {
    return (
      <div className={!embedded ? "max-w-7xl mx-auto px-8 pt-12 pb-24" : "py-4"}>
        <div data-testid="loading-skeleton" className="animate-pulse space-y-6">
          <div className="h-10 bg-surface-container-low rounded-xl w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-surface-container-low rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (allTools && allTools.filter((t) => t.status !== "archived").length === 0) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center gap-6",
        !embedded ? "max-w-7xl mx-auto px-8 pt-12 pb-24 min-h-[60vh]" : "py-8",
      )}>
        <div className="text-center">
          <MaterialIcon icon="dashboard_customize" className="text-6xl text-primary/40 mb-4" />
          {!embedded && (
            <h1 className="font-headline font-normal text-3xl text-on-surface mb-3">
              No apps yet
            </h1>
          )}
          <p className="text-on-surface-variant text-lg mb-8">
            Create a therapy tool and it will appear here.
          </p>
          <Link
            href="/tools/new"
            className="bg-primary-gradient text-white px-8 py-4 rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95 inline-flex"
          >
            <MaterialIcon icon="add_circle" />
            Create a Tool
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 pt-12 pb-24">
      {!embedded && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="font-headline font-normal text-4xl md:text-5xl text-on-surface tracking-tight mb-2">
              My Apps
            </h1>
            <p className="text-on-surface-variant text-lg">
              {tools?.length ?? 0} app{(tools?.length ?? 0) !== 1 ? "s" : ""} created
            </p>
          </div>
          <Link
            href="/tools/new"
            className="bg-primary-gradient text-white px-8 py-4 rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95"
          >
            <MaterialIcon icon="add_circle" />
            Create New Tool
          </Link>
        </div>
      )}

      {/* Search + Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <MaterialIcon
            icon="search"
            size="sm"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <Input
            type="text"
            placeholder="Search apps"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface-container-low"
            aria-label="Search apps"
          />
        </div>
        <ToggleGroup
          type="single"
          value={sortBy}
          onValueChange={(value) => {
            if (value) setSortBy(value as SortOption);
          }}
          className="rounded-xl bg-surface-container-low p-1"
        >
          {SORT_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300",
                "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
                "data-[state=on]:bg-primary data-[state=on]:text-on-primary data-[state=on]:shadow-sm",
              )}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Results */}
      {tools.length === 0 ? (
        <div className="py-20 text-center" data-testid="no-search-results">
          <MaterialIcon icon="search_off" className="text-5xl text-on-surface-variant/40 mb-4" />
          <p className="text-on-surface-variant text-lg">No apps match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pageItems?.map((tool, i) => (
            <div key={tool._id} className="relative">
              {renamingId === tool._id ? (
                <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-[0_12px_32px_rgba(25,28,32,0.06)]">
                  <div className="h-48 w-full rounded-xl bg-surface-container-low mb-5" />
                  <Input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(tool._id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSubmit(tool._id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="text-lg font-semibold"
                    aria-label="Rename app"
                    data-testid="rename-input"
                  />
                </div>
              ) : (
                <>
                  <ProjectCard
                    project={{
                      id: tool._id,
                      title: tool.title,
                      thumbnail: null,
                      updatedAt: tool._creationTime,
                      userInitial: tool.title.charAt(0).toUpperCase(),
                      userColor: "bg-tertiary-fixed text-on-surface",
                    }}
                    index={i}
                    href={ROUTES.TOOLS_EDIT(tool._id)}
                    onDelete={() => setDeleteTarget({ id: tool._id, title: tool.title })}
                    onRename={() => {
                      setRenamingId(tool._id);
                      setRenameValue(tool.title);
                    }}
                    onDuplicate={() => setDuplicateTarget(tool._id)}
                  />
                  {tool.status === "published" && tool.shareToken && (
                    <Button
                      variant="gradient"
                      size="sm"
                      className="absolute bottom-4 right-4 z-10 rounded-full px-4 text-xs font-semibold shadow-lg hover:shadow-xl active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/apps/${tool.shareToken}`, "_blank", "noopener,noreferrer");
                      }}
                      aria-label="Open tool"
                    >
                      <MaterialIcon icon="open_in_new" size="sm" />
                      Open Tool
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => router.replace(`/library?tab=my-apps&page=${safePage - 1}`, { scroll: false })}
          >
            Previous
          </Button>
          <span className="text-sm text-on-surface-variant">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => router.replace(`/library?tab=my-apps&page=${safePage + 1}`, { scroll: false })}
          >
            Next
          </Button>
        </div>
      )}

      {/* CTA Section */}
      <section className="mt-20 p-10 rounded-xl bg-surface-container-lowest ring-1 ring-outline-variant/10 relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 md:w-2/3">
          <h2 className="font-headline font-normal text-3xl text-on-surface mb-4">
            Need a new therapy tool?
          </h2>
          <p className="text-on-surface-variant text-lg max-w-xl">
            Pick a template, describe what you need, and Vocali will fill in the details.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/tools/new"
              className="bg-primary text-on-primary px-6 py-3 rounded-lg font-semibold hover:bg-primary-container transition-colors"
            >
              Create a Tool
            </Link>
            <Link
              href="/library?tab=templates"
              className="text-primary font-semibold px-6 py-3 rounded-lg hover:bg-surface-container-high transition-colors"
            >
              Browse Templates
            </Link>
          </div>
        </div>
        <div className="relative z-10 md:w-1/3 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shadow-xl">
            <MaterialIcon icon="auto_awesome" className="text-5xl" />
          </div>
        </div>
      </section>

      <DeleteConfirmationDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        projectName={deleteTarget?.title ?? ""}
        onConfirmDelete={() => {
          if (deleteTarget) {
            archiveTool({ id: deleteTarget.id });
            setDeleteTarget(null);
          }
        }}
      />

      {duplicateTarget && (
        <DuplicateToolDialog
          appInstanceId={duplicateTarget}
          open={!!duplicateTarget}
          onOpenChange={(open) => { if (!open) setDuplicateTarget(null); }}
        />
      )}
    </div>
  );
}
