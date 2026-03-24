import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SuggestedActions } from "../suggested-actions";
import type { FragmentResult } from "../../lib/schema";

const baseFragment = (
  title: string,
  description: string
): FragmentResult => ({
  title,
  description,
  template: "nextjs-developer",
  code: '"use client";\nexport default function App() { return <div />; }',
  file_path: "pages/index.tsx",
  has_additional_dependencies: false,
  port: 3000,
});

describe("SuggestedActions — tool type detection", () => {
  it("shows communication-board chips when title contains 'communication'", () => {
    render(
      <SuggestedActions
        fragment={baseFragment("Communication Board", "AAC board for my child")}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText("Add More Cards")).toBeInTheDocument();
    expect(screen.getByText("Enable Speech")).toBeInTheDocument();
    expect(screen.getByText("Change Grid Size")).toBeInTheDocument();
  });

  it("shows communication-board chips when description contains 'picture card'", () => {
    render(
      <SuggestedActions
        fragment={baseFragment("My Board", "A picture card selector for meals")}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText("Add More Cards")).toBeInTheDocument();
  });

  it("shows token-board chips when title contains 'token'", () => {
    render(
      <SuggestedActions
        fragment={baseFragment("Token Board", "Earn tokens for good behavior")}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText("Change Rewards")).toBeInTheDocument();
    expect(screen.getByText("More Tokens")).toBeInTheDocument();
    expect(screen.getByText("Add Timer")).toBeInTheDocument();
  });

  it("shows token-board chips when description contains 'reward'", () => {
    render(
      <SuggestedActions
        fragment={baseFragment("Points Tracker", "Track reward points for tasks")}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText("Change Rewards")).toBeInTheDocument();
  });

  it("shows visual-schedule chips when title contains 'schedule'", () => {
    render(
      <SuggestedActions
        fragment={baseFragment("Morning Schedule", "Daily routine visual schedule")}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText("Add Steps")).toBeInTheDocument();
    expect(screen.getByText("Reorder Steps")).toBeInTheDocument();
    expect(screen.getByText("Add Images")).toBeInTheDocument();
  });

  it("shows visual-schedule chips when description contains 'routine'", () => {
    render(
      <SuggestedActions
        fragment={baseFragment("Daily Helper", "Helps with morning routine transitions")}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText("Add Steps")).toBeInTheDocument();
  });

  it("shows default chips for an unrecognized tool type", () => {
    render(
      <SuggestedActions
        fragment={baseFragment("Custom Therapy Tool", "Helps with sensory integration")}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText("Make It Bigger")).toBeInTheDocument();
    expect(screen.getByText("Change Colors")).toBeInTheDocument();
    expect(screen.getByText("Add Animation")).toBeInTheDocument();
  });
});

describe("SuggestedActions — chip interactions", () => {
  it("calls onAction with the correct prompt when a chip is clicked", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <SuggestedActions
        fragment={baseFragment("Token Board", "Earn stars for good work")}
        onAction={onAction}
      />
    );

    await user.click(screen.getByText("Change Rewards"));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith(
      "Change the reward options to iPad, playground, and bubbles"
    );
  });

  it("calls onAction with different prompts for different chips", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <SuggestedActions
        fragment={baseFragment("Token Board", "Earn stars for good work")}
        onAction={onAction}
      />
    );

    await user.click(screen.getByText("More Tokens"));
    expect(onAction).toHaveBeenCalledWith("Change to 10 tokens instead of 5");
  });

  it("renders exactly 3 chips", () => {
    render(
      <SuggestedActions
        fragment={baseFragment("Custom Tool", "A sensory activity tracker")}
        onAction={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });
});
