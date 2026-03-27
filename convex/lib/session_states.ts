export const SESSION_STATES = {
  IDLE: "idle",
  GENERATING: "generating",
  LIVE: "live",
  FAILED: "failed",
} as const;

export type SessionState = (typeof SESSION_STATES)[keyof typeof SESSION_STATES];

/** Allowed state transitions — prevents invalid jumps like idle→live. */
export const VALID_TRANSITIONS: Record<SessionState, readonly SessionState[]> = {
  idle: ["generating"],
  generating: ["live", "failed"],
  live: ["generating"], // re-generation from live
  failed: ["generating"], // retry from failed
};
