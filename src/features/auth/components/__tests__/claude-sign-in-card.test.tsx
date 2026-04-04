import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ClaudeSignInCard } from "../claude-sign-in-card";

const mockPush = vi.fn();
const mockSignIn = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: mockSignIn }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("ClaudeSignInCard", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSignIn.mockReset();
  });

  it("shows a generic error when password sign-in resolves without signing in", async () => {
    mockSignIn.mockResolvedValue({ signingIn: false });

    render(<ClaudeSignInCard role="slp" />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "therapist@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("password", {
        email: "therapist@example.com",
        password: "wrong-password",
        flow: "signIn",
      });
    });

    expect(await screen.findByText("Invalid email or password.")).toBeVisible();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirects after a successful password sign-in", async () => {
    mockSignIn.mockResolvedValue({ signingIn: true });

    render(<ClaudeSignInCard role="slp" />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "therapist@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
