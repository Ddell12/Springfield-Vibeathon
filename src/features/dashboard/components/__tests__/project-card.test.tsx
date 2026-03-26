import { render, screen } from "@testing-library/react";

import { ProjectCard, type ProjectData } from "../project-card";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

const baseProject: ProjectData = {
  id: "session123",
  title: "Token Board App",
  thumbnail: null,
  updatedAt: Date.now(),
  userInitial: "T",
  userColor: "bg-blue-500",
};

describe("ProjectCard", () => {
  it("renders the project title", () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText("Token Board App")).toBeInTheDocument();
  });

  it("links to /builder?sessionId={id}", () => {
    render(<ProjectCard project={baseProject} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/builder?sessionId=session123");
  });

  it("shows first letter as fallback when no thumbnail", () => {
    render(
      <ProjectCard
        project={{ ...baseProject, thumbnail: null, userInitial: "D" }}
      />
    );
    // The first char of the title is rendered as fallback (title starts with "T")
    // We look for it in the specific thumbnail area by checking that no <img> is present
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    // Fallback letter "T" is in the thumbnail div
    const allT = screen.getAllByText("T");
    // At least one of them should be the fallback (inside the thumbnail area)
    expect(allT.length).toBeGreaterThan(0);
  });

  it("shows Image when thumbnail is provided", () => {
    render(
      <ProjectCard
        project={{ ...baseProject, thumbnail: "https://example.com/thumb.png" }}
      />
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/thumb.png");
    expect(img).toHaveAttribute("alt", "Token Board App");
  });

  it("shows user initial in avatar circle", () => {
    render(<ProjectCard project={{ ...baseProject, userInitial: "D" }} />);
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  describe("formatTimeAgo", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows "Just now" for very recent timestamps', () => {
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
      const now = Date.now();
      render(<ProjectCard project={{ ...baseProject, updatedAt: now - 10000 }} />);
      expect(screen.getByText("Just now")).toBeInTheDocument();
    });

    it("shows minutes ago", () => {
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      render(
        <ProjectCard project={{ ...baseProject, updatedAt: fiveMinutesAgo }} />
      );
      expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
    });

    it("shows hours ago", () => {
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
      render(
        <ProjectCard project={{ ...baseProject, updatedAt: threeHoursAgo }} />
      );
      expect(screen.getByText(/3 hours ago/i)).toBeInTheDocument();
    });

    it("shows days ago", () => {
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
      render(
        <ProjectCard project={{ ...baseProject, updatedAt: twoDaysAgo }} />
      );
      expect(screen.getByText(/2 days ago/i)).toBeInTheDocument();
    });
  });
});
