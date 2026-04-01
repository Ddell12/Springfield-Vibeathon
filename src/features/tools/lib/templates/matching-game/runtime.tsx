"use client";

import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@convex/_generated/api";
import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import type { MatchingGameConfig } from "./schema";

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function MatchingGameRuntime({
  config,
  shareToken,
  onEvent,
}: RuntimeProps<MatchingGameConfig>) {
  const logEvent = useMutation(api.tools.logEvent);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set());
  const [incorrectAnswerId, setIncorrectAnswerId] = useState<string | null>(null);
  const incorrectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shuffledAnswers = useMemo(
    () => shuffleArray(config.pairs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.pairs.map((p) => p.id).join(",")]
  );

  useEffect(() => {
    if (shareToken !== "preview") {
      void logEvent({ shareToken, eventType: "app_opened" });
    }
    onEvent("app_opened");
  }, [shareToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (incorrectTimeoutRef.current) clearTimeout(incorrectTimeoutRef.current);
    };
  }, []);

  const handlePromptTap = useCallback(
    (pairId: string) => {
      if (matchedPairIds.has(pairId)) return;
      setSelectedPromptId(pairId);
      setIncorrectAnswerId(null);
    },
    [matchedPairIds]
  );

  const handleAnswerTap = useCallback(
    (answerId: string) => {
      if (!selectedPromptId) return;
      if (matchedPairIds.has(answerId)) return;

      const isCorrect = selectedPromptId === answerId;
      const payloadJson = JSON.stringify({ promptId: selectedPromptId, answerId });

      if (isCorrect) {
        if (shareToken !== "preview") {
          void logEvent({ shareToken, eventType: "answer_correct", eventPayloadJson: payloadJson });
        }
        onEvent("answer_correct", payloadJson);
        const newMatched = new Set(matchedPairIds);
        newMatched.add(answerId);
        setMatchedPairIds(newMatched);
        setSelectedPromptId(null);

        if (newMatched.size === config.pairs.length) {
          const completedPayload = JSON.stringify({ pairsMatched: config.pairs.length });
          if (shareToken !== "preview") {
            void logEvent({ shareToken, eventType: "activity_completed", eventPayloadJson: completedPayload });
          }
          onEvent("activity_completed", completedPayload);
        }
      } else {
        if (shareToken !== "preview") {
          void logEvent({ shareToken, eventType: "answer_incorrect", eventPayloadJson: payloadJson });
        }
        onEvent("answer_incorrect", payloadJson);
        setIncorrectAnswerId(answerId);
        // Clear incorrect highlight after short delay
        if (incorrectTimeoutRef.current) clearTimeout(incorrectTimeoutRef.current);
        incorrectTimeoutRef.current = setTimeout(() => {
          setIncorrectAnswerId(null);
          incorrectTimeoutRef.current = null;
        }, 800);
      }
    },
    [selectedPromptId, matchedPairIds, config.pairs.length, logEvent, shareToken, onEvent]
  );

  const allDone = matchedPairIds.size === config.pairs.length;

  return (
    <div
      className={cn(
        "min-h-screen bg-background p-4 flex flex-col gap-6",
        config.highContrast && "high-contrast bg-black"
      )}
    >
      <h1
        className={cn(
          "text-center font-display text-2xl font-semibold",
          config.highContrast ? "text-white" : "text-foreground"
        )}
      >
        {config.title}
      </h1>

      {allDone ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <span className="text-6xl">🎉</span>
          <p
            className={cn(
              "text-xl font-bold text-center",
              config.highContrast ? "text-white" : "text-foreground"
            )}
          >
            {config.celebrateCorrect ? "Amazing! All matched!" : "Complete!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Prompts column */}
          <div className="flex flex-col gap-3">
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wide text-center mb-1",
                config.highContrast ? "text-gray-400" : "text-muted-foreground"
              )}
            >
              Match
            </p>
            {config.pairs.map((pair) => {
              const isMatched = matchedPairIds.has(pair.id);
              const isSelected = selectedPromptId === pair.id;
              return (
                <button
                  key={pair.id}
                  onClick={() => handlePromptTap(pair.id)}
                  className={cn(
                    "rounded-2xl p-4 text-center font-semibold text-base",
                    "min-h-[64px] touch-manipulation select-none",
                    "transition-all duration-200 active:scale-95",
                    isMatched
                      ? config.highContrast
                        ? "bg-green-700 text-white"
                        : "bg-green-100 text-green-700 border-2 border-green-300"
                      : isSelected
                        ? config.highContrast
                          ? "bg-yellow-400 text-black border-4 border-white"
                          : "bg-primary text-primary-foreground border-2 border-primary scale-105"
                        : config.highContrast
                          ? "bg-gray-800 text-white border-2 border-gray-600"
                          : "bg-muted text-foreground border-2 border-border"
                  )}
                >
                  {pair.prompt}
                </button>
              );
            })}
          </div>

          {/* Answers column */}
          <div className="flex flex-col gap-3">
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wide text-center mb-1",
                config.highContrast ? "text-gray-400" : "text-muted-foreground"
              )}
            >
              Answer
            </p>
            {shuffledAnswers.map((pair) => {
              const isMatched = matchedPairIds.has(pair.id);
              const isIncorrect = incorrectAnswerId === pair.id;
              return (
                <button
                  key={pair.id}
                  onClick={() => handleAnswerTap(pair.id)}
                  className={cn(
                    "rounded-2xl p-4 text-center font-semibold text-base",
                    "min-h-[64px] touch-manipulation select-none",
                    "transition-all duration-200 active:scale-95",
                    isMatched
                      ? config.highContrast
                        ? "bg-green-700 text-white"
                        : "bg-green-100 text-green-700 border-2 border-green-300"
                      : isIncorrect
                        ? config.highContrast
                          ? "bg-red-600 text-white border-4 border-white"
                          : "bg-red-100 text-red-700 border-2 border-red-300"
                        : config.highContrast
                          ? "bg-gray-800 text-white border-2 border-gray-600"
                          : "bg-muted text-foreground border-2 border-border"
                  )}
                >
                  {config.showAnswerImages && pair.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pair.imageUrl} alt={pair.answer} className="w-12 h-12 object-cover rounded-lg mb-1" />
                  )}
                  {pair.answer}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
