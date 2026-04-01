import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { TemplateAssignmentCard } from "../template-assignment-card";

it("lets the SLP assign a template and save child overrides", async () => {
  const onSave = vi.fn();
  render(
    <TemplateAssignmentCard
      templates={[{ _id: "t1" as any, name: "Playful /s/ Coach", version: 2 }]}
      value={null}
      onSave={onSave}
    />
  );

  fireEvent.click(screen.getByText("Playful /s/ Coach"));
  fireEvent.change(screen.getByLabelText("Child notes"), {
    target: { value: "Prefers animals and trucks" },
  });
  fireEvent.click(screen.getByText("Save assignment"));

  expect(onSave).toHaveBeenCalled();
});
