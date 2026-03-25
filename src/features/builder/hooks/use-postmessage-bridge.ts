"use client";

import { useAction } from "convex/react";
import { useCallback, useEffect, useRef } from "react";

import { api } from "../../../../convex/_generated/api";

export function usePostMessageBridge(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const generateSpeech = useAction(api.aiActions.generateSpeech);
  const transcribeSpeech = useAction(api.stt.transcribeSpeech);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;

      if (event.data?.type === "tts-request") {
        try {
          const result = await generateSpeech({
            text: event.data.text,
            voice: event.data.voice ?? "warm-female",
          });
          iframe.contentWindow.postMessage({
            type: "tts-response",
            text: event.data.text,
            audioUrl: result.audioUrl,
          }, "*");
        } catch (err) {
          console.error("[PostMessage Bridge] TTS error:", err);
        }
      }

      if (event.data?.type === "stt-start") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
          chunksRef.current = [];
          recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
          recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = (reader.result as string).split(",")[1];
              try {
                const result = await transcribeSpeech({ audioBase64: base64 });
                iframe.contentWindow?.postMessage({
                  type: "stt-result",
                  transcript: result.transcript,
                }, "*");
              } catch (err) {
                console.error("[PostMessage Bridge] STT error:", err);
              }
            };
            reader.readAsDataURL(blob);
            stream.getTracks().forEach((t) => t.stop());
          };
          mediaRecorderRef.current = recorder;
          recorder.start();
        } catch (err) {
          console.error("[PostMessage Bridge] Mic access error:", err);
        }
      }

      if (event.data?.type === "stt-stop") {
        mediaRecorderRef.current?.stop();
      }
    },
    [generateSpeech, transcribeSpeech, iframeRef],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);
}
