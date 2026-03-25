// SSE event type definitions for the streaming builder

export type SSEEventType =
  | "status"
  | "token"
  | "file_complete"
  | "done"
  | "error";

export interface StatusEvent {
  status: "generating" | "live" | "failed";
  message?: string;
}

export interface TokenEvent {
  token: string;
}

export interface FileCompleteEvent {
  path: string;
  contents: string;
  version: number;
}

export interface DoneEvent {
  sessionId: string;
}

export interface ErrorEvent {
  message: string;
}

export type SSEEventData =
  | StatusEvent
  | TokenEvent
  | FileCompleteEvent
  | DoneEvent
  | ErrorEvent;
