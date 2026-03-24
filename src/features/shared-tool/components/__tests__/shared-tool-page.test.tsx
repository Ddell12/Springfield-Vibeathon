import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { SharedToolPage } from "../shared-tool-page";
import type { ToolConfig } from "@/features/therapy-tools/types/tool-configs";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`}>{icon}</span>
  ),
}));

vi.mock("@/features/therapy-tools/components/tool-renderer", () => ({
  ToolRenderer: ({ config }: { config: ToolConfig }) => (
    <div data-testid="tool-renderer">{config?.type}</div>
  ),
}));

const mockConfig: ToolConfig = {
  type: "communication-board",
  title: "Feelings Board",
  sentenceStarter: "I feel",
  cards: [],
  enableTTS: true,
  voiceId: "default",
  columns: 3,
};

const baseTool = {
  title: "Emma's Feelings Board",
  description: "Help Emma express her emotions with visual cards.",
  config: mockConfig,
};

describe("SharedToolPage", () => {
  test("renders tool title", () => {
    render(<SharedToolPage tool={baseTool} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /emma's feelings board/i,
      }),
    ).toBeInTheDocument();
  });

  test("renders tool description", () => {
    render(<SharedToolPage tool={baseTool} />);

    expect(
      screen.getByText(/help emma express her emotions/i),
    ).toBeInTheDocument();
  });

  test("renders ToolRenderer with the provided config", () => {
    render(<SharedToolPage tool={baseTool} />);

    const renderer = screen.getByTestId("tool-renderer");
    expect(renderer).toBeInTheDocument();
    expect(renderer).toHaveTextContent("communication-board");
  });

  test("renders creator info when creatorName is provided", () => {
    render(
      <SharedToolPage
        tool={{
          ...baseTool,
          creatorName: "Dr. Sarah",
          creatorSpecialty: "Speech Pathologist",
        }}
      />,
    );

    expect(screen.getByText(/created by dr\. sarah/i)).toBeInTheDocument();
    expect(screen.getByText(/speech pathologist/i)).toBeInTheDocument();
  });

  test("does not render creator section when creatorName is absent", () => {
    render(<SharedToolPage tool={baseTool} />);

    expect(screen.queryByText(/created by/i)).not.toBeInTheDocument();
  });

  test("renders footer with Create Tool link to /builder", () => {
    render(<SharedToolPage tool={baseTool} />);

    const ctaLink = screen.getByRole("link", { name: /create tool/i });
    expect(ctaLink).toHaveAttribute("href", "/builder");
  });
});
