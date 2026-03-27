"use client";

import { useAction } from "convex/react";
import { useCallback, useEffect, useRef } from "react";

import { api } from "../../../../convex/_generated/api";

/**
 * Listens for `bridges:tts-request` postMessages from the preview iframe,
 * calls ElevenLabs via Convex, and plays audio in the parent window.
 *
 * The iframe can't make network requests (CSP `connect-src 'none'`),
 * so the parent acts as a proxy for high-quality TTS.
 */
export function useTtsBridge(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const generateSpeech = useAction(api.aiActions.generateSpeech);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const postToIframe = useCallback(
    (data: Record<string, unknown>) => {
      try {
        iframeRef.current?.contentWindow?.postMessage(data, "*");
      } catch {
        // iframe may be cross-origin or destroyed
      }
    },
    [iframeRef],
  );

  useEffect(() => {
    async function handleMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== "object" || data.type !== "bridges:tts-request") return;

      const { text, id } = data as { text: string; id: number };
      if (!text || typeof text !== "string") return;

      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      try {
        const result = await generateSpeech({ text, voice: "child-friendly" });

        const audio = new Audio(result.audioUrl);
        currentAudioRef.current = audio;

        audio.onplay = () => postToIframe({ type: "bridges:tts-playing", id });
        audio.onended = () => {
          currentAudioRef.current = null;
          postToIframe({ type: "bridges:tts-done", id });
        };
        audio.onerror = () => {
          currentAudioRef.current = null;
          postToIframe({ type: "bridges:tts-error", id });
        };

        await audio.play();
      } catch {
        postToIframe({ type: "bridges:tts-error", id });
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      // Cleanup: stop audio on unmount
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [generateSpeech, postToIframe]);
}
