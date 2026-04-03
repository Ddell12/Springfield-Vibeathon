"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect } from "react";
import { toast } from "sonner";

import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { TelehealthConsentGate } from "@/features/intake/components/telehealth-consent-gate";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// ssr: false — LiveKit injects <style> nodes client-side that cause hydration mismatch.
// Client Components can use dynamic() without the Server Component restrictions.
const CallRoom = dynamic(
  () => import("./call-room").then((m) => ({ default: m.CallRoom })),
  { ssr: false }
);

interface CallPageProps {
  paramsPromise: Promise<{ id: string }>;
}

export function CallPage({ paramsPromise }: CallPageProps) {
  const { id } = use(paramsPromise);
  const user = useCurrentUser();
  const router = useRouter();

  // Load LiveKit component styles client-side to avoid Tailwind v4 CSS resolution issues
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/livekit-components.css";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const isSLP = user?.role !== "caregiver";
  const isCaregiver = user?.role === "caregiver";

  const { isAuthenticated } = useConvexAuth();
  const appointment = useQuery(
    api.appointments.get,
    isAuthenticated && isCaregiver ? { appointmentId: id as Id<"appointments"> } : "skip",
  );

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

  if (isCaregiver && appointment?.patientId) {
    return (
      <TelehealthConsentGate patientId={appointment.patientId}>
        <CallRoom
          appointmentId={id}
          isSLP={isSLP}
          onCallEnd={handleCallEnd}
        />
      </TelehealthConsentGate>
    );
  }

  return (
    <CallRoom
      appointmentId={id}
      isSLP={isSLP}
      onCallEnd={handleCallEnd}
    />
  );
}
