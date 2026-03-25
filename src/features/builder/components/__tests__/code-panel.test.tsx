import { fireEvent,render, screen } from "@testing-library/react";

import { CodePanel } from "../code-panel";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("prism-react-renderer", () => ({
  Highlight: ({
    children,
    code,
  }: {
    children: (args: {
      style: object;
      tokens: { content: string; types: string[] }[][];
      getLineProps: () => object;
      getTokenProps: () => object;
    }) => React.ReactNode;
    code: string;
  }) =>
    children({
      style: {},
      tokens: [[{ content: code, types: ["plain"] }]],
      getLineProps: () => ({}),
      getTokenProps: () => ({}),
    }),
  themes: { nightOwl: {} },
}));

vi.mock("../../hooks/use-session", () => ({
  useSessionFiles: vi.fn(() => null),
}));

import { useSessionFiles } from "../../hooks/use-session";

describe("CodePanel", () => {
  beforeEach(() => {
    vi.mocked(useSessionFiles).mockReturnValue(null);
  });

  it("shows empty state when sessionId is null", () => {
    render(<CodePanel sessionId={null} />);
    expect(
      screen.getByText("Files will appear here as your app is built.")
    ).toBeInTheDocument();
  });

  it("shows empty state when files array is empty", () => {
    vi.mocked(useSessionFiles).mockReturnValue(
      [] as ReturnType<typeof useSessionFiles>
    );
    render(<CodePanel sessionId={"s1" as Parameters<typeof CodePanel>[0]["sessionId"]} />);
    expect(
      screen.getByText("Files will appear here as your app is built.")
    ).toBeInTheDocument();
  });

  it("shows skeleton loading state when session is generating and no files", () => {
    vi.mocked(useSessionFiles).mockReturnValue(
      [] as ReturnType<typeof useSessionFiles>
    );
    render(
      <CodePanel
        sessionId={"s1" as Parameters<typeof CodePanel>[0]["sessionId"]}
        session={{ state: "phase_generating" }}
      />
    );
    // Skeletons render via shadcn Skeleton — check they exist
    const skeletons = document.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders file list from query", () => {
    const files = [
      {
        _id: "f1",
        path: "src/App.tsx",
        contents: "export default function App() {}",
        sessionId: "s1",
      },
      {
        _id: "f2",
        path: "src/styles.css",
        contents: "body { margin: 0; }",
        sessionId: "s1",
      },
    ];
    vi.mocked(useSessionFiles).mockReturnValue(
      files as ReturnType<typeof useSessionFiles>
    );
    render(
      <CodePanel sessionId={"s1" as Parameters<typeof CodePanel>[0]["sessionId"]} />
    );
    expect(screen.getByText("App.tsx")).toBeInTheDocument();
    expect(screen.getByText("styles.css")).toBeInTheDocument();
  });

  it("clicking a file shows its path header", () => {
    const files = [
      {
        _id: "f1",
        path: "src/App.tsx",
        contents: "export default function App() {}",
        sessionId: "s1",
      },
    ];
    vi.mocked(useSessionFiles).mockReturnValue(
      files as ReturnType<typeof useSessionFiles>
    );
    render(
      <CodePanel sessionId={"s1" as Parameters<typeof CodePanel>[0]["sessionId"]} />
    );
    // Before clicking: shows select a file message
    expect(screen.getByText("Select a file to view its contents.")).toBeInTheDocument();

    fireEvent.click(screen.getByText("App.tsx"));

    // After clicking: path header appears (file path shown above the code)
    expect(screen.getByText("src/App.tsx")).toBeInTheDocument();
    // The Highlight component renders a <pre> block for the code
    expect(document.querySelector("pre")).toBeInTheDocument();
  });

  it("shows correct icon for .tsx files (code icon)", () => {
    const files = [
      {
        _id: "f1",
        path: "src/App.tsx",
        contents: "",
        sessionId: "s1",
      },
    ];
    vi.mocked(useSessionFiles).mockReturnValue(
      files as ReturnType<typeof useSessionFiles>
    );
    render(
      <CodePanel sessionId={"s1" as Parameters<typeof CodePanel>[0]["sessionId"]} />
    );
    // material-symbols "code" icon spans should be rendered
    const iconSpans = document
      .querySelectorAll(".material-symbols-outlined");
    const codeIcons = Array.from(iconSpans).filter(
      (el) => el.textContent?.trim() === "code"
    );
    expect(codeIcons.length).toBeGreaterThan(0);
  });

  it("shows correct icon for .css files (palette icon)", () => {
    const files = [
      {
        _id: "f1",
        path: "src/styles.css",
        contents: "",
        sessionId: "s1",
      },
    ];
    vi.mocked(useSessionFiles).mockReturnValue(
      files as ReturnType<typeof useSessionFiles>
    );
    render(
      <CodePanel sessionId={"s1" as Parameters<typeof CodePanel>[0]["sessionId"]} />
    );
    const iconSpans = document.querySelectorAll(".material-symbols-outlined");
    const paletteIcons = Array.from(iconSpans).filter(
      (el) => el.textContent?.trim() === "palette"
    );
    expect(paletteIcons.length).toBeGreaterThan(0);
  });

  it("shows correct icon for .json files (data_object icon)", () => {
    const files = [
      {
        _id: "f1",
        path: "config.json",
        contents: "{}",
        sessionId: "s1",
      },
    ];
    vi.mocked(useSessionFiles).mockReturnValue(
      files as ReturnType<typeof useSessionFiles>
    );
    render(
      <CodePanel sessionId={"s1" as Parameters<typeof CodePanel>[0]["sessionId"]} />
    );
    const iconSpans = document.querySelectorAll(".material-symbols-outlined");
    const dataObjectIcons = Array.from(iconSpans).filter(
      (el) => el.textContent?.trim() === "data_object"
    );
    expect(dataObjectIcons.length).toBeGreaterThan(0);
  });
});
