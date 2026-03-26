import { render, screen, fireEvent } from "@testing-library/react";

import { CodeDrawer } from "../code-drawer";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/shared/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

const sampleFiles = [
  { path: "src/App.tsx", contents: "function App() { return <div>Hello</div>; }" },
  { path: "src/components/Button.tsx", contents: "export const Button = () => <button />" },
  { path: "package.json", contents: '{ "name": "my-app" }' },
];

describe("CodeDrawer", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders file tree from files array", () => {
    render(<CodeDrawer files={sampleFiles} onClose={onClose} />);
    expect(screen.getByText("App.tsx")).toBeInTheDocument();
    expect(screen.getByText("package.json")).toBeInTheDocument();
  });

  it("first file is selected by default and its contents shown", () => {
    render(<CodeDrawer files={sampleFiles} onClose={onClose} />);
    expect(screen.getByText(/function App/)).toBeInTheDocument();
  });

  it("click a file shows its contents", () => {
    render(<CodeDrawer files={sampleFiles} onClose={onClose} />);
    fireEvent.click(screen.getByText("package.json"));
    expect(screen.getByText(/my-app/)).toBeInTheDocument();
  });

  it("Close button calls onClose", () => {
    render(<CodeDrawer files={sampleFiles} onClose={onClose} />);
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("Files tab is active by default", () => {
    render(<CodeDrawer files={sampleFiles} onClose={onClose} />);
    // The Files tab button has a border-b-2 class when active
    const filesTab = screen.getByRole("button", { name: "Files" });
    expect(filesTab.className).toContain("border-primary");
  });

  it("Switch to Search tab shows search input", () => {
    render(<CodeDrawer files={sampleFiles} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByPlaceholderText(/Search files/)).toBeInTheDocument();
  });

  it("typing in search filters files by path", () => {
    render(<CodeDrawer files={sampleFiles} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    const input = screen.getByPlaceholderText(/Search files/);
    fireEvent.change(input, { target: { value: "App" } });
    // In search results, the full paths are shown as buttons
    // src/App.tsx and src/components/Button.tsx both match "App" in Button.tsx case? No.
    // "App" matches "src/App.tsx" but NOT "package.json" or "src/components/Button.tsx"
    // The search results show the full path — find it via getAllByText to avoid ambiguity with tree
    const allAppTsx = screen.getAllByText("src/App.tsx");
    // At least one in search results
    expect(allAppTsx.length).toBeGreaterThan(0);
    // package.json should not appear in the search result list (it only exists in files tab, which is hidden)
    // Since search tab is active, file tree is hidden — package.json text is NOT in DOM
    expect(screen.queryByText("package.json")).not.toBeInTheDocument();
  });

  it("click search result selects file and switches back to Files tab", () => {
    render(<CodeDrawer files={sampleFiles} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    const input = screen.getByPlaceholderText(/Search files/);
    fireEvent.change(input, { target: { value: "package" } });
    fireEvent.click(screen.getByText("package.json"));
    // Should switch to files tab (Files tab button now has active class)
    const filesTab = screen.getByRole("button", { name: "Files" });
    expect(filesTab.className).toContain("border-primary");
    // File content visible
    expect(screen.getByText(/my-app/)).toBeInTheDocument();
  });

  it("empty search shows placeholder text", () => {
    render(<CodeDrawer files={sampleFiles} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByText(/Type to search files/)).toBeInTheDocument();
  });

  it("directory nodes are expandable/collapsible", () => {
    render(<CodeDrawer files={sampleFiles} onClose={onClose} />);
    // "src" is a directory node — find it by the span with text "src" inside a button
    // The button contains icon spans + the name span
    const srcSpan = screen.getByText("src");
    const srcDirBtn = srcSpan.closest("button")!;
    // Children visible by default (expanded)
    expect(screen.getByText("App.tsx")).toBeInTheDocument();
    // Collapse
    fireEvent.click(srcDirBtn);
    expect(screen.queryByText("App.tsx")).not.toBeInTheDocument();
    // Expand again
    fireEvent.click(srcDirBtn);
    expect(screen.getByText("App.tsx")).toBeInTheDocument();
  });

  it("empty files array shows placeholder message", () => {
    render(<CodeDrawer files={[]} onClose={onClose} />);
    expect(screen.getByText("Select a file to view its contents")).toBeInTheDocument();
  });
});
