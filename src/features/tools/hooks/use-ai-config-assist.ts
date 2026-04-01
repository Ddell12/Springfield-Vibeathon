"use client";

import { useCallback, useState } from "react";

import type { GenerationProfile } from "@/features/tools/lib/ai/generation-profile";

export type AIAssistStatus = "idle" | "loading" | "success" | "error";

interface ChildProfile {
  ageRange?: string;
  interests?: string[];
  communicationLevel?: string;
}

export function useAIConfigAssist({
  templateType,
  childProfile,
  generationProfile,
}: {
  templateType: string;
  childProfile: ChildProfile;
  generationProfile?: GenerationProfile;
}) {
  const [status, setStatus] = useState<AIAssistStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (description: string): Promise<string | null> => {
      setStatus("loading");
      setError(null);
      try {
        const res = await fetch("/api/tools/generate-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateType,
            description,
            childProfile,
            generationProfile,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = (data as { error?: string }).error ?? "Generation failed";
          setError(message);
          setStatus("error");
          return null;
        }

        const data = await res.json() as { configJson: string };
        setStatus("success");
        return data.configJson;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStatus("error");
        return null;
      }
    },
    [templateType, childProfile, generationProfile]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, generate, reset };
}
