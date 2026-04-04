export const AUTH_REDIRECT_URL = "/dashboard";

export function mapAuthError(raw: string): string {
  if (/InvalidAccountId|account.*not.*found/i.test(raw))
    return "Invalid email or password.";
  if (/InvalidSecret|incorrect.*password|invalid.*password/i.test(raw))
    return "Invalid email or password.";
  if (/already.*exists|duplicate/i.test(raw))
    return "An account with this email already exists. Try signing in instead.";
  if (/rate.*limit/i.test(raw))
    return "Too many attempts. Please wait a moment and try again.";
  return "Something went wrong. Please try again.";
}
export const AUTH_SIGN_OUT_URL = "/sign-in";

export type AuthRole = "slp" | "caregiver";

export function getAuthRole(searchRole?: string): AuthRole {
  return searchRole === "caregiver" ? "caregiver" : "slp";
}

export const ROLE_COPY: Record<
  AuthRole,
  {
    label: string;
    shortLabel: string;
    helper: string;
    pendingHelper: string;
  }
> = {
  slp: {
    label: "Therapist or SLP",
    shortLabel: "Therapist",
    helper:
      "New therapist accounts can continue with email. Google works for returning or new therapist accounts.",
    pendingHelper:
      "New therapist accounts are created automatically after you verify your email.",
  },
  caregiver: {
    label: "Caregiver",
    shortLabel: "Caregiver",
    helper:
      "Caregiver access is usually created from an invite. Use the same email your therapist invited.",
    pendingHelper:
      "Use the invited email address to open your family workspace after verification.",
  },
};
