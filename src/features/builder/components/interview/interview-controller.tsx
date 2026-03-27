"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { useInterview } from "../../hooks/use-interview";
import {
  getEssentialQuestions,
  getExtendedQuestions,
} from "../../lib/interview/categories";
import { assembleBlueprint } from "../../lib/interview/blueprint-assembler";
import type { TherapyBlueprint } from "../../lib/schemas";
import { CategoryPicker } from "./category-picker";
import { InterviewQuestion } from "./interview-question";
import { BlueprintApprovalCard } from "./blueprint-approval-card";

interface InterviewControllerProps {
  onGenerate: (prompt: string, blueprint: TherapyBlueprint) => void;
  onEscapeHatch?: () => void;
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
        const followUps = data.followUps ?? [];
        const draftBlueprint = data.blueprint ?? null;

        if (followUps.length > 0) {
          setFollowUps(followUps, draftBlueprint);
          // Follow-up questions will be answered, then we move to review
        } else {
          // No follow-ups — assemble and go straight to review
          const { blueprint, richPrompt } = assembleBlueprint(
            state.category!,
            state.answers,
            draftBlueprint,
          );
          showReview(blueprint, richPrompt);
        }
      } catch {
        if (cancelled) return;
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

  // Phase: essential
  if (state.phase === "essential" && state.category) {
    const questions = getEssentialQuestions(state.category);
    const answeredQuestions = questions.slice(0, state.currentQuestionIndex);
    const currentQuestion = questions[state.currentQuestionIndex];

    return (
      <div className="flex flex-col gap-4">
        {/* Previously answered questions — locked as user bubbles */}
        {answeredQuestions.map((q) => {
          const raw = state.answers[q.id];
          const displayValue = Array.isArray(raw) ? raw.join(", ") : (raw ?? "");
          const option = q.options?.find((o) => o.value === displayValue);
          const label = option?.label ?? displayValue;

          return (
            <div key={q.id} className="flex flex-col gap-2">
              <div className="flex justify-start">
                <div className="max-w-[85%] break-words rounded-2xl rounded-bl-md border border-outline-variant/15 bg-surface-container px-4 py-3">
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

        {/* Current question */}
        {currentQuestion && (
          <InterviewQuestion
            question={currentQuestion}
            onAnswer={handleAnswer}
          />
        )}
      </div>
    );
  }

  // Phase: gate
  if (state.phase === "gate") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-start">
          <div className="max-w-[85%] break-words rounded-2xl rounded-bl-md border border-outline-variant/15 bg-surface-container px-4 py-3">
            <p className="text-sm text-foreground">
              I have enough to get started! Want to customize further?
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pl-1">
          <button
            type="button"
            onClick={chooseSkip}
            className="rounded-xl bg-gradient-to-r from-[#00595c] to-[#0d7377] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
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

  // Phase: extended
  if (state.phase === "extended" && state.category) {
    const questions = getExtendedQuestions(state.category);
    const answeredQuestions = questions.slice(0, state.currentQuestionIndex);
    const currentQuestion = questions[state.currentQuestionIndex];

    return (
      <div className="flex flex-col gap-4">
        {answeredQuestions.map((q) => {
          const raw = state.answers[q.id];
          const displayValue = Array.isArray(raw) ? raw.join(", ") : (raw ?? "");
          const option = q.options?.find((o) => o.value === displayValue);
          const label = option?.label ?? displayValue;

          return (
            <div key={q.id} className="flex flex-col gap-2">
              <div className="flex justify-start">
                <div className="max-w-[85%] break-words rounded-2xl rounded-bl-md border border-outline-variant/15 bg-surface-container px-4 py-3">
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
  if (state.phase === "followup") {
    // If follow-up questions have been loaded, show them
    if (state.followUpQuestions.length > 0) {
      const answeredQuestions = state.followUpQuestions.slice(
        0,
        state.currentQuestionIndex,
      );
      const currentQuestion =
        state.followUpQuestions[state.currentQuestionIndex];

      return (
        <div className="flex flex-col gap-4">
          {answeredQuestions.map((q) => {
            const raw = state.answers[q.id];
            const displayValue = Array.isArray(raw)
              ? raw.join(", ")
              : (raw ?? "");
            const option = q.options?.find((o) => o.value === displayValue);
            const label = option?.label ?? displayValue;

            return (
              <div key={q.id} className="flex flex-col gap-2">
                <div className="flex justify-start">
                  <div className="max-w-[85%] break-words rounded-2xl rounded-bl-md border border-outline-variant/15 bg-surface-container px-4 py-3">
                    <p className="text-sm text-foreground">{q.text}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[85%] break-words rounded-2xl rounded-br-md bg-primary/15 px-4 py-2">
                    <p className="text-sm font-medium text-foreground">
                      {label}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

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
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">Personalizing your plan…</p>
        </div>
      </div>
    );
  }

  // Phase: review
  if (state.phase === "review" && state.draftBlueprint) {
    return (
      <BlueprintApprovalCard
        blueprint={state.draftBlueprint}
        onApprove={handleApprove}
        onEdit={reEnter}
      />
    );
  }

  return null;
}
