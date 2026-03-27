"use client";

import { useState } from "react";
import { cn } from "@/core/utils";
import { Input } from "@/shared/components/ui/input";
import type { InterviewQuestion as IQ } from "../../lib/interview/types";

interface InterviewQuestionProps {
  question: IQ;
  onAnswer: (questionId: string, value: string | string[]) => void;
}

export function InterviewQuestion({ question, onAnswer }: InterviewQuestionProps) {
  const [textValue, setTextValue] = useState("");

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && textValue.trim()) {
      onAnswer(question.id, textValue.trim());
      setTextValue("");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Question bubble — assistant style matching chat-panel.tsx AssistantBubble */}
      <div className="flex justify-start">
        <div className="max-w-[85%] break-words rounded-2xl rounded-bl-md border border-outline-variant/15 bg-surface-container px-4 py-3">
          <p className="text-sm text-foreground">{question.text}</p>
        </div>
      </div>

      {/* Answer UI */}
      {question.type === "chips" && question.options && (
        <div className="flex flex-wrap gap-2 pl-1">
          {question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAnswer(question.id, option.value)}
              className={cn(
                "rounded-full border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-medium text-foreground",
                "hover:bg-primary/15 hover:border-primary/40 hover:shadow-sm active:scale-[0.97]",
                "transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {question.type === "text" && (
        <div className="pl-1">
          <Input
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={handleTextKeyDown}
            placeholder="Type your answer and press Enter…"
          />
        </div>
      )}

      {question.type === "select" && question.options && (
        <div className="flex flex-wrap gap-2 pl-1">
          {question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAnswer(question.id, option.value)}
              className={cn(
                "rounded-full border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-medium text-foreground",
                "hover:bg-primary/15 hover:border-primary/40 hover:shadow-sm active:scale-[0.97]",
                "transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
