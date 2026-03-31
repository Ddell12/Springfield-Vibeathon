"use client";

import { use, useCallback, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";

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
  const { user } = useUser();
  const router = useRouter();

  // Load LiveKit component styles client-side to avoid Tailwind v4 CSS resolution issues
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/livekit-components.css";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

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
