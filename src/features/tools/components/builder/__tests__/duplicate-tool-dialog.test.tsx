import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn().mockReturnValue(vi.fn()),
  useQuery: vi.fn().mockReturnValue([
    { _id: "p1", firstName: "Liam", lastName: "Smith" },
  ]),
}));
vi.mock("next/navigation", () => ({ useRouter: vi.fn().mockReturnValue({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DuplicateToolDialog } from "../duplicate-tool-dialog";

describe("DuplicateToolDialog", () => {
  it("renders patient options", () => {
    render(
      <DuplicateToolDialog
        appInstanceId={"app1" as any}
        open={true}
        onOpenChange={vi.fn()}
      />
    );
    expect(screen.getByText("Duplicate App")).toBeInTheDocument();
    expect(screen.getByText("Copy to child")).toBeInTheDocument();
  });

  it("disables confirm when no patient selected", () => {
    render(
      <DuplicateToolDialog
        appInstanceId={"app1" as any}
        open={true}
        onOpenChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Duplicate" })).toBeDisabled();
  });
});
