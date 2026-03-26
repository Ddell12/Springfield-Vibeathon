import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMediaRecorder } from "../use-media-recorder";

const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as ((e: { data: Blob }) => void) | null,
  onstop: null as (() => void) | null,
  state: "inactive" as string,
};

vi.stubGlobal(
  "MediaRecorder",
  vi.fn(function MockMediaRecorder() {
    return mockMediaRecorder;
  }),
);

const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
Object.defineProperty(navigator, "mediaDevices", {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
});

describe("useMediaRecorder", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useMediaRecorder());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isProcessing).toBe(false);
  });

  it("requests mic permission and starts recording", async () => {
    const { result } = renderHook(() => useMediaRecorder());
    await act(async () => {
      await result.current.startRecording();
    });
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(result.current.isRecording).toBe(true);
  });
});
