import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SpeechCoachShell } from "../speech-coach-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/speech-coach/setup",
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe("SpeechCoachShell", () => {
  it("renders Sessions, Setup, and Templates navigation for therapists", () => {
    render(
      <SpeechCoachShell>
        <div>Setup content</div>
      </SpeechCoachShell>
    );

    expect(screen.getByRole("link", { name: "Sessions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Setup" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Templates" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Setup" })).toHaveAttribute("aria-current", "page");
  });

  it("does not mark Sessions active when on /speech-coach/setup", () => {
    render(
      <SpeechCoachShell>
        <div>Setup content</div>
      </SpeechCoachShell>
    );

    expect(screen.getByRole("link", { name: "Sessions" })).not.toHaveAttribute("aria-current", "page");
  });

  it("renders children below the nav", () => {
    render(
      <SpeechCoachShell>
        <div>My page content</div>
      </SpeechCoachShell>
    );

    expect(screen.getByText("My page content")).toBeInTheDocument();
  });
});
