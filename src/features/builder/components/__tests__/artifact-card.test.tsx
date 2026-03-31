import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

import { ArtifactCard } from "../artifact-card";

describe("ArtifactCard", () => {
  it("renders the app title", () => {
    render(<ArtifactCard title="AAC Board" isGenerating={false} />);
    expect(screen.getByText("AAC Board")).toBeInTheDocument();
  });

  it("renders 'Therapy app' subtitle", () => {
    render(<ArtifactCard title="Token Board" isGenerating={false} />);
    expect(screen.getByText("Therapy app")).toBeInTheDocument();
  });

  it("shows spinner with role=status when isGenerating is true", () => {
    render(<ArtifactCard title="AAC Board" isGenerating={true} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does NOT show spinner when isGenerating is false", () => {
    render(<ArtifactCard title="AAC Board" isGenerating={false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
