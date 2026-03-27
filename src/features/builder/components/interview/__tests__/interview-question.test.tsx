import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { InterviewQuestion as IQ } from "../../../lib/interview/types";
import { InterviewQuestion } from "../interview-question";

describe("InterviewQuestion", () => {
  const chipsQuestion: IQ = {
    id: "age_range",
    text: "Who will use this app?",
    type: "chips",
    options: [
      { label: "Toddler (1-3)", value: "toddler" },
      { label: "Preschool (3-5)", value: "preschool" },
    ],
    required: true,
    phase: "essential",
  };

  const textQuestion: IQ = {
    id: "custom_words",
    text: "Type your custom words",
    type: "text",
    required: true,
    phase: "essential",
  };

  it("renders the question text", () => {
    const { getByText } = render(
      <InterviewQuestion question={chipsQuestion} onAnswer={vi.fn()} />,
    );
    expect(getByText("Who will use this app?")).toBeInTheDocument();
  });

  it("renders chip options with labels", () => {
    const { getByText } = render(
      <InterviewQuestion question={chipsQuestion} onAnswer={vi.fn()} />,
    );
    expect(getByText("Toddler (1-3)")).toBeInTheDocument();
    expect(getByText("Preschool (3-5)")).toBeInTheDocument();
  });

  it("calls onAnswer with value (not label) when chip clicked", () => {
    const onAnswer = vi.fn();
    const { getByText } = render(
      <InterviewQuestion question={chipsQuestion} onAnswer={onAnswer} />,
    );
    fireEvent.click(getByText("Preschool (3-5)"));
    expect(onAnswer).toHaveBeenCalledWith("age_range", "preschool");
  });

  it("renders text input for text type questions", () => {
    const { getByRole } = render(
      <InterviewQuestion question={textQuestion} onAnswer={vi.fn()} />,
    );
    expect(getByRole("textbox")).toBeInTheDocument();
  });

  it("submits text input on Enter", () => {
    const onAnswer = vi.fn();
    const { getByRole } = render(
      <InterviewQuestion question={textQuestion} onAnswer={onAnswer} />,
    );
    const input = getByRole("textbox");
    fireEvent.change(input, { target: { value: "hello, help, more" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAnswer).toHaveBeenCalledWith("custom_words", "hello, help, more");
  });
});
