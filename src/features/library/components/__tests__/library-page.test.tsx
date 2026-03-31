import { render, screen } from "@testing-library/react";

import { LibraryPage } from "../library-page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/my-tools/components/my-tools-page", () => ({
  MyToolsPage: () => <div>My Apps Content</div>,
}));

vi.mock("@/features/templates/components/templates-page", () => ({
  TemplatesPage: () => <div>Templates Content</div>,
}));

describe("LibraryPage", () => {
  it("defaults to My Apps and renders that tab first", () => {
    render(<LibraryPage />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveTextContent("My Apps");
    expect(tabs[1]).toHaveTextContent("Templates");
    expect(tabs[0]).toHaveAttribute("data-state", "active");
  });
});
