import { ROUTES } from "@/core/routes";

export const SPEECH_COACH_SECTIONS = [
  { id: "sessions", label: "Sessions", href: ROUTES.SPEECH_COACH },
  { id: "setup", label: "Setup", href: ROUTES.SPEECH_COACH_SETUP },
  { id: "templates", label: "Templates", href: ROUTES.SPEECH_COACH_TEMPLATES },
] as const;
