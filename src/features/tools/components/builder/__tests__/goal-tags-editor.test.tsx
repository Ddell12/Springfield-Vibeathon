import { fireEvent,render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@convex/_generated/api", () => ({ api: { tools: { update: "tools:update" } } }));

import type { Id } from "@convex/_generated/dataModel";

import { GoalTagsEditor } from "../goal-tags-editor";

describe("GoalTagsEditor", () => {
  const instanceId = "inst-1" as Id<"app_instances">;

  it("renders existing tags as pills", () => {
    render(<GoalTagsEditor instanceId={instanceId} initialTags={["articulation", "/s/ production"]} />);
    expect(screen.getByText("articulation")).toBeInTheDocument();
    expect(screen.getByText("/s/ production")).toBeInTheDocument();
  });

  it("adds a new tag on Enter", () => {
    render(<GoalTagsEditor instanceId={instanceId} initialTags={[]} />);
    const input = screen.getByPlaceholderText(/add a goal/i);
    fireEvent.change(input, { target: { value: "requesting" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("requesting")).toBeInTheDocument();
  });

  it("removes a tag when × is clicked", () => {
    render(<GoalTagsEditor instanceId={instanceId} initialTags={["articulation"]} />);
    fireEvent.click(screen.getByRole("button", { name: /remove articulation/i }));
    expect(screen.queryByText("articulation")).not.toBeInTheDocument();
  });

  it("does not add empty or duplicate tags", () => {
    render(<GoalTagsEditor instanceId={instanceId} initialTags={["requesting"]} />);
    const input = screen.getByPlaceholderText(/add a goal/i);
    fireEvent.change(input, { target: { value: "requesting" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getAllByText("requesting").length).toBe(1);
  });
});
