"use client";

import { useEffect, useRef, useState } from "react";

import type { StreamingStatus } from "./use-streaming";

const NARRATION_STAGES = [
  "Reading your description...",
  "Designing the layout...",
  "Adding the fun parts...",
  "Making it interactive...",
  "Putting on the finishing touches...",
  "Almost there...",
] as const;

const STAGE_INTERVAL_MS = 5_000;
const OVERRIDE_DURATION_MS = 3_000;

export function useProgressNarration(
  status: StreamingStatus,
  overrideMessage?: string,
): string | null {
  const [stageIndex, setStageIndex] = useState(0);
  const [activeOverride, setActiveOverride] = useState<string | null>(null);
  const overrideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOverrideRef = useRef<string | undefined>(undefined);

  const isGenerating = status === "generating";

  useEffect(() => {
    if (isGenerating) {
      setStageIndex(0); // eslint-disable-line react-hooks/set-state-in-effect -- reset on generate start
      setActiveOverride(null); // eslint-disable-line react-hooks/set-state-in-effect -- reset on generate start
      prevOverrideRef.current = undefined;
    }
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setStageIndex((prev) =>
        prev < NARRATION_STAGES.length - 1 ? prev + 1 : prev
      );
    }, STAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating) return;
    if (overrideMessage && overrideMessage !== prevOverrideRef.current) {
      prevOverrideRef.current = overrideMessage;
      setActiveOverride(overrideMessage); // eslint-disable-line react-hooks/set-state-in-effect -- sync override
      if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
      overrideTimeoutRef.current = setTimeout(() => {
        setActiveOverride(null);
        overrideTimeoutRef.current = null;
      }, OVERRIDE_DURATION_MS);
    } else if (!overrideMessage && prevOverrideRef.current) {
      prevOverrideRef.current = undefined;
    }
  }, [overrideMessage, isGenerating]);

  useEffect(() => {
    return () => {
      if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
    };
  }, []);

  if (!isGenerating) return null;
  return activeOverride ?? NARRATION_STAGES[stageIndex];
}
