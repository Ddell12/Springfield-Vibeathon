"use client";

import { useCallback, useReducer } from "react";

import { createInitialState, interviewReducer } from "../lib/interview/interview-state";
import type { InterviewQuestion } from "../lib/interview/types";
import type { TherapyBlueprint } from "../lib/schemas";

export function useInterview() {
  const [state, dispatch] = useReducer(interviewReducer, undefined, createInitialState);

  const selectCategory = useCallback((categoryId: string) => {
    dispatch({ type: "SELECT_CATEGORY", categoryId });
  }, []);

  const answer = useCallback((questionId: string, value: string | string[]) => {
    dispatch({ type: "ANSWER", questionId, value });
  }, []);

  const showGate = useCallback(() => {
    dispatch({ type: "SHOW_GATE" });
  }, []);

  const chooseCustomize = useCallback(() => {
    dispatch({ type: "CHOOSE_CUSTOMIZE" });
  }, []);

  const chooseSkip = useCallback(() => {
    dispatch({ type: "CHOOSE_SKIP" });
  }, []);

  const setFollowUps = useCallback(
    (followUpQuestions: InterviewQuestion[], draftBlueprint: TherapyBlueprint | null) => {
      dispatch({ type: "SET_FOLLOWUPS", followUpQuestions, draftBlueprint });
    },
    [],
  );

  const showReview = useCallback(
    (blueprint: TherapyBlueprint, richPrompt: string) => {
      dispatch({ type: "SHOW_REVIEW", blueprint, richPrompt });
    },
    [],
  );

  const addFreeform = useCallback((note: string) => {
    dispatch({ type: "ADD_FREEFORM", note });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const reEnter = useCallback(() => {
    dispatch({ type: "RE_ENTER" });
  }, []);

  return {
    state,
    selectCategory,
    answer,
    showGate,
    chooseCustomize,
    chooseSkip,
    setFollowUps,
    showReview,
    addFreeform,
    reset,
    reEnter,
  };
}
