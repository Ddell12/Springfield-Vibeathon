"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

interface DeckCardProps {
  title: string;
  cardCount: number;
  coverImageUrl?: string;
  isActive: boolean;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

export function DeckCard({
  title,
  cardCount,
  coverImageUrl,
  isActive,
  onClick,
  onRename,
  onDelete,
}: DeckCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-300",
        isActive
          ? "bg-primary-fixed/60 text-on-surface shadow-sm ring-1 ring-primary/15"
          : "text-on-surface hover:bg-surface-container-low",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg",
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-surface-container-highest text-on-surface-variant",
        )}
      >
        {coverImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <MaterialIcon
            icon="collections_bookmark"
            size="xs"
            className={isActive ? "text-primary" : "text-on-surface-variant/40"}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate", isActive ? "font-semibold text-on-surface" : "font-medium")}>
          {title}
        </p>
        <p className="text-xs text-on-surface-variant">
          {cardCount} card{cardCount !== 1 ? "s" : ""}
        </p>
      </div>

      {(onRename || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 rounded-md p-1 opacity-0 transition-opacity hover:bg-surface-container-high group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="Deck options"
          >
            <MaterialIcon icon="more_vert" size="xs" className="text-on-surface-variant" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {onRename && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRename();
                }}
              >
                <MaterialIcon icon="edit" size="xs" className="mr-2" />
                Rename
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-error focus:text-error"
              >
                <MaterialIcon icon="delete" size="xs" className="mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </button>
  );
}
