export const AUTH_REDIRECT_URL = "/dashboard";
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
