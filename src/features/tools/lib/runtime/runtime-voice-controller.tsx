"use client";

import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";

export type VoiceStatus = "idle" | "loading" | "ready" | "error";

export interface VoiceController {
  speak: (args: { text: string; voice?: string }) => Promise<void>;
  stop: () => void;
  status: VoiceStatus;
}

export function useVoiceController(): VoiceController {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const generateSpeech = useAction(api.aiActions.generateSpeech);

  const speak = useCallback(
    async ({ text, voice }: { text: string; voice?: string }) => {
      if (status !== "idle") return;
      setStatus("loading");
      try {
        const result = await generateSpeech({ text, voice });
        if (result?.audioUrl) {
          const audio = new Audio(result.audioUrl);
          setAudioEl(audio);
          setStatus("ready");
          audio.play();
          audio.onended = () => setStatus("idle");
        } else {
          setStatus("idle");
        }
      } catch {
        setStatus("error");
      }
    },
    [generateSpeech, status]
  );

  const stop = useCallback(() => {
    if (audioEl) {
      audioEl.pause();
      audioEl.src = "";
    }
    setAudioEl(null);
    setStatus("idle");
  }, [audioEl]);

  return { speak, stop, status };
}
