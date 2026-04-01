"use client";

import { useAction } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "@convex/_generated/api";

export type AIAssistStatus = "idle" | "loading" | "success" | "error";

interface ChildProfile {
  ageRange?: string;
  interests?: string[];
  communicationLevel?: string;
}

export function useAIConfigAssist({
  templateType,
  childProfile,
}: {
  templateType: string;
  childProfile: ChildProfile;
}) {
  const [status, setStatus] = useState<AIAssistStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const generateAction = useAction(api.tools_ai.generateToolConfig);

  const generate = useCallback(
    async (description: string): Promise<string | null> => {
      setStatus("loading");
      setError(null);
      try {
        const result = await generateAction({ templateType, description, childProfile });
        if (result.error || !result.configJson) {
          setError(result.error ?? "No config returned");
          setStatus("error");
          return null;
        }
        setStatus("success");
        return result.configJson;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStatus("error");
        return null;
      }
    },
    [generateAction, templateType, childProfile]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, generate, reset };
}
