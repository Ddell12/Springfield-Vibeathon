import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// error.tsx is a "use client" component at src/app/error.tsx
// Import using relative path from this __tests__ directory
import ErrorPage from "../error";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

describe("ErrorPage", () => {
  const mockError = new Error("Something went wrong");
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders error message text", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    // Should display some error text to the user
    expect(
      screen.getByText(/something went wrong|error|oops/i)
    ).toBeInTheDocument();
  });

  it("renders a Try again button that calls reset()", async () => {
    const user = userEvent.setup();
    render(<ErrorPage error={mockError} reset={mockReset} />);

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();

    await user.click(tryAgainButton);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("renders a link back to the home page", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    const homeLink = screen.getByRole("link", { name: /home|go home/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
