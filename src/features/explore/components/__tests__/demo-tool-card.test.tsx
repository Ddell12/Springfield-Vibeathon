import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { DemoToolCard } from "../demo-tool-card";

vi.mock("@/core/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`}>{icon}</span>
  ),
}));

const mockTool = {
  title: "Communication Board",
  description: "A picture-based AAC board",
  categoryLabel: "Communication",
  icon: "chat",
  gradient: "from-primary to-primary-container",
};

describe("DemoToolCard", () => {
  test("renders title and description", () => {
    render(<DemoToolCard {...mockTool} onTryIt={() => {}} />);
    expect(screen.getByText("Communication Board")).toBeInTheDocument();
    expect(screen.getByText("A picture-based AAC board")).toBeInTheDocument();
  });

  test("renders category tag", () => {
    render(<DemoToolCard {...mockTool} onTryIt={() => {}} />);
    expect(screen.getByText("Communication")).toBeInTheDocument();
  });

  test("calls onTryIt when 'Try It' button is clicked", () => {
    const onTryIt = vi.fn();
    render(<DemoToolCard {...mockTool} onTryIt={onTryIt} />);
    fireEvent.click(screen.getByRole("button", { name: /try it/i }));
    expect(onTryIt).toHaveBeenCalledOnce();
  });

  test("renders disabled state with Coming Soon badge", () => {
    render(<DemoToolCard {...mockTool} onTryIt={() => {}} disabled />);
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try it/i })).toBeDisabled();
  });
});
