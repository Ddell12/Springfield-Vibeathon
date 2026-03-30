"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useAvailability(slpId?: string) {
  const slots = useQuery(api.availability.list, slpId ? { slpId } : {});
  const createSlot = useMutation(api.availability.create);
  const removeSlot = useMutation(api.availability.remove);

  return {
    slots: slots ?? [],
    createSlot,
    removeSlot: (availabilityId: Id<"availability">) =>
      removeSlot({ availabilityId }),
  };
}
