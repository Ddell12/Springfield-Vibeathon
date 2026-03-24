"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { ShareDialog } from "@/features/sharing/components/share-dialog";
import { MaterialIcon } from "@/shared/components/material-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export function MyToolsPage() {
  const projects = useQuery(api.projects.list);
  const removeProject = useMutation(api.projects.remove);
  const [sharingProject, setSharingProject] = useState<Doc<"projects"> | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<Id<"projects"> | null>(null);

  if (projects === undefined) {
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

  if (projects.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-8 pt-12 pb-24 flex flex-col items-center justify-center gap-6 min-h-[60vh]">
        <div className="text-center">
          <MaterialIcon icon="dashboard_customize" className="text-6xl text-primary/40 mb-4" />
          <h1 className="font-headline font-bold text-3xl text-on-surface mb-3">
            No tools yet
          </h1>
          <p className="text-on-surface-variant text-lg mb-8">
            Describe a therapy activity and Bridges will build a visual tool for you.
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
    <>
      <div className="max-w-7xl mx-auto px-8 pt-12 pb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="font-headline font-bold text-4xl md:text-5xl text-on-surface tracking-tight mb-2">
              My Tools
            </h1>
            <p className="text-on-surface-variant text-lg">
              {projects.length} tool{projects.length !== 1 ? "s" : ""} created
            </p>
          </div>
          <Link
            href="/builder"
            className="bg-primary-gradient text-white px-8 py-4 rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95"
          >
            <MaterialIcon icon="add_circle" />
            Create New Tool
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <div
              key={project._id}
              className="group bg-surface-container-lowest rounded-xl p-6 ring-1 ring-outline-variant/10 hover:ring-primary/30 transition-all hover:shadow-lg"
            >
              <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
                {project.title}
              </h3>
              {project.description && (
                <p className="text-on-surface-variant text-sm mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}
              <p className="text-on-surface-variant/60 text-xs mb-4">
                Created {new Date(project.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <div className="flex gap-2">
                <Link
                  href={`/builder?project=${project._id}`}
                  className="flex items-center gap-1 text-primary font-semibold text-sm hover:underline"
                >
                  <MaterialIcon icon="open_in_new" size="sm" />
                  Open
                </Link>
                <button
                  onClick={() => setSharingProject(project)}
                  className="flex items-center gap-1 text-on-surface-variant font-medium text-sm hover:text-primary transition-colors"
                >
                  <MaterialIcon icon="share" size="sm" />
                  Share
                </button>
                <button
                  aria-label="delete"
                  onClick={() => setDeletingProjectId(project._id)}
                  className="flex items-center gap-1 text-on-surface-variant font-medium text-sm hover:text-error transition-colors ml-auto"
                >
                  <MaterialIcon icon="delete" size="sm" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-20 p-10 rounded-xl bg-surface-container-lowest ring-1 ring-outline-variant/10 relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="relative z-10 md:w-2/3">
            <h2 className="font-headline font-bold text-3xl text-on-surface mb-4">
              Need a custom tool?
            </h2>
            <p className="text-on-surface-variant text-lg max-w-xl">
              Tell Bridges what your child is working on, and we&apos;ll help you
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
                href="/templates"
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
      </div>

      {sharingProject && (
        <ShareDialog
          open={!!sharingProject}
          onOpenChange={(open) => { if (!open) setSharingProject(null); }}
          shareSlug={sharingProject.shareSlug}
          toolTitle={sharingProject.title}
        />
      )}

      <AlertDialog open={!!deletingProjectId} onOpenChange={(open) => { if (!open) setDeletingProjectId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tool?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your therapy tool will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingProjectId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingProjectId) {
                  removeProject({ projectId: deletingProjectId });
                  setDeletingProjectId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
