import { render, screen } from "@testing-library/react";

import { TemplatesTab } from "../templates-tab";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("TemplatesTab", () => {
  it("renders 6 template cards", () => {
    render(<TemplatesTab />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);
  });

  it("each card links to /builder?prompt=... with template description", () => {
    render(<TemplatesTab />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href") ?? "");
    // Each template should generate a ?prompt= URL containing the template title
    expect(hrefs.some((h) => h.includes("prompt=") && h.includes("Token%20Board"))).toBe(true);
    expect(hrefs.some((h) => h.includes("prompt=") && h.includes("Visual%20Schedule"))).toBe(true);
    expect(hrefs.some((h) => h.includes("prompt=") && h.includes("Communication%20Board"))).toBe(true);
    expect(hrefs.some((h) => h.includes("prompt=") && h.includes("Social%20Story"))).toBe(true);
    expect(hrefs.some((h) => h.includes("prompt=") && h.includes("Feelings%20Check-In"))).toBe(true);
    expect(hrefs.some((h) => h.includes("prompt=") && h.includes("First-Then%20Board"))).toBe(true);
  });

  it("shows all template titles", () => {
    render(<TemplatesTab />);
    expect(screen.getByText("Token Board")).toBeInTheDocument();
    expect(screen.getByText("Visual Schedule")).toBeInTheDocument();
    expect(screen.getByText("Communication Board")).toBeInTheDocument();
    expect(screen.getByText("Social Story")).toBeInTheDocument();
    expect(screen.getByText("Feelings Check-In")).toBeInTheDocument();
    expect(screen.getByText("First-Then Board")).toBeInTheDocument();
  });

  it("shows all template subtitles", () => {
    render(<TemplatesTab />);
    expect(
      screen.getByText("Reward system with customizable tokens and goals")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Step-by-step daily routine with drag-to-reorder")
    ).toBeInTheDocument();
    expect(
      screen.getByText("AAC grid with picture cards and text-to-speech")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Illustrated narrative for social situations")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Emotion identification with visual supports")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Simple contingency board for transitions")
    ).toBeInTheDocument();
  });
});
