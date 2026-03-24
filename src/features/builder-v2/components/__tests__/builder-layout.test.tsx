import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BuilderV2Layout } from "../builder-layout";

const mockUseMediaQuery = vi.fn();

vi.mock("usehooks-ts", () => ({
  useMediaQuery: (query: string) => mockUseMediaQuery(query),
}));

describe("BuilderV2Layout", () => {
  const chatContent = <div>Chat Panel</div>;
  const previewContent = <div>Preview Panel</div>;

  it("renders both panels on desktop in side-by-side layout", () => {
    mockUseMediaQuery.mockReturnValue(false);
    render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    expect(screen.getByText("Chat Panel")).toBeInTheDocument();
    expect(screen.getByText("Preview Panel")).toBeInTheDocument();
  });

  it("renders stacked layout on mobile", () => {
    mockUseMediaQuery.mockReturnValue(true);
    render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    expect(screen.getByText("Chat Panel")).toBeInTheDocument();
    expect(screen.getByText("Preview Panel")).toBeInTheDocument();
  });

  it("renders chat panel above preview panel in mobile stacked layout", () => {
    mockUseMediaQuery.mockReturnValue(true);
    const { container } = render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    const text = container.textContent ?? "";
    const chatIndex = text.indexOf("Chat Panel");
    const previewIndex = text.indexOf("Preview Panel");
    expect(chatIndex).toBeLessThan(previewIndex);
  });

  it("uses fixed chat width on desktop", () => {
    mockUseMediaQuery.mockReturnValue(false);
    const { container } = render(
      <BuilderV2Layout chatPanel={chatContent} previewPanel={previewContent} />
    );
    const chatContainer = container.querySelector(".w-\\[400px\\]");
    expect(chatContainer).toBeInTheDocument();
  });
});
