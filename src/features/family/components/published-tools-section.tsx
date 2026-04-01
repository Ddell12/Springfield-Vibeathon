"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface PublishedToolsSectionProps {
  patientId: Id<"patients">;
}

function friendlyTemplateLabel(templateType: string): string {
  return templateType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const ICON_COLORS = [
  "bg-primary/10 text-primary",
  "bg-violet-500/10 text-violet-600",
  "bg-amber-500/10 text-amber-600",
  "bg-rose-500/10 text-rose-600",
  "bg-teal-500/10 text-teal-600",
];

export function PublishedToolsSection({ patientId }: PublishedToolsSectionProps) {
  const instances = useQuery(api.tools.listByPatient, { patientId });

  if (!instances) return null;

  const published = instances.filter(
    (app) => app.status === "published" && app.shareToken
  );

  if (published.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-headline text-lg font-semibold text-foreground">Apps</h2>
      {published.map((app, i) => (
        <Link
          key={app._id}
          href={`/apps/${app.shareToken}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted/70"
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ICON_COLORS[i % ICON_COLORS.length]}`}
          >
            <span className="text-sm font-bold">
              {app.title.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{app.title}</p>
            <p className="text-xs text-muted-foreground">
              {friendlyTemplateLabel(app.templateType)}
            </p>
          </div>
          <MaterialIcon icon="chevron_right" className="shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
