"use client";

import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useRef, useState } from "react";

export type VoiceStatus = "idle" | "loading" | "ready" | "error";

export interface VoiceController {
  speak: (args: { text: string; voice?: string }) => Promise<void>;
  stop: () => void;
  status: VoiceStatus;
}

export function useVoiceController(): VoiceController {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generateSpeech = useAction(api.aiActions.generateSpeech);

  const speak = useCallback(
    async ({ text, voice }: { text: string; voice?: string }) => {
      if (status !== "idle") return;
      setStatus("loading");
      try {
        const result = await generateSpeech({ text, voice });
        if (result?.audioUrl) {
          const audio = new Audio(result.audioUrl);
          audioRef.current = audio;
          setStatus("ready");
          audio.play();
          audio.onended = () => {
            audioRef.current = null;
            setStatus("idle");
          };
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
    setStatus("idle");
  }, []);

  return { speak, stop, status };
}
