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
  const isLive = appointment.status === "in-progress";

  return (
    <div
      className={cn(
        "rounded-lg transition-colors duration-300",
        isLive
          ? "bg-green-50 ring-1 ring-green-400/60"
          : "bg-primary/20 hover:bg-primary/25",
        isPast && !isLive && "opacity-60",
        isCancelled && "line-through opacity-50",
        className,
      )}
    >
      {/* Card header — always links to detail page */}
      <Link
        href={ROUTES.SESSION_DETAIL(appointment._id)}
        className="block px-3 pt-2 pb-1.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {isLive && (
                <span className="flex items-center gap-1 rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  Live
                </span>
              )}
              <p className="truncate text-sm font-semibold text-on-surface">{name}</p>
            </div>
            <p className="text-xs text-on-surface-variant tabular-nums">
              {formatDateTime(appointment.scheduledAt)}
            </p>
          </div>
          <MaterialIcon icon="chevron_right" size="sm" className="shrink-0 text-on-surface-variant" />
        </div>
      </Link>

      {/* Direct action button — only shown when actionable */}
      {isLive && (
        <div className="px-3 pb-2">
          <Link
            href={`/sessions/${appointment._id}/call`}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-md py-1.5",
              "bg-green-500 text-xs font-semibold text-white",
              "transition-colors duration-200 hover:bg-green-600",
            )}
          >
            <MaterialIcon icon="videocam" className="text-sm" />
            Join now
          </Link>
        </div>
      )}
    </div>
  );
}
