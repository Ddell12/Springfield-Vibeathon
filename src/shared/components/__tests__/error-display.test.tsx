import { fireEvent,render } from "@testing-library/react";

import { ErrorDisplay } from "../error-display";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid="icon">{icon}</span>
  ),
}));

const defaultError = new Error("Something exploded");
const defaultReset = vi.fn();

describe("ErrorDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders default title and subtitle", () => {
    const { getByText } = render(
      <ErrorDisplay error={defaultError} reset={defaultReset} />
    );
    expect(getByText("Something went wrong")).toBeInTheDocument();
    expect(getByText("An unexpected error occurred.")).toBeInTheDocument();
  });

  it("renders custom title and subtitle", () => {
    const { getByText } = render(
      <ErrorDisplay
        title="Custom Title"
        subtitle="Custom subtitle"
        error={defaultError}
        reset={defaultReset}
      />
    );
    expect(getByText("Custom Title")).toBeInTheDocument();
    expect(getByText("Custom subtitle")).toBeInTheDocument();
  });

  it("shows error.message when showErrorMessage=true", () => {
    const { getByText } = render(
      <ErrorDisplay
        showErrorMessage={true}
        error={defaultError}
        reset={defaultReset}
      />
    );
    expect(getByText("Something exploded")).toBeInTheDocument();
  });

  it("does not show Go home link when homeLink=false", () => {
    const { queryByRole } = render(
      <ErrorDisplay homeLink={false} error={defaultError} reset={defaultReset} />
    );
    expect(queryByRole("link", { name: "Go home" })).toBeNull();
  });

  it("shows Go home link with href='/' when homeLink=true (default)", () => {
    const { getByRole } = render(
      <ErrorDisplay error={defaultError} reset={defaultReset} />
    );
    const link = getByRole("link", { name: "Go home" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("calls reset when Try again button is clicked", () => {
    const reset = vi.fn();
    const { getByText } = render(
      <ErrorDisplay error={defaultError} reset={reset} />
    );
    fireEvent.click(getByText("Try again"));
    expect(reset).toHaveBeenCalled();
  });
});
