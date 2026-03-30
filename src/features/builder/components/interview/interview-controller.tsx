"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

import { useInterview } from "../../hooks/use-interview";
import { assembleBlueprint } from "../../lib/interview/blueprint-assembler";
import {
  getCategoryById,
  getEssentialQuestions,
  getExtendedQuestions,
} from "../../lib/interview/categories";
import type { InterviewQuestion as IQ } from "../../lib/interview/types";
import type { TherapyBlueprint } from "../../lib/schemas";
import { BlueprintApprovalCard } from "./blueprint-approval-card";
import { CategoryPicker } from "./category-picker";
import { InterviewQuestion } from "./interview-question";

interface InterviewControllerProps {
  onGenerate: (prompt: string, blueprint: TherapyBlueprint) => void;
  onEscapeHatch?: () => void;
}

/** Renders previously answered questions as locked chat bubbles */
function AnsweredQuestions({
  questions,
  answers,
}: {
  questions: IQ[];
  answers: Record<string, string | string[]>;
}) {
  return (
    <>
      {questions.map((q) => {
        const raw = answers[q.id];
        const displayValue = Array.isArray(raw) ? raw.join(", ") : (raw ?? "");
        const option = q.options?.find((o) => o.value === displayValue);
        const label = option?.label ?? displayValue;

        return (
          <div key={q.id} className="flex flex-col gap-2">
            <div className="flex justify-start">
              <div className="max-w-[85%] break-words rounded-2xl rounded-bl-md bg-surface-container px-4 py-3">
                <p className="text-sm text-foreground">{q.text}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[85%] break-words rounded-2xl rounded-br-md bg-primary/15 px-4 py-2">
                <p className="text-sm font-medium text-foreground">{label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Category intro header shown at the top of the interview */
function CategoryHeader({ categoryId }: { categoryId: string }) {
  const category = getCategoryById(categoryId);
  if (!category) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-primary/5 px-5 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
        <MaterialIcon icon={category.icon} size="sm" className="text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-primary">
          Let&apos;s build a {category.label}!
        </p>
        <p className="text-xs text-on-surface-variant">{category.description}</p>
      </div>
    </div>
  );
}

export function InterviewController({
  onGenerate,
  onEscapeHatch,
}: InterviewControllerProps) {
  const {
    state,
    selectCategory,
    answer,
    showGate,
    chooseCustomize,
    chooseSkip,
    setFollowUps,
    showReview,
    reEnter,
  } = useInterview();

  // Auto-advance when all questions in a phase are answered
  useEffect(() => {
    if (state.phase === "essential" && state.category) {
      const questions = getEssentialQuestions(state.category);
      if (state.currentQuestionIndex >= questions.length) {
        showGate();
      }
    }
    if (state.phase === "extended" && state.category) {
      const questions = getExtendedQuestions(state.category);
      if (state.currentQuestionIndex >= questions.length) {
        chooseSkip();
      }
    }
  }, [state.currentQuestionIndex, state.phase, state.category, showGate, chooseSkip]);

  // Trigger follow-up fetch when entering followup phase
  useEffect(() => {
    if (state.phase !== "followup") return;

    let cancelled = false;

    const doFetch = async () => {
      try {
        const res = await fetch("/api/interview-followup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: state.category,
            answers: state.answers,
            freeformNotes: state.freeformNotes,
          }),
        });

        if (cancelled) return;

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (cancelled) return;
        const followUps = Array.isArray(data.followUps) ? data.followUps : [];
        const draftBlueprint =
          data.blueprint != null && typeof data.blueprint === "object"
            ? data.blueprint
            : null;

        if (followUps.length > 0) {
          setFollowUps(followUps, draftBlueprint);
        } else {
          const { blueprint, richPrompt } = assembleBlueprint(
            state.category!,
            state.answers,
            draftBlueprint,
          );
          showReview(blueprint, richPrompt);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("[interview] Follow-up fetch failed:", err);
        toast.error("Couldn't load suggestions, building with your answers.");
        try {
          const { blueprint, richPrompt } = assembleBlueprint(
            state.category!,
            state.answers,
            null,
          );
          showReview(blueprint, richPrompt);
        } catch {
          // If assembly also fails, stay in followup phase
        }
      }
    };

    void doFetch();

    return () => {
      cancelled = true;
    };
  // Only re-fetch when phase changes, not on full state updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // When in followup phase with follow-up questions and all are answered, assemble
  useEffect(() => {
    if (
      state.phase === "followup" &&
      state.followUpQuestions.length > 0 &&
      state.currentQuestionIndex >= state.followUpQuestions.length
    ) {
      const { blueprint, richPrompt } = assembleBlueprint(
        state.category!,
        state.answers,
        state.draftBlueprint,
      );
      showReview(blueprint, richPrompt);
    }
  }, [
    state.phase,
    state.currentQuestionIndex,
    state.followUpQuestions.length,
    state.category,
    state.answers,
    state.draftBlueprint,
    showReview,
  ]);

  const handleAnswer = (questionId: string, value: string | string[]) => {
    answer(questionId, value);
  };

  const handleApprove = () => {
    onGenerate(state.richPrompt!, state.draftBlueprint!);
  };

  // Phase: category_select
  if (state.phase === "category_select") {
    return (
      <CategoryPicker
        onSelect={selectCategory}
        onEscapeHatch={onEscapeHatch ?? (() => {})}
      />
    );
  }

  // All answered essential questions (shared across gate/extended/followup/review phases)
  const essentialQuestions = state.category ? getEssentialQuestions(state.category) : [];
  const answeredEssentialQuestions = essentialQuestions.filter((q) => q.id in state.answers);

  // Phase: essential
  if (state.phase === "essential" && state.category) {
    const currentQuestion = essentialQuestions[state.currentQuestionIndex];
    const answeredQuestions = essentialQuestions.slice(0, state.currentQuestionIndex);

    return (
      <div className="flex flex-col gap-4">
        <CategoryHeader categoryId={state.category} />
        <AnsweredQuestions questions={answeredQuestions} answers={state.answers} />
        {currentQuestion && (
          <InterviewQuestion
            question={currentQuestion}
            onAnswer={handleAnswer}
          />
        )}
      </div>
    );
  }

  // Phase: gate — show full conversation history above the gate message
  if (state.phase === "gate" && state.category) {
    return (
      <div className="flex flex-col gap-4">
        <CategoryHeader categoryId={state.category} />
        <AnsweredQuestions questions={answeredEssentialQuestions} answers={state.answers} />

        <div className="flex justify-start">
          <div className="max-w-[85%] break-words rounded-2xl rounded-bl-md bg-surface-container px-4 py-3">
            <p className="text-sm text-foreground">
              I have enough to get started! Want to customize further?
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pl-1">
          <button
            type="button"
            onClick={chooseSkip}
            className="rounded-xl bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5"
          >
            Show me the plan
          </button>
          <button
            type="button"
            onClick={chooseCustomize}
            className="rounded-xl bg-surface-container px-5 py-2.5 text-sm font-medium text-on-surface-variant transition-all duration-300 hover:bg-surface-container-high hover:-translate-y-0.5"
          >
            Customize more
          </button>
        </div>
      </div>
    );
  }

  // Phase: extended — show essential history + extended questions
  if (state.phase === "extended" && state.category) {
    const extendedQuestions = getExtendedQuestions(state.category);
    const answeredExtendedQuestions = extendedQuestions.slice(0, state.currentQuestionIndex);
    const currentQuestion = extendedQuestions[state.currentQuestionIndex];

    return (
      <div className="flex flex-col gap-4">
        <CategoryHeader categoryId={state.category} />
        <AnsweredQuestions questions={answeredEssentialQuestions} answers={state.answers} />
        <AnsweredQuestions questions={answeredExtendedQuestions} answers={state.answers} />
        {currentQuestion && (
          <InterviewQuestion
            question={currentQuestion}
            onAnswer={handleAnswer}
          />
        )}
      </div>
    );
  }

  // Phase: followup — loading or answering follow-up questions
  if (state.phase === "followup" && state.category) {
    if (state.followUpQuestions.length > 0) {
      const answeredFollowUpQuestions = state.followUpQuestions.slice(0, state.currentQuestionIndex);
      const currentQuestion = state.followUpQuestions[state.currentQuestionIndex];

      return (
        <div className="flex flex-col gap-4">
          <CategoryHeader categoryId={state.category} />
          <AnsweredQuestions questions={answeredEssentialQuestions} answers={state.answers} />
          <AnsweredQuestions questions={answeredFollowUpQuestions} answers={state.answers} />
          {currentQuestion && (
            <InterviewQuestion
              question={currentQuestion}
              onAnswer={handleAnswer}
            />
          )}
        </div>
      );
    }

    // Loading state
    return (
      <div className="flex flex-col gap-4">
        <CategoryHeader categoryId={state.category} />
        <AnsweredQuestions questions={answeredEssentialQuestions} answers={state.answers} />
        <div className="flex items-center gap-3 rounded-2xl bg-primary/5 px-5 py-4 text-on-surface-variant">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
          <p className="text-sm">Personalizing your plan…</p>
        </div>
      </div>
    );
  }

  // Phase: review
  if (state.phase === "review" && state.draftBlueprint && state.category) {
    return (
      <div className="flex flex-col gap-4">
        <CategoryHeader categoryId={state.category} />
        <AnsweredQuestions questions={answeredEssentialQuestions} answers={state.answers} />
        <BlueprintApprovalCard
          blueprint={state.draftBlueprint}
          onApprove={handleApprove}
          onEdit={reEnter}
        />
      </div>
    );
  }

  return null;
}
