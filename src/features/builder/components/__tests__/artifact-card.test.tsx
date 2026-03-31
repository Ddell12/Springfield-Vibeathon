import { fireEvent,render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ArtifactCard } from "../artifact-card";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

describe("ArtifactCard", () => {
  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<ArtifactCard title="My App" isGenerating={false} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it("shows open_in_new icon when onClick provided", () => {
    render(<ArtifactCard title="My App" isGenerating={false} onClick={vi.fn()} />);
    expect(screen.getByTestId("icon")).toHaveTextContent("open_in_new");
  });
  it("shows no spinner when not generating", () => {
    render(<ArtifactCard title="My App" isGenerating={false} onClick={vi.fn()} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("shows spinner when generating", () => {
    render(<ArtifactCard title="My App" isGenerating={true} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
  it("button is not disabled when onClick is not provided", () => {
    render(<ArtifactCard title="My App" isGenerating={false} />);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });
});
