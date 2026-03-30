"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useInviteInfo(token: string) {
  return useQuery(api.caregivers.getInvite, { token });
}

export function useAcceptInvite() {
  return useMutation(api.caregivers.acceptInvite);
}
