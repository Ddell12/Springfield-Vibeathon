"use client";

import { EmptyState } from "@/shared/components/empty-state";

import { ProjectCard, type ProjectData } from "./project-card";

export function ProjectsGrid({
  projects,
}: {
  projects: ProjectData[];
}) {
  if (projects.length === 0) {
    return (
      <EmptyState
        variant="no-projects"
        title="No apps yet"
        description="Describe what your child needs, or browse templates to get started."
        primaryAction={{ label: "Start Building", href: "/builder" }}
        secondaryAction={{ label: "Browse Templates", href: "/dashboard?tab=templates" }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} />
      ))}
    </div>
  );
}
