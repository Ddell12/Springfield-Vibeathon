"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { DeleteConfirmationDialog } from "@/shared/components/delete-confirmation-dialog";
import { MaterialIcon } from "@/shared/components/material-icon";
import { ProjectCard } from "@/shared/components/project-card";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function MyToolsPage() {
  const sessions = useQuery(api.sessions.list);
  const removeSession = useMutation(api.sessions.remove);
  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"sessions">; title: string } | null>(null);

  if (sessions === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-8 pt-12 pb-24">
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

  if (sessions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-8 pt-12 pb-24 flex flex-col items-center justify-center gap-6 min-h-[60vh]">
        <div className="text-center">
          <MaterialIcon icon="dashboard_customize" className="text-6xl text-primary/40 mb-4" />
          <h1 className="font-headline font-bold text-3xl text-on-surface mb-3">
            No apps yet
          </h1>
          <p className="text-on-surface-variant text-lg mb-8">
            Describe a therapy activity and Bridges will build a visual app for you.
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="font-headline font-bold text-4xl md:text-5xl text-on-surface tracking-tight mb-2">
            My Apps
          </h1>
          <p className="text-on-surface-variant text-lg">
            {sessions.length} app{sessions.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <Link
          href="/builder"
          className="bg-primary-gradient text-white px-8 py-4 rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95"
        >
          <MaterialIcon icon="add_circle" />
          Create New App
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sessions.map((session, i) => (
          <ProjectCard
            key={session._id}
            project={{
              id: session._id,
              title: session.title,
              thumbnail: null,
              updatedAt: session._creationTime,
              userInitial: session.title.charAt(0).toUpperCase(),
              userColor: "bg-tertiary-fixed text-on-surface",
            }}
            index={i}
            onDelete={() => setDeleteTarget({ id: session._id, title: session.title })}
          />
        ))}
      </div>

      <section className="mt-20 p-10 rounded-xl bg-surface-container-lowest relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 md:w-2/3">
          <h2 className="font-headline font-bold text-3xl text-on-surface mb-4">
            Need a custom app?
          </h2>
          <p className="text-on-surface-variant text-lg max-w-xl">
            Tell Bridges what your child is working on, and we&apos;ll help you
            generate a tailored visual aid or communication board in seconds.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/builder"
              className="bg-primary-gradient text-on-primary px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-colors duration-300"
            >
              Start Building
            </Link>
            <Link
              href="/templates"
              className="text-primary font-semibold px-6 py-3 rounded-lg hover:bg-surface-container-high transition-colors duration-300"
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
            removeSession({ sessionId: deleteTarget.id });
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
