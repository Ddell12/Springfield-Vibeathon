"use client";

import Link from "next/link";

import { ROUTES } from "@/core/routes";
import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

import { formatDateTime } from "../lib/time-slots";
import type { AppointmentStatus } from "../types";

type PatientLite = {
  firstName: string;
  lastName: string;
} | null;

export type AppointmentListItem = {
  _id: string;
  scheduledAt: number;
  duration: number;
  status: AppointmentStatus;
  patient?: PatientLite;
};

export function AppointmentCard({
  appointment,
  className,
}: {
  appointment: AppointmentListItem;
  className?: string;
}) {
  const name = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : "Patient";
  const isPast = appointment.scheduledAt < Date.now();
  const isCancelled = appointment.status === "cancelled";

  return (
    <Link
      href={ROUTES.SESSION_DETAIL(appointment._id)}
      className={cn(
        "block rounded-lg px-3 py-2 transition-colors duration-300",
        "bg-primary/20 hover:bg-primary/25",
        isPast && "opacity-60",
        isCancelled && "line-through opacity-50",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-on-surface">{name}</p>
          <p className="text-xs text-on-surface-variant tabular-nums">
            {formatDateTime(appointment.scheduledAt)}
          </p>
        </div>
        <MaterialIcon icon="chevron_right" size="sm" className="shrink-0 text-on-surface-variant" />
      </div>
    </Link>
  );
}
