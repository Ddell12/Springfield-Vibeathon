import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LibraryPage } from "../library-page";

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

vi.mock("@/features/my-tools/components/my-tools-page", () => ({
  MyToolsPage: () => <div>My Apps Content</div>,
}));

vi.mock("@/features/templates/components/templates-page", () => ({
  TemplatesPage: () => <div>Templates Content</div>,
}));

describe("LibraryPage", () => {
  beforeEach(() => {
    replace.mockClear();
    searchParams = new URLSearchParams();
  });

  it("defaults to My Apps and renders that tab first", () => {
    render(<LibraryPage />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveTextContent("My Apps");
    expect(tabs[1]).toHaveTextContent("Templates");
    expect(tabs[0]).toHaveAttribute("data-state", "active");
  });

  it("writes the selected tab into the library URL", async () => {
    const user = userEvent.setup();

    render(<LibraryPage />);
    await user.click(screen.getByRole("tab", { name: /templates/i }));

    expect(replace).toHaveBeenCalledWith("/library?tab=templates&page=1", { scroll: false });
  });

  it("resets page to 1 when the tab changes", async () => {
    const user = userEvent.setup();
    render(<LibraryPage />);
    await user.click(screen.getByRole("tab", { name: /templates/i }));
    expect(replace).toHaveBeenCalledWith(
      expect.stringContaining("page=1"),
      { scroll: false }
    );
  });
});
