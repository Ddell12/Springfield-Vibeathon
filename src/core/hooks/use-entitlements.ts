import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export const FREE_PLAN = {
  plan: "free" as const,
  limits: { maxApps: 5, maxDecks: 3 },
};

export function useEntitlements() {
  const entitlements = useQuery(api.entitlements.getEntitlements);

  const result = entitlements ?? FREE_PLAN;

  return {
    ...result,
    isLoading: entitlements === undefined,
    isPremium: result.plan === "premium",
  };
}
