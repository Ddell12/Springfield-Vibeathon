import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockCreateInstance = vi.fn().mockResolvedValue("new-instance-id");
vi.mock("convex/react", () => ({
  useMutation: () => mockCreateInstance,
}));
vi.mock("@convex/_generated/api", () => ({
  api: { tools: { create: "tools:create" } },
}));

// Mock fetch for the infer-template call
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { ToolEntryPage } from "../tool-entry-page";

describe("ToolEntryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          templateType: "token_board",
          configJson: JSON.stringify({ title: "Marcus Token Board", tokenCount: 5 }),
          suggestedTitle: "Marcus Token Board",
        }),
    });
  });

  it("renders the heading and textarea", () => {
    render(<ToolEntryPage />);
    expect(screen.getByText(/what do you want to build/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("Build it button is disabled when description is empty", () => {
    render(<ToolEntryPage />);
    expect(screen.getByRole("button", { name: /build it/i })).toBeDisabled();
  });

  it("Build it button enables when description is entered", () => {
    render(<ToolEntryPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "token board for Marcus" },
    });
    expect(screen.getByRole("button", { name: /build it/i })).not.toBeDisabled();
  });

  it("calls infer-template API then creates instance and redirects", async () => {
    render(<ToolEntryPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "token board for Marcus, 5 tokens, iPad reward" },
    });
    fireEvent.click(screen.getByRole("button", { name: /build it/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tools/infer-template",
        expect.objectContaining({ method: "POST" })
      );
    });

    await waitFor(() => {
      expect(mockCreateInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          templateType: "token_board",
          title: "Marcus Token Board",
          originalDescription: "token board for Marcus, 5 tokens, iPad reward",
        })
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/tools/new-instance-id");
    });
  });

  it("shows error message when API fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });
    render(<ToolEntryPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "token board for Marcus" },
    });
    fireEvent.click(screen.getByRole("button", { name: /build it/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/couldn't build the tool/i)
      ).toBeInTheDocument();
    });
  });

  it("quick-start cards are visible", () => {
    render(<ToolEntryPage />);
    expect(screen.getByText(/token board/i)).toBeInTheDocument();
  });
});
