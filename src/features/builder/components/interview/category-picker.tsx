"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

import { CATEGORIES } from "../../lib/interview/categories";

interface CategoryPickerProps {
  onSelect: (categoryId: string) => void;
  onEscapeHatch: () => void;
}

const TOP_CATEGORIES = CATEGORIES.slice(0, 5);
const MORE_CATEGORIES = CATEGORIES.slice(5);

// Icon background colors for each top category (by index)
const ICON_BG_COLORS = [
  "bg-domain-teal-container text-on-domain-teal",
  "bg-domain-blue-container text-on-domain-blue",
  "bg-domain-amber-container text-on-domain-amber",
  "bg-domain-purple-container text-on-domain-purple",
  "bg-domain-rose-container text-on-domain-rose",
];

export function CategoryPicker({ onSelect, onEscapeHatch }: CategoryPickerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Top 5 category cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {TOP_CATEGORIES.map((category, index) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className={cn(
              "bg-surface-container-lowest rounded-2xl p-5 text-left",
              "cursor-pointer hover:shadow-lg hover:-translate-y-0.5",
              "transition-all duration-300",
              "flex items-start gap-4",
            )}
          >
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                ICON_BG_COLORS[index],
              )}
            >
              <MaterialIcon icon={category.icon} size="sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{category.label}</p>
              <p className="mt-0.5 text-sm text-on-surface-variant">{category.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* More options toggle */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-foreground transition-colors duration-200"
        >
          <span>More options</span>
          <MaterialIcon
            icon={expanded ? "expand_less" : "expand_more"}
            size="sm"
            className={cn("transition-transform duration-300", expanded && "rotate-180")}
          />
        </button>

        {/* Expanded extra categories */}
        {expanded && (
          <div className="flex flex-wrap justify-center gap-2">
            {MORE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelect(category.id)}
                className={cn(
                  "bg-surface-container rounded-full px-4 py-2 text-sm",
                  "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
                  "transition-all duration-300 text-on-surface-variant hover:text-foreground",
                )}
              >
                {category.label}
              </button>
            ))}
          </div>
        )}

        {/* Escape hatch */}
        <button
          type="button"
          onClick={onEscapeHatch}
          className="text-sm text-on-surface-variant/60 hover:text-on-surface-variant transition-colors duration-200"
        >
          Or just describe what you want
        </button>
      </div>
    </div>
  );
}
