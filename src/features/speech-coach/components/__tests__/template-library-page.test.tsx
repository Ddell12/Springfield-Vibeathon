import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TemplateLibraryPage } from "../template-library-page";

const mockedUseQuery = vi.fn();
const mockedUseMutation = vi.fn(() => vi.fn());

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockedUseQuery(...args),
  useMutation: (...args: any[]) => mockedUseMutation(...args),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe("TemplateLibraryPage", () => {
  it("renders Edit for each template card", () => {
    mockedUseQuery.mockReturnValue([
      { _id: "tpl1", name: "Playful /s/", description: "desc", status: "active", version: 3 },
      { _id: "tpl2", name: "", description: "", status: "draft", version: 1 },
    ]);

    render(<TemplateLibraryPage />);

    expect(screen.getAllByRole("button", { name: /edit/i })).toHaveLength(2);
    expect(screen.getByText("Untitled template")).toBeInTheDocument();
  });

  it("renders Preview session for each SLP template", async () => {
    mockedUseQuery.mockReturnValue([
      { _id: "tpl1", name: "Playful /s/", description: "desc", status: "active", version: 1 },
    ]);

    render(<TemplateLibraryPage />);

    expect(screen.getByRole("link", { name: /preview session/i })).toBeInTheDocument();
  });

  it("opens standalone preview link with template id", async () => {
    mockedUseQuery.mockReturnValue([
      { _id: "tpl1", name: "Playful /s/", description: "desc", status: "active", version: 1 },
    ]);

    render(<TemplateLibraryPage />);
    expect(screen.getByRole("link", { name: /preview session/i })).toHaveAttribute(
      "href",
      "/speech-coach?templateId=tpl1&mode=preview",
    );
  });

  it("renders Apply to child link for each template", () => {
    mockedUseQuery.mockReturnValue([
      { _id: "tpl1", name: "Playful /s/", description: "desc", status: "active", version: 1 },
    ]);

    render(<TemplateLibraryPage />);

    const applyLink = screen.getByRole("link", { name: /apply to child/i });
    expect(applyLink).toBeInTheDocument();
    expect(applyLink).toHaveAttribute("href", "/speech-coach/setup?templateId=tpl1");
  });

  it("shows a CTA button in the empty state", () => {
    mockedUseQuery.mockReturnValue([]);

    render(<TemplateLibraryPage />);

    expect(screen.getByRole("button", { name: /create first template/i })).toBeInTheDocument();
  });

  it("shows the editor pre-filled when Edit is clicked", () => {
    mockedUseQuery.mockReturnValue([
      {
        _id: "tpl1",
        name: "Playful /s/",
        description: "Use for high-energy sessions",
        status: "active",
        version: 4,
        voice: { provider: "elevenlabs", voiceKey: "friendly-coach" },
        prompt: {},
        tools: [],
        skills: [],
        knowledgePackIds: [],
        customKnowledgeSnippets: [],
        sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 10 },
      },
    ]);

    render(<TemplateLibraryPage />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByRole("heading", { name: /edit template/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/template name/i)).toHaveValue("Playful /s/");
    expect(screen.getByLabelText(/description/i)).toHaveValue("Use for high-energy sessions");
  });
});
