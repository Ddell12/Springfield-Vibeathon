"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

export interface ProjectData {
  id: string;
  title: string;
  thumbnail: string | null;
  updatedAt: number;
  userInitial: string;
  userColor: string;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Modified ${rtf.format(-minutes, "minute")}`.replace(/^Modified /, "Modified ");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Modified ${rtf.format(-hours, "hour")}`;
  const days = Math.floor(hours / 24);
  return `Modified ${rtf.format(-days, "day")}`;
}

const GRADIENTS = [
  "from-surface-variant to-outline-variant/20",
  "from-secondary/10 to-primary/10",
  "from-tertiary-fixed to-on-tertiary-container/20",
  "from-primary/15 to-secondary/10",
];

export function ProjectCard({
  project,
  index = 0,
  onDelete,
}: {
  project: ProjectData;
  index?: number;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/builder?sessionId=${project.id}`)}
      onKeyDown={(e) => { if (e.key === "Enter") router.push(`/builder?sessionId=${project.id}`); }}
      className="group cursor-pointer rounded-2xl bg-surface-container-lowest p-5 shadow-[0_12px_32px_rgba(25,28,32,0.06)] transition-all duration-300 hover:-translate-y-2"
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "relative mb-5 h-48 w-full overflow-hidden rounded-xl bg-gradient-to-br",
          gradient
        )}
      >
        {project.thumbnail ? (
          <Image
            src={project.thumbnail}
            alt={project.title}
            width={400}
            height={192}
            className="h-full w-full object-cover mix-blend-overlay opacity-60"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-primary/20">
            {project.title.charAt(0)}
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-full bg-surface-container-lowest px-4 py-2 text-xs font-bold text-primary shadow-md">
            Open Tool
          </span>
        </div>

        {/* Action menu */}
        {onDelete && (
          <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-surface-container-lowest/90 text-on-surface-variant shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-container-lowest"
                  aria-label="App options"
                >
                  <MaterialIcon icon="more_vert" size="sm" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-error focus:text-error"
                >
                  <MaterialIcon icon="delete" size="sm" className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="mb-1 font-headline text-lg font-semibold text-on-surface">
            {project.title}
          </h3>
          <p className="text-xs text-on-surface-variant">
            {formatTimeAgo(project.updatedAt)}
          </p>
        </div>
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-4 ring-surface-container-lowest",
            project.userColor || "bg-tertiary-fixed text-on-surface"
          )}
        >
          {project.userInitial}
        </div>
      </div>
    </div>
  );
}
