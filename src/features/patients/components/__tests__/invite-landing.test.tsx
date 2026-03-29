import { act, render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { InviteLanding } from "../invite-landing";

const mockPush = vi.fn();
const mockAcceptInvite = vi.fn();
const mockInviteInfo = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(() => ({ isSignedIn: false, isLoaded: true })),
}));

vi.mock("../../hooks/use-invite", () => ({
  useInviteInfo: () => mockInviteInfo(),
  useAcceptInvite: () => mockAcceptInvite,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button"> & { asChild?: boolean }) => {
    if (props.asChild) {
      return <>{children}</>;
    }
    return <button {...props}>{children}</button>;
  },
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="material-icon">{icon}</span>,
}));

// Import after mocks
const { useUser } = await import("@clerk/nextjs");
const { toast } = await import("sonner");

async function renderWithSuspense(token: string) {
  // Create an already-resolved promise so React.use() can synchronously unwrap
  const resolved = Promise.resolve({ token });
  // Ensure microtask queue is flushed
  await resolved;

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={<div>Suspense Loading...</div>}>
        <InviteLanding paramsPromise={resolved} />
      </Suspense>,
    );
  });
  return result!;
}

describe("InviteLanding", () => {
  afterEach(() => {
    vi.clearAllMocks();
    // Reset useUser to default (not signed in) after tests that override it
    vi.mocked(useUser).mockReturnValue({
      isSignedIn: false,
      isLoaded: true,
      user: undefined,
    } as ReturnType<typeof useUser>);
  });

  it("shows loading state when invite info is undefined", async () => {
    mockInviteInfo.mockReturnValue(undefined);
    await renderWithSuspense("test-token-123");

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows invalid invite when invite info is null", async () => {
    mockInviteInfo.mockReturnValue(null);
    await renderWithSuspense("expired-token");

    expect(screen.getByText("Invite not found")).toBeInTheDocument();
    expect(
      screen.getByText(/This invite is no longer valid/),
    ).toBeInTheDocument();
  });

  it("shows sign-in prompt when user is not signed in and invite is valid", async () => {
    mockInviteInfo.mockReturnValue({ patientFirstName: "Alex" });
    await renderWithSuspense("valid-token");

    expect(screen.getByText("You're invited")).toBeInTheDocument();
    expect(screen.getByText(/Alex/)).toBeInTheDocument();
    expect(screen.getByText("Accept & Sign Up")).toBeInTheDocument();

    const signUpLink = screen.getByText("Accept & Sign Up").closest("a");
    expect(signUpLink).toHaveAttribute(
      "href",
      "/sign-up?redirect_url=/invite/valid-token",
    );
  });

  it("shows SLP guard when therapist visits invite link", async () => {
    vi.mocked(useUser).mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      user: { id: "user_1", publicMetadata: {} },
    } as ReturnType<typeof useUser>);

    mockInviteInfo.mockReturnValue({ patientFirstName: "Alex" });
    await renderWithSuspense("valid-token");

    expect(screen.getByText(/This invite is for caregivers/i)).toBeInTheDocument();
    expect(mockAcceptInvite).not.toHaveBeenCalled();
  });

  it("auto-accepts invite when caregiver is signed in and invite is valid", async () => {
    vi.mocked(useUser).mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      user: { id: "user_1", publicMetadata: { role: "caregiver" } },
    } as ReturnType<typeof useUser>);

    mockInviteInfo.mockReturnValue({ patientFirstName: "Alex" });
    mockAcceptInvite.mockResolvedValue(undefined);

    await renderWithSuspense("valid-token");

    await waitFor(() => {
      expect(mockAcceptInvite).toHaveBeenCalledWith({ token: "valid-token" });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("You're connected!");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows error toast when accept invite fails", async () => {
    vi.mocked(useUser).mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      user: { id: "user_1", publicMetadata: { role: "caregiver" } },
    } as ReturnType<typeof useUser>);

    mockInviteInfo.mockReturnValue({ patientFirstName: "Alex" });
    mockAcceptInvite.mockRejectedValue(new Error("Network error"));

    await renderWithSuspense("valid-token");

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to accept invite. Please try again.",
      );
    });
  });

  it("shows accepting state while invite is being processed", async () => {
    vi.mocked(useUser).mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      user: { id: "user_1", publicMetadata: { role: "caregiver" } },
    } as ReturnType<typeof useUser>);

    mockInviteInfo.mockReturnValue({ patientFirstName: "Alex" });
    // Never-resolving promise to keep it in accepting state
    mockAcceptInvite.mockReturnValue(new Promise(() => {}));

    await renderWithSuspense("valid-token");

    await waitFor(() => {
      expect(screen.getByText("Connecting you...")).toBeInTheDocument();
    });
  });

  it("renders learn more link", async () => {
    mockInviteInfo.mockReturnValue({ patientFirstName: "Alex" });
    await renderWithSuspense("valid-token");

    expect(screen.getByText("Learn More")).toBeInTheDocument();
    const learnMoreLink = screen.getByText("Learn More").closest("a");
    expect(learnMoreLink).toHaveAttribute("href", "/");
  });
});
