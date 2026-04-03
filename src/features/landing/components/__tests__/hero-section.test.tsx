import { render, screen } from "@testing-library/react";

import { HeroSection } from "../hero-section";

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({
    signIn: vi.fn().mockResolvedValue({}),
    signOut: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("HeroSection", () => {
  it("renders the headline text", () => {
    render(<HeroSection />);
    expect(screen.getByText(/Describe it/)).toBeInTheDocument();
    expect(screen.getByText(/It's built/)).toBeInTheDocument();
  });

  it("renders the description paragraph", () => {
    render(<HeroSection />);
    expect(
      screen.getByText(
        /Custom therapy tools for SLPs and families/
      )
    ).toBeInTheDocument();
  });

  it("renders the auth actions", () => {
    render(<HeroSection />);
    expect(
      screen.getByRole("button", { name: /Continue with Google/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Sign in$/i })).toBeInTheDocument();
  });

  it("renders clear sign-in paths for therapists and caregivers", () => {
    render(<HeroSection />);
    expect(screen.getByRole("link", { name: /Therapist/i })).toHaveAttribute(
      "href",
      "/sign-in?role=slp",
    );
    expect(screen.getByRole("link", { name: /Caregiver/i })).toHaveAttribute(
      "href",
      "/sign-in?role=caregiver",
    );
  });
});
