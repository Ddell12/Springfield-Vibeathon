import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { InterviewController } from "../interview-controller";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("InterviewController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ followUps: [], blueprint: null }),
    });
  });

  it("renders CategoryPicker initially", () => {
    const { getByText } = render(
      <InterviewController onGenerate={vi.fn()} />,
    );
    expect(getByText("Communication Board")).toBeInTheDocument();
  });

  it("shows first question after selecting a category", () => {
    const { getByText } = render(
      <InterviewController onGenerate={vi.fn()} />,
    );
    fireEvent.click(getByText("Communication Board"));
    expect(getByText("Who will use this app?")).toBeInTheDocument();
  });

  it("shows gate after answering all essential questions", async () => {
    const { getByText } = render(
      <InterviewController onGenerate={vi.fn()} />,
    );
    fireEvent.click(getByText("Communication Board"));
    fireEvent.click(getByText("Preschool (3-5)"));
    fireEvent.click(getByText("9 words (3×3)"));
    fireEvent.click(getByText(/Core words/));
    await waitFor(() => {
      expect(getByText(/customize further/i)).toBeInTheDocument();
    });
  });

  it("calls onGenerate with prompt and blueprint when Build this! clicked", async () => {
    const onGenerate = vi.fn();
    const { getByText } = render(
      <InterviewController onGenerate={onGenerate} />,
    );
    fireEvent.click(getByText("Communication Board"));
    fireEvent.click(getByText("Preschool (3-5)"));
    fireEvent.click(getByText("9 words (3×3)"));
    fireEvent.click(getByText(/Core words/));
    await waitFor(() => getByText(/Show me the plan/i));
    fireEvent.click(getByText(/Show me the plan/i));
    await waitFor(() => getByText("Build this!"), { timeout: 3000 });
    fireEvent.click(getByText("Build this!"));
    expect(onGenerate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ title: expect.any(String) }),
    );
  });
});
