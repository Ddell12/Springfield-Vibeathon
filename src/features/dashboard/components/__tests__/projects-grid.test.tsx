import { render, screen } from "@testing-library/react";

import type { ProjectData } from "@/shared/components/project-card";
import { ProjectsGrid } from "../projects-grid";

vi.mock("@/shared/components/project-card", () => ({
  ProjectCard: ({ project, index }: any) => (
    <div data-testid="project-card" data-index={index}>
      {project.title}
    </div>
  ),
}));

vi.mock("@/shared/components/empty-state", () => ({
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
}));

const makeProject = (id: string, title: string): ProjectData => ({
  id,
  title,
  thumbnail: null,
  updatedAt: Date.now(),
  userInitial: title.charAt(0),
  userColor: "bg-blue-500",
});

describe("ProjectsGrid", () => {
  it("shows EmptyState with 'No apps yet' when projects array is empty", () => {
    render(<ProjectsGrid projects={[]} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No apps yet")).toBeInTheDocument();
  });

  it("renders ProjectCards when projects are provided", () => {
    const projects = [
      makeProject("1", "Token Board"),
      makeProject("2", "Visual Schedule"),
    ];
    render(<ProjectsGrid projects={projects} />);
    const cards = screen.getAllByTestId("project-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("Token Board")).toBeInTheDocument();
    expect(screen.getByText("Visual Schedule")).toBeInTheDocument();
  });

  it("passes correct index to each card", () => {
    const projects = [
      makeProject("1", "App One"),
      makeProject("2", "App Two"),
      makeProject("3", "App Three"),
    ];
    render(<ProjectsGrid projects={projects} />);
    const cards = screen.getAllByTestId("project-card");
    expect(cards[0]).toHaveAttribute("data-index", "0");
    expect(cards[1]).toHaveAttribute("data-index", "1");
    expect(cards[2]).toHaveAttribute("data-index", "2");
  });

  it("does not show EmptyState when projects are present", () => {
    const projects = [makeProject("1", "Token Board")];
    render(<ProjectsGrid projects={projects} />);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});
