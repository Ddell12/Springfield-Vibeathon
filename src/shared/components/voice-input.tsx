"use client";

import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { useMediaRecorder } from "@/shared/hooks/use-media-recorder";

import { api } from "../../../convex/_generated/api";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const { isRecording, isProcessing, startRecording, stopRecording, audioBase64 } =
    useMediaRecorder();
  const transcribe = useAction(api.stt.transcribeSpeech);
  const isTranscribingRef = useRef(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- transcription state tracks async operation */
  useEffect(() => {
    if (!audioBase64 || isTranscribingRef.current) return;
    isTranscribingRef.current = true;
    setIsTranscribing(true);

    transcribe({ audioBase64 })
      .then((result) => {
        if (result.transcript.trim()) {
          onTranscript(result.transcript.trim());
        }
      })
      .catch((err) => {
        console.error("[voice-input] Transcription failed:", err);
        toast.error("Couldn't understand audio — please try again");
      })
      .finally(() => {
        isTranscribingRef.current = false;
        setIsTranscribing(false);
      });
  }, [audioBase64, transcribe, onTranscript]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const isLoading = isProcessing || isTranscribing;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={isRecording ? "text-error animate-pulse" : "text-on-surface-variant/60"}
      aria-label={isRecording ? "Stop recording" : "Start voice input"}
    >
      {isLoading ? (
        <MaterialIcon icon="progress_activity" size="xs" className="animate-spin" />
      ) : (
        <MaterialIcon icon={isRecording ? "stop_circle" : "mic"} size="xs" />
      )}
    </Button>
  );
}
