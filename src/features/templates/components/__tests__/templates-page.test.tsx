import { act,fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { TemplatesPage } from "../templates-page";

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
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/core/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

describe("TemplatesPage", () => {
  test("renders page heading", () => {
    render(<TemplatesPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /start with a template/i }),
    ).toBeInTheDocument();
  });

  test("renders description text", () => {
    render(<TemplatesPage />);
    expect(
      screen.getByText(/choose a proven therapy app template/i),
    ).toBeInTheDocument();
  });

  test("renders 4 template cards from seed data", () => {
    render(<TemplatesPage />);
    expect(screen.getByText("Communication Board")).toBeInTheDocument();
    expect(screen.getByText("Morning Routine")).toBeInTheDocument();
    expect(screen.getByText("5-Star Reward Board")).toBeInTheDocument();
    expect(screen.getByText("Going to the Dentist")).toBeInTheDocument();
  });

  test("template cards link to /tools/new", () => {
    render(<TemplatesPage />);
    const links = screen.getAllByRole("link");
    const toolsLinks = links.filter((l) => l.getAttribute("href") === "/tools/new");
    expect(toolsLinks.length).toBeGreaterThanOrEqual(4);
  });

  test("renders 'Have something else in mind?' CTA section", () => {
    render(<TemplatesPage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /have something else in mind/i }),
    ).toBeInTheDocument();
  });

  test("renders 'Create a Tool' CTA link to /tools/new", () => {
    render(<TemplatesPage />);
    const ctaLink = screen.getByRole("link", { name: /create a tool/i });
    expect(ctaLink).toHaveAttribute("href", "/tools/new");
  });

  test("renders 'Click to build' sub-text on each card", () => {
    render(<TemplatesPage />);
    const clickToBuildItems = screen.getAllByText(/click to build/i);
    expect(clickToBuildItems).toHaveLength(4);
  });

  test("category filter shows only matching templates", () => {
    render(<TemplatesPage />);

    // Click the "Reward" category tab
    const rewardTab = screen.getByRole("tab", { name: /reward/i });
    fireEvent.click(rewardTab);

    // Only the reward template should be visible
    expect(screen.getByText("5-Star Reward Board")).toBeInTheDocument();
    expect(screen.queryByText("Communication Board")).not.toBeInTheDocument();
    expect(screen.queryByText("Morning Routine")).not.toBeInTheDocument();
  });

  test("'All' category shows all templates", () => {
    render(<TemplatesPage />);

    // First filter to a specific category
    const rewardTab = screen.getByRole("tab", { name: /reward/i });
    fireEvent.click(rewardTab);
    expect(screen.queryByText("Communication Board")).not.toBeInTheDocument();

    // Then click All to reset
    const allTab = screen.getByRole("tab", { name: /^all$/i });
    fireEvent.click(allTab);
    expect(screen.getByText("Communication Board")).toBeInTheDocument();
    expect(screen.getByText("5-Star Reward Board")).toBeInTheDocument();
  });

  test("search filters templates by title", async () => {
    vi.useFakeTimers();
    render(<TemplatesPage />);

    const searchInput = screen.getByLabelText(/search templates/i);
    fireEvent.change(searchInput, { target: { value: "Communication" } });

    // Advance debounce timer
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("Communication Board")).toBeInTheDocument();
    expect(screen.queryByText("Morning Routine")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  test("search filters templates by description", async () => {
    vi.useFakeTimers();
    render(<TemplatesPage />);

    const searchInput = screen.getByLabelText(/search templates/i);
    fireEvent.change(searchInput, { target: { value: "sentence" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // "sentence builder strip" is in the Communication Board description
    expect(screen.getByText("Communication Board")).toBeInTheDocument();
    expect(screen.queryByText("5-Star Reward Board")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  test("shows empty state when no templates match search", async () => {
    vi.useFakeTimers();
    render(<TemplatesPage />);

    const searchInput = screen.getByLabelText(/search templates/i);
    fireEvent.change(searchInput, { target: { value: "zzzznonexistent" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByTestId("no-results")).toBeInTheDocument();

    vi.useRealTimers();
  });

  test("sort by alphabetical changes order", () => {
    render(<TemplatesPage />);

    const alphaButton = screen.getByRole("button", { name: /a–z/i });
    fireEvent.click(alphaButton);

    const cards = screen.getAllByTestId("template-card");
    // 5-Star Reward Board < Communication Board < Going to the Dentist < Morning Routine
    expect(cards[0]).toHaveTextContent("5-Star Reward Board");
    expect(cards[1]).toHaveTextContent("Communication Board");
  });

  test("renders search input", () => {
    render(<TemplatesPage />);
    expect(screen.getByLabelText(/search templates/i)).toBeInTheDocument();
  });

  test("renders sort toggle buttons", () => {
    render(<TemplatesPage />);
    expect(screen.getByRole("button", { name: /popular/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /newest/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /a–z/i })).toBeInTheDocument();
  });

  test("renders category filter tabs", () => {
    render(<TemplatesPage />);
    expect(screen.getByRole("tab", { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /communication/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /daily living/i })).toBeInTheDocument();
  });
});
