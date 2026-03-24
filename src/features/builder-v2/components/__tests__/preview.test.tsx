import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { FragmentResult } from "../../lib/schema";
import { Preview } from "../preview";

// Mock FragmentWeb to avoid iframe complexity in tests
vi.mock("../fragment-web", () => ({
  FragmentWeb: ({ url, title }: { url: string; title?: string }) => (
    <div data-testid="fragment-web" data-url={url} data-title={title}>
      Fragment Preview: {url}
    </div>
  ),
}));

vi.mock("../loading-carousel", () => ({
  LoadingCarousel: () => <div data-testid="loading-carousel" role="status">Loading...</div>,
}));

const mockFragment: FragmentResult = {
  title: "Morning Routine Tracker",
  description: "An interactive morning routine for children with ASD",
  template: "nextjs-developer",
  code: "export default function App() { return <div>App</div>; }",
  file_path: "app/page.tsx",
  has_additional_dependencies: false,
  port: 3000,
};

describe("Preview", () => {
  it("renders an empty/placeholder state when fragment is null", () => {
    render(<Preview fragment={null} sandboxUrl={null} isLoading={false} />);
    // Should show some placeholder or empty state UI
    // Should not show the FragmentWeb iframe
    expect(screen.queryByTestId("fragment-web")).not.toBeInTheDocument();
  });

  it("renders a loading indicator when isLoading is true", () => {
    render(
      <Preview fragment={mockFragment} sandboxUrl={null} isLoading={true} />
    );
    expect(screen.getByTestId("loading-carousel")).toBeInTheDocument();
  });

  it("renders FragmentWeb when fragment and sandboxUrl are both provided", () => {
    render(
      <Preview
        fragment={mockFragment}
        sandboxUrl="https://sandbox-abc-3000.e2b.app"
        isLoading={false}
      />
    );
    expect(screen.getByTestId("fragment-web")).toBeInTheDocument();
  });

  it("passes the sandboxUrl to FragmentWeb", () => {
    const url = "https://sandbox-abc-3000.e2b.app";
    render(
      <Preview
        fragment={mockFragment}
        sandboxUrl={url}
        isLoading={false}
      />
    );
    expect(screen.getByTestId("fragment-web")).toHaveAttribute("data-url", url);
  });

  it("passes the fragment title to FragmentWeb", () => {
    render(
      <Preview
        fragment={mockFragment}
        sandboxUrl="https://sandbox-abc-3000.e2b.app"
        isLoading={false}
      />
    );
    const fragmentWeb = screen.getByTestId("fragment-web");
    expect(fragmentWeb).toHaveAttribute("data-title", mockFragment.title);
  });

  it("does not render FragmentWeb when sandboxUrl is null even if fragment exists", () => {
    render(
      <Preview
        fragment={mockFragment}
        sandboxUrl={null}
        isLoading={false}
      />
    );
    expect(screen.queryByTestId("fragment-web")).not.toBeInTheDocument();
  });

  it("shows the fragment title in the preview header when fragment exists", () => {
    render(
      <Preview
        fragment={mockFragment}
        sandboxUrl="https://sandbox-abc-3000.e2b.app"
        isLoading={false}
      />
    );
    expect(screen.getByText(mockFragment.title)).toBeInTheDocument();
  });

  it("does not render loading when isLoading is false and fragment is ready", () => {
    render(
      <Preview
        fragment={mockFragment}
        sandboxUrl="https://sandbox-abc-3000.e2b.app"
        isLoading={false}
      />
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not render a Code tab", () => {
    render(
      <Preview
        fragment={mockFragment}
        sandboxUrl="https://sandbox-abc-3000.e2b.app"
        isLoading={false}
      />
    );
    // No tab or button labeled "Code"
    const buttons = screen.getAllByRole("button").concat(screen.queryAllByRole("tab"));
    expect(buttons.some((b) => b.textContent?.trim() === "Code")).toBe(false);
  });

  it("does not render a <pre> code block", () => {
    render(
      <Preview
        fragment={mockFragment}
        sandboxUrl="https://sandbox-abc-3000.e2b.app"
        isLoading={false}
      />
    );
    expect(document.querySelector("pre")).toBeNull();
  });

  it("shows empty placeholder text 'Your tool preview' when fragment is null", () => {
    render(<Preview fragment={null} sandboxUrl={null} isLoading={false} />);
    expect(screen.getByText(/your tool preview/i)).toBeInTheDocument();
  });

  it("shows 'Updating your tool...' pill when isIterating is true", () => {
    render(
      <Preview
        fragment={mockFragment}
        sandboxUrl="https://sandbox-abc-3000.e2b.app"
        isLoading={false}
        isIterating={true}
      />
    );
    expect(screen.getByText(/updating your tool/i)).toBeInTheDocument();
  });

  it("does not show iterating pill when isIterating is false", () => {
    render(
      <Preview
        fragment={mockFragment}
        sandboxUrl="https://sandbox-abc-3000.e2b.app"
        isLoading={false}
        isIterating={false}
      />
    );
    expect(screen.queryByText(/updating your tool/i)).not.toBeInTheDocument();
  });
});
