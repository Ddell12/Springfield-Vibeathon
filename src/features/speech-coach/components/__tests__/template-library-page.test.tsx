import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TemplateLibraryPage } from "../template-library-page";

const mockedUseQuery = vi.fn();
const mockedUseMutation = vi.fn(() => vi.fn());

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true }),
  useQuery: (...args: any[]) => mockedUseQuery(...args),
  useMutation: (...args: any[]) => mockedUseMutation(...args),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("TemplateLibraryPage", () => {
  it("renders Edit and Duplicate for each template card", () => {
    mockedUseQuery.mockReturnValue([
      { _id: "tpl1", name: "Playful /s/", description: "desc", status: "active", version: 3, isSystemTemplate: false },
      { _id: "tpl2", name: "", description: "", status: "draft", version: 1, isSystemTemplate: false },
    ]);

    render(<TemplateLibraryPage />);

    expect(screen.getAllByRole("button", { name: /edit/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /duplicate/i }).length).toBeGreaterThan(1);
    expect(screen.getByText("Untitled template")).toBeInTheDocument();
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
        isSystemTemplate: false,
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

  it("shows system templates in the system tab", () => {
    mockedUseQuery.mockReturnValue([
      {
        _id: "system1",
        name: "Sound Drill",
        description: "desc",
        status: "active",
        version: 1,
        isSystemTemplate: true,
        voice: { provider: "elevenlabs", voiceKey: "friendly-coach" },
        prompt: {},
        tools: [],
        skills: [],
        knowledgePackIds: [],
        customKnowledgeSnippets: [],
        sessionDefaults: { ageRange: "5-7", defaultDurationMinutes: 10 },
      },
      {
        _id: "system2",
        name: "Conversational",
        description: "desc",
        status: "active",
        version: 1,
        isSystemTemplate: true,
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

    fireEvent.click(screen.getByRole("button", { name: /system templates/i }));

    expect(screen.getByText("Sound Drill")).toBeInTheDocument();
    expect(screen.getByText("Conversational")).toBeInTheDocument();
  });
});
