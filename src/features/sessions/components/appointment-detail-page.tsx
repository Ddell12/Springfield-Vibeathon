"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation,useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface AppointmentDetailPageProps {
  paramsPromise: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No Show",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  "in-progress": "bg-green-100 text-green-700",
  completed: "bg-surface-variant text-on-surface-variant",
  cancelled: "bg-destructive/10 text-destructive",
  "no-show": "bg-amber-100 text-amber-700",
};

export function AppointmentDetailPage({ paramsPromise }: AppointmentDetailPageProps) {
  const { id } = use(paramsPromise);
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const role = user?.publicMetadata?.role as string | undefined;
  const isCaregiver = role === "caregiver";
  const isSLP = !isCaregiver;

  const appointment = useQuery(
    api.appointments.get,
    isLoaded ? { appointmentId: id as Id<"appointments"> } : "skip",
  );

  const startSession = useMutation(api.appointments.startSession);
  const cancelAppointment = useMutation(api.appointments.cancel);
  const markNoShow = useMutation(api.appointments.markNoShow);

  if (!isLoaded || appointment === undefined) {
    return (
      <div className="flex items-center justify-center p-16">
        <span
          className={cn(
            "inline-block h-6 w-6 animate-spin rounded-full",
            "border-2 border-primary border-t-transparent",
          )}
          aria-hidden="true"
        />
      </div>
    );
  }

  if (appointment === null) {
    return (
      <div className="flex flex-col items-center gap-4 p-16 text-on-surface-variant">
        <MaterialIcon icon="event_busy" size="lg" />
        <p className="font-body text-sm">Session not found.</p>
        <Button variant="outline" asChild>
          <Link href="/sessions">Back to sessions</Link>
        </Button>
      </div>
    );
  }

  const scheduledDate = new Date(appointment.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : "Unknown patient";

  async function handleStartSession() {
    try {
      await startSession({ appointmentId: id as Id<"appointments"> });
      router.push(`/sessions/${id}/call`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start session.");
    }
  }

  async function handleCancel() {
    try {
      await cancelAppointment({ appointmentId: id as Id<"appointments"> });
      toast.success("Session cancelled.");
      router.push("/sessions");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel.");
    }
  }

  async function handleMarkNoShow() {
    try {
      await markNoShow({ appointmentId: id as Id<"appointments"> });
      toast.success("Marked as no-show.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not mark no-show.");
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Back link */}
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-300"
      >
        <MaterialIcon icon="arrow_back" size="sm" />
        Back to sessions
      </Link>

      <div className="flex flex-col gap-6 rounded-2xl bg-surface-container p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-headline text-2xl font-semibold text-on-surface">
              {patientName}
            </h1>
            <p className="font-body text-sm text-on-surface-variant">
              {formattedDate} at {formattedTime}
            </p>
            <p className="font-body text-sm text-on-surface-variant">
              {appointment.duration} minutes
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
              STATUS_COLORS[appointment.status] ?? "bg-surface-variant text-on-surface-variant",
            )}
          >
            {STATUS_LABELS[appointment.status] ?? appointment.status}
          </span>
        </div>

        {/* Notes */}
        {appointment.notes && (
          <div>
            <h2 className="font-headline mb-1 text-sm font-semibold text-on-surface">Notes</h2>
            <p className="font-body text-sm text-on-surface-variant">{appointment.notes}</p>
          </div>
        )}

        {/* Join link */}
        {appointment.joinLink && (
          <div>
            <h2 className="font-headline mb-1 text-sm font-semibold text-on-surface">Join link</h2>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-surface-container-high px-3 py-2 font-mono text-xs text-on-surface-variant">
                {typeof window !== "undefined" ? `${window.location.origin}${appointment.joinLink}` : appointment.joinLink}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const url = typeof window !== "undefined"
                    ? `${window.location.origin}${appointment.joinLink}`
                    : appointment.joinLink ?? "";
                  void navigator.clipboard.writeText(url);
                  toast.success("Link copied!");
                }}
              >
                <MaterialIcon icon="content_copy" size="sm" />
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {isSLP && appointment.status === "scheduled" && (
            <>
              <Button
                onClick={handleStartSession}
                className="bg-gradient-to-br from-[#00595c] to-[#0d7377] text-white"
              >
                <MaterialIcon icon="videocam" size="sm" />
                Start session
              </Button>
              <Button variant="outline" onClick={handleMarkNoShow}>
                <MaterialIcon icon="person_off" size="sm" />
                Mark no-show
              </Button>
              <Button variant="ghost" onClick={handleCancel} className="text-destructive">
                <MaterialIcon icon="cancel" size="sm" />
                Cancel
              </Button>
            </>
          )}

          {isSLP && appointment.status === "in-progress" && (
            <Button
              asChild
              className="bg-gradient-to-br from-[#00595c] to-[#0d7377] text-white"
            >
              <Link href={`/sessions/${id}/call`}>
                <MaterialIcon icon="videocam" size="sm" />
                Rejoin session
              </Link>
            </Button>
          )}

          {isCaregiver && appointment.status === "in-progress" && (
            <Button
              asChild
              className="bg-gradient-to-br from-[#00595c] to-[#0d7377] text-white"
            >
              <Link href={`/sessions/${id}/call`}>
                <MaterialIcon icon="videocam" size="sm" />
                Join session
              </Link>
            </Button>
          )}

          {isCaregiver && appointment.status === "scheduled" && (
            <Button variant="ghost" onClick={handleCancel} className="text-destructive">
              <MaterialIcon icon="cancel" size="sm" />
              Cancel
            </Button>
          )}

          {appointment.status === "completed" && (
            <Button variant="outline" asChild>
              <Link href={`/sessions/${id}/notes`}>
                <MaterialIcon icon="description" size="sm" />
                View notes
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
