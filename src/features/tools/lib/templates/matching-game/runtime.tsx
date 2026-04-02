"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/core/utils";

import type { RuntimeProps } from "../../registry";
import { PremiumScreen, ReinforcementBanner } from "../../runtime/premium-primitives";
import { useShellState } from "../../runtime/shell-state-context";
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
  config, mode: _mode, onEvent, voice: _voice,
}: RuntimeProps<MatchingGameConfig>) {
  const shellState = useShellState();
  const difficulty = shellState?.difficulty ?? "hard";

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set());
  const [incorrectAnswerId, setIncorrectAnswerId] = useState<string | null>(null);
  const incorrectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onEvent("app_opened"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (incorrectTimeoutRef.current) clearTimeout(incorrectTimeoutRef.current); }, []);

  const visiblePairs = useMemo(() => {
    if (difficulty === "easy") return config.pairs.slice(0, 2);
    if (difficulty === "medium") return config.pairs.slice(0, 4);
    return config.pairs;
  }, [config.pairs, difficulty]);

  const shuffledAnswers = useMemo(
    () => shuffleArray(visiblePairs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visiblePairs.map((p) => p.id).join(",")]
  );

  // Reset selections when difficulty changes
  useEffect(() => {
    setSelectedPromptId(null);
    setMatchedPairIds(new Set());
    setIncorrectAnswerId(null);
  }, [difficulty]);

  useEffect(() => {
    if (visiblePairs.length === 0) return;
    const percent = Math.round((matchedPairIds.size / visiblePairs.length) * 100);
    onEvent("progress_updated", JSON.stringify({ percent }));
  }, [matchedPairIds, visiblePairs.length, onEvent]);

  const handlePromptTap = useCallback((pairId: string) => {
    if (matchedPairIds.has(pairId)) return;
    setSelectedPromptId(pairId);
    setIncorrectAnswerId(null);
  }, [matchedPairIds]);

  const handleAnswerTap = useCallback((answerId: string) => {
    if (!selectedPromptId || matchedPairIds.has(answerId)) return;
    const isCorrect = selectedPromptId === answerId;
    const payloadJson = JSON.stringify({ promptId: selectedPromptId, answerId });
    if (isCorrect) {
      onEvent("answer_correct", payloadJson);
      const newMatched = new Set(matchedPairIds);
      newMatched.add(answerId);
      setMatchedPairIds(newMatched);
      setSelectedPromptId(null);
      if (newMatched.size === visiblePairs.length) {
        onEvent("activity_completed", JSON.stringify({ pairsMatched: visiblePairs.length }));
      }
    } else {
      onEvent("answer_incorrect", payloadJson);
      setIncorrectAnswerId(answerId);
      if (incorrectTimeoutRef.current) clearTimeout(incorrectTimeoutRef.current);
      incorrectTimeoutRef.current = setTimeout(() => {
        setIncorrectAnswerId(null);
        incorrectTimeoutRef.current = null;
      }, 800);
    }
  }, [selectedPromptId, matchedPairIds, visiblePairs.length, onEvent]);

  const allDone = matchedPairIds.size === visiblePairs.length && visiblePairs.length > 0;

  return (
    <div className={cn("p-4", config.highContrast && "high-contrast bg-black")}>
      <PremiumScreen title={config.title}>
        {allDone ? (
          <ReinforcementBanner title={config.celebrateCorrect ? "Amazing! All matched!" : "Complete!"} />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Prompts */}
            <div className="flex flex-col gap-3">
              <p className={cn("text-xs font-semibold uppercase tracking-wide text-center mb-1",
                config.highContrast ? "text-gray-400" : "text-muted-foreground")}>Match</p>
              {visiblePairs.map((pair) => {
                const isMatched = matchedPairIds.has(pair.id);
                const isSelected = selectedPromptId === pair.id;
                return (
                  <button key={pair.id} onClick={() => handlePromptTap(pair.id)}
                    className={cn(
                      "rounded-2xl p-4 text-center font-semibold text-base",
                      "min-h-[64px] touch-manipulation select-none transition-all duration-300 active:scale-95",
                      isMatched ? (config.highContrast ? "bg-green-700 text-white" : "bg-green-100 text-green-700 border-2 border-green-300")
                        : isSelected ? (config.highContrast ? "bg-yellow-400 text-black border-4 border-white" : "bg-primary text-primary-foreground border-2 border-primary scale-105")
                          : (config.highContrast ? "bg-gray-800 text-white border-2 border-gray-600" : "bg-muted text-foreground border-2 border-border")
                    )}>
                    {pair.promptImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pair.promptImageUrl} alt={pair.prompt} className="w-12 h-12 object-cover rounded-lg mx-auto mb-1" />
                    )}
                    {pair.prompt}
                  </button>
                );
              })}
            </div>

            {/* Answers */}
            <div className="flex flex-col gap-3">
              <p className={cn("text-xs font-semibold uppercase tracking-wide text-center mb-1",
                config.highContrast ? "text-gray-400" : "text-muted-foreground")}>Answer</p>
              {shuffledAnswers.map((pair) => {
                const isMatched = matchedPairIds.has(pair.id);
                const isIncorrect = incorrectAnswerId === pair.id;
                return (
                  <button key={pair.id} onClick={() => handleAnswerTap(pair.id)}
                    className={cn(
                      "rounded-2xl p-4 text-center font-semibold text-base",
                      "min-h-[64px] touch-manipulation select-none transition-all duration-300 active:scale-95",
                      isMatched ? (config.highContrast ? "bg-green-700 text-white" : "bg-green-100 text-green-700 border-2 border-green-300")
                        : isIncorrect ? (config.highContrast ? "bg-red-600 text-white border-4 border-white" : "bg-red-100 text-red-700 border-2 border-red-300")
                          : (config.highContrast ? "bg-gray-800 text-white border-2 border-gray-600" : "bg-muted text-foreground border-2 border-border")
                    )}
                    style={isIncorrect && !config.highContrast
                      ? { animation: "shake 300ms cubic-bezier(0.4, 0, 0.2, 1)" }
                      : undefined}>
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
      </PremiumScreen>
    </div>
  );
}
