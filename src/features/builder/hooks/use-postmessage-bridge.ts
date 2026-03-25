"use client";

import { useAction } from "convex/react";
import { useCallback, useEffect, useRef } from "react";

import { api } from "../../../../convex/_generated/api";

/** Convert a Blob to a base64 data string (without the data-URL prefix). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function usePostMessageBridge(iframeRef: React.RefObject<HTMLIFrameElement | null>): void {
  const generateSpeech = useAction(api.aiActions.generateSpeech);
  const transcribeSpeech = useAction(api.stt.transcribeSpeech);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;

      // Only process messages from our iframe — ignore cross-origin noise
      if (event.source !== iframe.contentWindow) return;

      const messageType = event.data?.type as string | undefined;

      switch (messageType) {
        case "tts-request": {
          try {
            const result = await generateSpeech({
              text: event.data.text,
              voice: event.data.voice ?? "warm-female",
            });
            iframe.contentWindow.postMessage(
              { type: "tts-response", text: event.data.text, audioUrl: result.audioUrl },
              "*",
            );
          } catch (err) {
            console.error("[PostMessage Bridge] TTS error:", err);
            iframe.contentWindow.postMessage(
              { type: "tts-error", text: event.data.text, error: (err as Error).message },
              "*",
            );
          }
          break;
        }

        case "stt-start": {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            chunksRef.current = [];
            recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
            recorder.onstop = async () => {
              const blob = new Blob(chunksRef.current, { type: "audio/webm" });
              const base64 = await blobToBase64(blob);
              stream.getTracks().forEach((t) => t.stop());
              try {
                const result = await transcribeSpeech({ audioBase64: base64 });
                iframe.contentWindow?.postMessage(
                  { type: "stt-result", transcript: result.transcript },
                  "*",
                );
              } catch (err) {
                console.error("[PostMessage Bridge] STT error:", err);
                iframe.contentWindow?.postMessage(
                  { type: "stt-error", error: (err as Error).message },
                  "*",
                );
              }
            };
            mediaRecorderRef.current = recorder;
            recorder.start();
          } catch (err) {
            console.error("[PostMessage Bridge] Mic access error:", err);
            iframe.contentWindow.postMessage(
              { type: "stt-error", error: "Could not access microphone" },
              "*",
            );
          }
          break;
        }

        case "stt-stop": {
          mediaRecorderRef.current?.stop();
          break;
        }
      }
    },
    [generateSpeech, transcribeSpeech, iframeRef],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);
}
