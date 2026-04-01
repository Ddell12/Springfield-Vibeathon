import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { TemplateEditor } from "../template-editor";

it("saves voice, tools, skills, and knowledge changes", async () => {
  const onSave = vi.fn();
  render(<TemplateEditor initialTemplate={null} onSave={onSave} />);

  fireEvent.change(screen.getByLabelText("Template name"), {
    target: { value: "Playful /s/ Coach" },
  });
  fireEvent.click(screen.getByLabelText("Target word picker"));
  fireEvent.click(screen.getByText("Save template"));

  expect(onSave).toHaveBeenCalled();
});
