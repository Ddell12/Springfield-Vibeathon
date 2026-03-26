import { fireEvent,render } from "@testing-library/react";

import { FileBadges } from "../file-badges";

describe("FileBadges", () => {
  it("returns null for empty array", () => {
    const { container } = render(<FileBadges files={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows all files when 3 or fewer, no expand button", () => {
    const files = [
      { path: "src/App.tsx", action: "Created" as const },
      { path: "src/utils.ts", action: "Edited" as const },
    ];
    const { getByText, queryByText } = render(<FileBadges files={files} />);
    expect(getByText("App.tsx")).toBeInTheDocument();
    expect(getByText("utils.ts")).toBeInTheDocument();
    expect(queryByText(/Show all/)).toBeNull();
  });

  it("shows only 3 files and expand button when 4+ files", () => {
    const files = [
      { path: "src/a.tsx", action: "Created" as const },
      { path: "src/b.tsx", action: "Created" as const },
      { path: "src/c.tsx", action: "Created" as const },
      { path: "src/d.tsx", action: "Edited" as const },
    ];
    const { getByText, queryByText } = render(<FileBadges files={files} />);
    expect(getByText("a.tsx")).toBeInTheDocument();
    expect(getByText("b.tsx")).toBeInTheDocument();
    expect(getByText("c.tsx")).toBeInTheDocument();
    expect(queryByText("d.tsx")).toBeNull();
    expect(getByText("Show all (4)")).toBeInTheDocument();
  });

  it("shows all files and Hide button after clicking expand", () => {
    const files = [
      { path: "src/a.tsx", action: "Created" as const },
      { path: "src/b.tsx", action: "Created" as const },
      { path: "src/c.tsx", action: "Created" as const },
      { path: "src/d.tsx", action: "Edited" as const },
    ];
    const { getByText } = render(<FileBadges files={files} />);
    fireEvent.click(getByText("Show all (4)"));
    expect(getByText("d.tsx")).toBeInTheDocument();
    expect(getByText("Hide")).toBeInTheDocument();
  });

  it("collapses back to 3 after clicking Hide", () => {
    const files = [
      { path: "src/a.tsx", action: "Created" as const },
      { path: "src/b.tsx", action: "Created" as const },
      { path: "src/c.tsx", action: "Created" as const },
      { path: "src/d.tsx", action: "Edited" as const },
    ];
    const { getByText, queryByText } = render(<FileBadges files={files} />);
    fireEvent.click(getByText("Show all (4)"));
    fireEvent.click(getByText("Hide"));
    expect(queryByText("d.tsx")).toBeNull();
    expect(getByText("Show all (4)")).toBeInTheDocument();
  });

  it("extracts filename from path (last segment)", () => {
    const files = [
      { path: "deep/nested/path/component.tsx", action: "Created" as const },
    ];
    const { getByText } = render(<FileBadges files={files} />);
    expect(getByText("component.tsx")).toBeInTheDocument();
  });

  it("shows Created and Edited action text", () => {
    const files = [
      { path: "src/new.tsx", action: "Created" as const },
      { path: "src/old.tsx", action: "Edited" as const },
    ];
    const { getAllByText } = render(<FileBadges files={files} />);
    expect(getAllByText("Created")).toHaveLength(1);
    expect(getAllByText("Edited")).toHaveLength(1);
  });
});
