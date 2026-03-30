"use client";

import { useCallback, useRef, useState } from "react";

type CallState = "idle" | "connecting" | "connected" | "disconnected";

export function useCallRoom(appointmentId: string) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);

  const fetchToken = useCallback(async () => {
    setCallState("connecting");
    try {
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        throw new Error("Failed to get token");
      }

      const data = (await response.json()) as { token: string; serverUrl: string };
      setToken(data.token);
      setServerUrl(data.serverUrl);
      startTimeRef.current = Date.now();
      setCallState("connected");
    } catch (error) {
      console.error("[useCallRoom] Token fetch failed:", error);
      setCallState("idle");
    }
  }, [appointmentId]);

  const getDurationSeconds = useCallback(() => {
    if (startTimeRef.current === 0) return 0;
    return Math.round((Date.now() - startTimeRef.current) / 1000);
  }, []);

  const handleDisconnected = useCallback(() => {
    setCallState("disconnected");
  }, []);

  return {
    callState,
    token,
    serverUrl,
    fetchToken,
    getDurationSeconds,
    handleDisconnected,
  };
}
