/** Shared timeout constants for E2E tests */
export const TIMEOUTS = {
  /** Time for Clerk JS to initialize on page load */
  CLERK_INIT: 10_000,
  /** Time for Convex queries to resolve and hydrate UI */
  CONVEX_QUERY: 15_000,
  /** Time for full SSE generation cycle (Claude streaming) */
  SSE_GENERATION: 120_000,
} as const;

/** iPhone 14 Pro viewport for mobile responsiveness tests */
export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
