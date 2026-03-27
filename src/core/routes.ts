export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  BUILDER: "/builder",
  BUILDER_SESSION: (sessionId: string) => `/builder/${sessionId}` as const,
  MY_TOOLS: "/my-tools",
  TEMPLATES: "/templates",
  FLASHCARDS: "/flashcards",
  SETTINGS: "/settings",
  TOOL_VIEW: (toolId: string) => `/tool/${toolId}` as const,
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
} as const;
