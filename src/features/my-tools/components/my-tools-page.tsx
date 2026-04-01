"use client";

import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
const DeleteConfirmationDialog = dynamic(
  () => import("@/shared/components/delete-confirmation-dialog").then((m) => ({ default: m.DeleteConfirmationDialog })),
  { ssr: false }
);
import { FullscreenAppView } from "@/shared/components/fullscreen-app-view";
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
  const sessions = useQuery(api.sessions.list);
  const archiveSession = useMutation(api.sessions.archive);
  const duplicateSession = useMutation(api.sessions.duplicateSession);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"sessions">; title: string } | null>(null);
  const [renamingId, setRenamingId] = useState<Id<"sessions"> | null>(null);
  const [fullscreenSessionId, setFullscreenSessionId] = useState<Id<"sessions"> | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const fullscreenBundle = useQuery(
    api.generated_files.getByPath,
    fullscreenSessionId
      ? { sessionId: fullscreenSessionId, path: "_bundle.html" }
      : "skip"
  );

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

  // Handle play button feedback — show toast when bundle doesn't exist
  useEffect(() => {
    if (fullscreenSessionId && fullscreenBundle === null) {
      toast.error("No preview available yet. Try opening it in the builder.");
      setFullscreenSessionId(null); // eslint-disable-line react-hooks/set-state-in-effect -- clear on missing bundle
    }
  }, [fullscreenSessionId, fullscreenBundle]);

  const filteredSessions = useMemo(() => {
    if (!sessions) return undefined;

    let results = [...sessions];

    // Filter by search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      results = results.filter((s) => s.title.toLowerCase().includes(q));
    }

    // Sort
    switch (sortBy) {
      case "alphabetical":
        results.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "recent":
      default:
        // Already sorted desc by _creationTime from query
        break;
    }

    return results;
  }, [sessions, debouncedSearch, sortBy]);

  const totalPages = filteredSessions ? Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE)) : 1;
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredSessions?.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleRenameSubmit = (sessionId: Id<"sessions">) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed.length > 0) {
      updateTitle({ sessionId, title: trimmed });
    }
    setRenamingId(null);
  };

  const handleDuplicate = async (sessionId: Id<"sessions">) => {
    const newId = await duplicateSession({ sessionId });
    router.push(`/builder/${newId}`);
  };

  if (filteredSessions === undefined) {
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

  if (sessions && sessions.length === 0) {
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
            Describe a therapy activity and Vocali will build a visual app for you.
          </p>
          <Link
            href="/builder"
            className="bg-primary-gradient text-white px-8 py-4 rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95 inline-flex"
          >
            <MaterialIcon icon="add_circle" />
            Start Building
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
              {sessions!.length} app{sessions!.length !== 1 ? "s" : ""} created
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectionMode(!selectionMode);
                setSelectedIds(new Set());
              }}
              className="text-on-surface-variant hover:text-on-surface"
            >
              {selectionMode ? "Cancel" : "Select"}
            </Button>
            <Link
              href="/builder"
              className="bg-primary-gradient text-white px-8 py-4 rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95"
            >
              <MaterialIcon icon="add_circle" />
              Create New App
            </Link>
          </div>
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
            placeholder="Search your apps..."
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
      {filteredSessions.length === 0 ? (
        <div className="py-20 text-center" data-testid="no-search-results">
          <MaterialIcon icon="search_off" className="text-5xl text-on-surface-variant/40 mb-4" />
          <p className="text-on-surface-variant text-lg">
            No apps match your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pageItems?.map((session, i) => (
            <div
              key={session._id}
              className="relative"
              onClick={selectionMode ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSelection(session._id);
              } : undefined}
            >
              {renamingId === session._id ? (
                <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-[0_12px_32px_rgba(25,28,32,0.06)]">
                  <div className="h-48 w-full rounded-xl bg-surface-container-low mb-5" />
                  <Input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(session._id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSubmit(session._id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="text-lg font-semibold"
                    aria-label="Rename app"
                    data-testid="rename-input"
                  />
                </div>
              ) : (
                <>
                  {selectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(session._id);
                      }}
                      className={cn(
                        "absolute left-3 top-3 z-20 flex h-6 w-6 items-center justify-center rounded-md border-2 shadow-sm transition-all",
                        selectedIds.has(session._id)
                          ? "border-primary bg-primary"
                          : "border-primary bg-white"
                      )}
                      aria-label={selectedIds.has(session._id) ? "Deselect app" : "Select app"}
                    >
                      {selectedIds.has(session._id) && (
                        <MaterialIcon icon="check" size="xs" className="text-white" />
                      )}
                    </button>
                  )}
                  <ProjectCard
                    project={{
                      id: session._id,
                      title: session.title,
                      thumbnail: session.previewUrl ?? null,
                      updatedAt: session._creationTime,
                      userInitial: session.title.charAt(0).toUpperCase(),
                      userColor: "bg-tertiary-fixed text-on-surface",
                    }}
                    index={i}
                    onDelete={() => setDeleteTarget({ id: session._id, title: session.title })}
                    onRename={() => {
                      setRenamingId(session._id);
                      setRenameValue(session.title);
                    }}
                    onDuplicate={() => handleDuplicate(session._id)}
                  />
                  {session.state === "generating" && (
                    <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                      </span>
                      Building...
                    </div>
                  )}
                  {!renamingId && !selectionMode && session.state !== "generating" && (
                    <Button
                      variant="gradient"
                      size="sm"
                      onClick={() => setFullscreenSessionId(session._id)}
                      className="absolute bottom-4 right-4 rounded-full px-4 text-xs font-semibold shadow-lg hover:shadow-xl active:scale-95"
                      aria-label="Play app fullscreen"
                      title="Play fullscreen"
                    >
                      <MaterialIcon icon="play_arrow" size="sm" />
                      Play
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <section className="mt-20 p-10 rounded-xl bg-surface-container-lowest ring-1 ring-outline-variant/10 relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 md:w-2/3">
          <h2 className="font-headline font-normal text-3xl text-on-surface mb-4">
            Need a custom app?
          </h2>
          <p className="text-on-surface-variant text-lg max-w-xl">
            Tell Vocali what your child is working on, and we&apos;ll help you
            generate a tailored visual aid or communication board in seconds.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/builder"
              className="bg-primary text-on-primary px-6 py-3 rounded-lg font-semibold hover:bg-primary-container transition-colors"
            >
              Start Building
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

      {fullscreenSessionId && fullscreenBundle?.contents && (
        <FullscreenAppView
          bundleHtml={fullscreenBundle.contents}
          onExit={() => setFullscreenSessionId(null)}
        />
      )}

      <DeleteConfirmationDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        projectName={deleteTarget?.title ?? ""}
        onConfirmDelete={() => {
          if (deleteTarget) {
            archiveSession({ sessionId: deleteTarget.id });
            setDeleteTarget(null);
          }
        }}
      />

      <DeleteConfirmationDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => { if (!open) setBulkDeleteOpen(false); }}
        projectName={`${selectedIds.size} app${selectedIds.size !== 1 ? "s" : ""}`}
        onConfirmDelete={() => {
          const count = selectedIds.size;
          selectedIds.forEach((id) => {
            archiveSession({ sessionId: id as Id<"sessions"> });
          });
          setSelectedIds(new Set());
          setSelectionMode(false);
          setBulkDeleteOpen(false);
          toast.success(`Deleted ${count} app${count !== 1 ? "s" : ""}`);
        }}
      />

      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between bg-surface-container-lowest px-6 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.1)]">
          <span className="text-sm font-medium text-on-surface">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectionMode(false);
                setSelectedIds(new Set());
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              Delete ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
