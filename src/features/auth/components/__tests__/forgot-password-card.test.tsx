import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ForgotPasswordCard } from "../forgot-password-card";

const mockPush = vi.fn();
const mockSignIn = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: mockSignIn }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("ForgotPasswordCard", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSignIn.mockReset();
  });

  it("shows non-enumerating copy on the reset request step", () => {
    render(<ForgotPasswordCard />);

    expect(
      screen.getByText(
        "Enter your email and, if we find an account, we'll send a reset code.",
      ),
    ).toBeVisible();
  });

  it("advances to verification after a normalized reset request", async () => {
    mockSignIn.mockResolvedValue({ signingIn: false });

    render(<ForgotPasswordCard />);

    fireEvent.change(screen.getByPlaceholderText("Email address"), {
      target: { value: "unknown@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset code" }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("password", {
        email: "unknown@example.com",
        flow: "reset",
      });
    });

    expect(await screen.findByText("Enter reset code")).toBeVisible();
    expect(screen.getByText("We sent a code to unknown@example.com.")).toBeVisible();
  });
});
