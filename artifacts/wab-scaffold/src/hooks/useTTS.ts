import { useState, useCallback, useEffect, useRef } from "react";

/**
 * TTS hook that communicates with the parent Bridges builder via postMessage.
 *
 * Flow:
 *  1. `speak(text)` sends a `bridges:tts-request` to parent
 *  2. Parent calls ElevenLabs, plays audio, and posts `bridges:tts-playing` / `bridges:tts-done`
 *  3. If parent doesn't respond within 500ms, falls back to browser speechSynthesis
 *
 * If an audio URL is passed directly (e.g. pre-generated), it plays via an Audio element.
 */
export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const requestIdRef = useRef(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const bridgeAvailableRef = useRef(false);

  // Listen for parent bridge responses
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "bridges:tts-playing") {
        bridgeAvailableRef.current = true;
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        setSpeaking(true);
      }

      if (data.type === "bridges:tts-done") {
        setSpeaking(false);
      }

      if (data.type === "bridges:tts-error") {
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        setSpeaking(false);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const speak = useCallback((text: string, audioUrl?: string) => {
    if (typeof window === "undefined") return;

    // If a direct audio URL is provided, play it immediately
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      setSpeaking(true);
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      audio.play().catch(() => setSpeaking(false));
      return;
    }

    const id = ++requestIdRef.current;

    // Request TTS from parent builder via postMessage
    try {
      window.parent.postMessage(
        { type: "bridges:tts-request", text, id },
        "*",
      );
    } catch {
      // If postMessage fails (no parent), fall through to browser fallback
    }

    // Fallback: if parent doesn't respond in 500ms, use browser speechSynthesis
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

    // Skip fallback if we already know the bridge works
    if (bridgeAvailableRef.current) return;

    fallbackTimerRef.current = setTimeout(() => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }, 500);
  }, []);

  return { speak, speaking };
}
