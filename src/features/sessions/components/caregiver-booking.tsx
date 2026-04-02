"use client";

import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAvailableSlots } from "../hooks/use-appointments";
import { useCalendar } from "../hooks/use-calendar";
import { formatDateTime, formatTime,getWeekDays } from "../lib/time-slots";

interface CaregiverBookingProps {
  slpId: string;
}

type Slot = {
  timestamp: number;
  startTime: string;
  dayOfWeek: number;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function CaregiverBooking({ slpId }: CaregiverBookingProps) {
  const { weekStart, goToPrevious, goToNext, goToToday } = useCalendar();

  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null);
  const [booking, setBooking] = useState(false);

  // Caregiver's linked patients
  const links = useQuery(api.caregivers.listByCaregiver, {});
  const patientId: Id<"patients"> | null =
    links && links.length > 0 ? links[0].patientId : null;

  // Available slots for this week — skip until links have loaded
  const slotsRaw = useAvailableSlots(links?.length ? slpId : null, weekStart);
  const slots = slotsRaw ?? [];

  const bookMutation = useMutation(api.appointments.bookAsCaregiver);

  const weekDays = getWeekDays(weekStart);

  const today = useMemo(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }, []);

  function getSlotsForDay(dayIndex: number): Slot[] {
    if (!slots) return [];
    return slots.filter((s) => {
      const day = new Date(s.timestamp).getUTCDay();
      return day === dayIndex;
    });
  }

  async function handleConfirm() {
    if (!pendingSlot || !patientId) return;
    setBooking(true);
    try {
      const tz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC";
      await bookMutation({
        slpId,
        patientId,
        scheduledAt: pendingSlot.timestamp,
        timezone: tz,
      });
      toast.success(
        `Session booked for ${formatDateTime(pendingSlot.timestamp)}`,
      );
      setPendingSlot(null);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not book the session.";
      toast.error(msg);
    } finally {
      setBooking(false);
    }
  }

  if (links === undefined || slotsRaw === undefined) {
    return (
      <div className="flex items-center gap-3 py-8 text-on-surface-variant">
        <span
          className={cn(
            "inline-block h-5 w-5 animate-spin rounded-full",
            "border-2 border-current border-t-transparent",
          )}
          aria-hidden="true"
        />
        <span className="font-body text-sm">Loading availability…</span>
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="flex items-center gap-2 py-6 text-on-surface-variant">
        <MaterialIcon icon="person_off" size="sm" />
        <span className="font-body text-sm">
          You have no linked patients yet.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevious}
          aria-label="Previous week"
        >
          <MaterialIcon icon="chevron_left" size="sm" />
        </Button>

        <button
          className={cn(
            "font-body text-sm font-medium text-on-surface",
            "cursor-pointer rounded px-2 py-1",
            "transition-colors duration-300 hover:bg-surface-variant",
          )}
          onClick={goToToday}
          type="button"
        >
          {weekDays[0].toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}{" "}
          –{" "}
          {weekDays[6].toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNext}
          aria-label="Next week"
        >
          <MaterialIcon icon="chevron_right" size="sm" />
        </Button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, i) => {
          const daySlots = getSlotsForDay(day.getUTCDay());
          const isToday =
            day.toISOString().split("T")[0] ===
            today.toISOString().split("T")[0];

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              {/* Day header */}
              <div
                className={cn(
                  "flex flex-col items-center rounded-md px-1 py-1 w-full",
                  isToday && "bg-primary/10",
                )}
              >
                <span
                  className={cn(
                    "font-body text-xs font-medium uppercase tracking-wide",
                    isToday ? "text-primary" : "text-on-surface-variant",
                  )}
                >
                  {DAY_LABELS[day.getUTCDay()]}
                </span>
                <span
                  className={cn(
                    "font-headline text-sm font-semibold",
                    isToday ? "text-primary" : "text-on-surface",
                  )}
                >
                  {day.getUTCDate()}
                </span>
              </div>

              {/* Slots */}
              <div className="flex w-full flex-col gap-1">
                {daySlots.length === 0 ? (
                  <p className="font-body py-1 text-center text-[10px] text-on-surface-variant/50">
                    —
                  </p>
                ) : (
                  daySlots.map((slot) => (
                    <button
                      key={slot.timestamp}
                      type="button"
                      aria-label={`Book ${DAY_LABELS[day.getUTCDay()]} ${formatDateTime(slot.timestamp)}`}
                      onClick={() => setPendingSlot(slot)}
                      className={cn(
                        "w-full rounded px-1 py-1 text-center",
                        "font-body text-[10px] font-medium",
                        "bg-primary/10 text-primary",
                        "transition-colors duration-300",
                        "hover:bg-primary/20 active:bg-primary/30",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                      )}
                    >
                      {formatTime(slot.startTime)}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog
        open={pendingSlot !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSlot(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline">
              Confirm booking
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              {pendingSlot
                ? `Book a session on ${formatDateTime(pendingSlot.timestamp)}?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={booking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={booking}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirm();
              }}
              className="bg-gradient-to-br from-[#00595c] to-[#0d7377] text-white"
            >
              {booking ? "Booking…" : "Confirm booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
