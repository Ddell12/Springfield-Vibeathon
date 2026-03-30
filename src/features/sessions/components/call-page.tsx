"use client";

import { use, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { CallRoom } from "./call-room";

interface CallPageProps {
  paramsPromise: Promise<{ id: string }>;
}

export function CallPage({ paramsPromise }: CallPageProps) {
  const { id } = use(paramsPromise);
  const { user } = useUser();
  const router = useRouter();

  const role = user?.publicMetadata?.role as string | undefined;
  const isSLP = role !== "caregiver";

  const completeSession = useMutation(api.appointments.completeSession);

  const handleCallEnd = useCallback(
    async (durationSeconds: number, interactionLog: string) => {
      if (isSLP) {
        try {
          await completeSession({
            appointmentId: id as Id<"appointments">,
            durationSeconds,
            interactionLog,
          });
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Could not save session record.",
          );
        }
      }
      router.push(`/sessions/${id}/notes`);
    },
    [id, isSLP, completeSession, router],
  );

  return (
    <CallRoom
      appointmentId={id}
      isSLP={isSLP}
      onCallEnd={handleCallEnd}
    />
  );
}
