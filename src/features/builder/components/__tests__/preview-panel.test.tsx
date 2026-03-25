import { fireEvent,render, screen } from "@testing-library/react";

import { PreviewPanel } from "../preview-panel";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({
    children,
  }: {
    children: React.ReactNode;
    mode?: string;
  }) => <>{children}</>,
}));

describe("PreviewPanel", () => {
  it("shows placeholder when session is null", () => {
    render(<PreviewPanel session={null} />);
    expect(
      screen.getByText("Your tool will appear here")
    ).toBeInTheDocument();
  });

  it("shows placeholder when session has no previewUrl", () => {
    render(<PreviewPanel session={{ state: "idle" }} />);
    expect(
      screen.getByText("Your tool will appear here")
    ).toBeInTheDocument();
  });

  it("shows stateMessage in placeholder when available", () => {
    render(
      <PreviewPanel
        session={{ state: "generating", stateMessage: "Building phase 1..." }}
      />
    );
    expect(screen.getByText("Building phase 1...")).toBeInTheDocument();
  });

  it("shows deploying spinner text when state is deploying", () => {
    render(<PreviewPanel session={{ state: "deploying" }} />);
    expect(screen.getByText("Deploying to preview...")).toBeInTheDocument();
  });

  it("does not render iframe when deploying", () => {
    render(<PreviewPanel session={{ state: "deploying" }} />);
    expect(screen.queryByTitle("App Preview")).toBeNull();
  });

  it("renders iframe when previewUrl exists", () => {
    render(
      <PreviewPanel
        session={{
          state: "complete",
          previewUrl: "https://sandbox.e2b.app/preview",
        }}
      />
    );
    const iframe = screen.getByTitle("App Preview");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      "https://sandbox.e2b.app/preview"
    );
  });

  it("renders all three device toggle buttons", () => {
    render(<PreviewPanel session={null} />);
    expect(screen.getByRole("button", { name: /Mobile/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tablet/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Desktop/ })
    ).toBeInTheDocument();
  });

  it("Desktop button is active by default (has bg-primary class)", () => {
    render(<PreviewPanel session={null} />);
    // shadcn Button variant="default" compiles to bg-primary; "ghost" compiles to hover:bg-accent
    const desktopBtn = screen.getByRole("button", { name: /Desktop/ });
    expect(desktopBtn.className).toContain("bg-primary");
  });

  it("Mobile and Tablet buttons are inactive by default (no bg-primary)", () => {
    render(<PreviewPanel session={null} />);
    const mobileBtn = screen.getByRole("button", { name: /Mobile/ });
    const tabletBtn = screen.getByRole("button", { name: /Tablet/ });
    expect(mobileBtn.className).not.toContain("bg-primary");
    expect(tabletBtn.className).not.toContain("bg-primary");
  });

  it("clicking Mobile button makes it active (bg-primary) and Desktop inactive", () => {
    render(<PreviewPanel session={null} />);
    const mobileBtn = screen.getByRole("button", { name: /Mobile/ });
    const desktopBtn = screen.getByRole("button", { name: /Desktop/ });

    fireEvent.click(mobileBtn);

    expect(mobileBtn.className).toContain("bg-primary");
    expect(desktopBtn.className).not.toContain("bg-primary");
  });

  it("clicking Tablet button makes it active", () => {
    render(<PreviewPanel session={null} />);
    const tabletBtn = screen.getByRole("button", { name: /Tablet/ });
    fireEvent.click(tabletBtn);
    expect(tabletBtn.className).toContain("bg-primary");
  });
});
