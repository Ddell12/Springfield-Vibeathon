"use client";

import Link from "next/link";
import { useState } from "react";

import { DeleteConfirmationDialog } from "@/shared/components/delete-confirmation-dialog";
import { MaterialIcon } from "@/shared/components/material-icon";
import { TypeBadge } from "@/shared/components/type-badge";

type ToolCardProps = {
  title: string;
  toolType: string;
  description?: string;
  date?: string;
  variant: "tool" | "template";
  prompt?: string;
  onAction?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
};

export function ToolCard({
  title,
  toolType,
  description,
  date,
  variant,
  prompt,
  onShare,
  onDelete,
}: ToolCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const templateHref = prompt
    ? `/builder?prompt=${encodeURIComponent(prompt)}`
    : "/builder";

  return (
    <>
      <div className="group bg-surface-container-lowest rounded-xl sanctuary-shadow overflow-hidden transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg flex flex-col">
        {/* Image area */}
        <div className="aspect-[4/3] bg-surface-container-low relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed/20 to-surface-container-low transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute top-4 left-4">
            <TypeBadge type={toolType} />
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="font-headline font-bold text-xl text-on-surface mb-1">
            {title}
          </h3>

          {variant === "tool" && date && (
            <p className="text-on-surface-variant text-sm mb-6">{date}</p>
          )}

          {variant === "template" && description && (
            <p className="text-on-surface-variant text-sm mb-6 flex-grow leading-relaxed">
              {description}
            </p>
          )}

          {variant === "tool" ? (
            <div className="flex items-center justify-end gap-2">
              <button
                className="p-2 text-primary hover:bg-surface-container-high rounded-lg transition-colors"
                title="Share"
                aria-label={`Share ${title}`}
                onClick={onShare}
              >
                <MaterialIcon icon="share" size="sm" />
              </button>
              <button
                className="p-2 text-primary hover:bg-surface-container-high rounded-lg transition-colors"
                title="Delete"
                aria-label={`Delete ${title}`}
                onClick={() => setDeleteOpen(true)}
              >
                <MaterialIcon icon="delete" size="sm" />
              </button>
            </div>
          ) : (
            <Link
              href={templateHref}
              className="w-full bg-primary-gradient text-white py-3 rounded-lg font-label font-bold text-sm tracking-wide text-center hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Use Template
            </Link>
          )}
        </div>
      </div>

      {onDelete && (
        <DeleteConfirmationDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          projectName={title}
          onConfirmDelete={() => onDelete()}
        />
      )}
    </>
  );
}
