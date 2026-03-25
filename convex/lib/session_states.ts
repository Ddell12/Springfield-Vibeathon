export const SESSION_STATES = {
  IDLE: "idle",
  GENERATING: "generating",
  LIVE: "live",
  FAILED: "failed",
} as const;

export type SessionState = (typeof SESSION_STATES)[keyof typeof SESSION_STATES];
