import { fireEvent,render } from "@testing-library/react";

import { EmptyState } from "../empty-state";

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

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, asChild, ...props }: any) => {
    if (asChild) return <>{children}</>;
    return (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    );
  },
}));

describe("EmptyState", () => {
  it("renders title and description", () => {
    const { getByText } = render(
      <EmptyState
        variant="no-projects"
        title="No apps yet"
        description="Create your first app"
      />
    );
    expect(getByText("No apps yet")).toBeInTheDocument();
    expect(getByText("Create your first app")).toBeInTheDocument();
  });

  it("renders accent icon for no-projects variant", () => {
    const { getAllByTestId } = render(
      <EmptyState
        variant="no-projects"
        title="No apps"
        description="desc"
      />
    );
    const icons = getAllByTestId("icon").map((el) => el.textContent);
    expect(icons).toContain("add");
  });

  it("renders error-container div for error variant", () => {
    const { container } = render(
      <EmptyState
        variant="error"
        title="Error"
        description="Something broke"
      />
    );
    const errorContainer = container.querySelector(".bg-error-container");
    expect(errorContainer).not.toBeNull();
  });

  it("renders a link when primary action has href", () => {
    const { getByRole } = render(
      <EmptyState
        variant="no-projects"
        title="No apps"
        description="desc"
        primaryAction={{ label: "Create app", href: "/new" }}
      />
    );
    const link = getByRole("link", { name: "Create app" });
    expect(link).toHaveAttribute("href", "/new");
  });

  it("renders a button that calls onClick when primary action has onClick", () => {
    const onClick = vi.fn();
    const { getByRole } = render(
      <EmptyState
        variant="no-projects"
        title="No apps"
        description="desc"
        primaryAction={{ label: "Create app", onClick }}
      />
    );
    fireEvent.click(getByRole("button", { name: "Create app" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders secondary action alongside primary", () => {
    const { getByText } = render(
      <EmptyState
        variant="no-projects"
        title="No apps"
        description="desc"
        primaryAction={{ label: "Primary" }}
        secondaryAction={{ label: "Secondary" }}
      />
    );
    expect(getByText("Primary")).toBeInTheDocument();
    expect(getByText("Secondary")).toBeInTheDocument();
  });

  it("does not render action section when no actions provided", () => {
    const { queryByRole } = render(
      <EmptyState
        variant="no-projects"
        title="No apps"
        description="desc"
      />
    );
    expect(queryByRole("button")).toBeNull();
    expect(queryByRole("link")).toBeNull();
  });
});
