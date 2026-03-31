"use client";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import { DAY_NAMES, formatTime, getWeekDays } from "../lib/time-slots";
import { AppointmentCard, type AppointmentListItem } from "./appointment-card";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function CalendarView({
  weekStart,
  view,
  currentDate,
  appointments,
  availableSlots,
  isSLP,
  onEmptySlotClick,
}: {
  weekStart: number;
  view: "week" | "day";
  currentDate: Date;
  appointments: AppointmentListItem[];
  availableSlots?: Array<{
    timestamp: number;
    startTime: string;
    dayOfWeek: number;
  }>;
  isSLP: boolean;
  onEmptySlotClick?: (timestamp: number) => void;
}) {
  const weekDays = getWeekDays(weekStart);
  const displayDays =
    view === "day"
      ? [new Date(startOfUtcDay(currentDate))]
      : weekDays;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "grid gap-3",
          view === "day" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-7",
        )}
      >
        {displayDays.map((dayDate) => {
          const dayStart = startOfUtcDay(dayDate);
          const dayEnd = dayStart + DAY_MS;
          const dayAppointments = appointments
            .filter((a) => a.scheduledAt >= dayStart && a.scheduledAt < dayEnd)
            .sort((a, b) => a.scheduledAt - b.scheduledAt);

          const daySlots =
            availableSlots?.filter(
              (s) => s.timestamp >= dayStart && s.timestamp < dayEnd,
            ) ?? [];

          const dow = dayDate.getDay();
          const todayStart = startOfUtcDay(new Date());
          const isToday = dayStart === todayStart;
          const isPast = dayStart < todayStart;

          return (
            <div
              key={dayStart}
              className={cn(
                "flex min-h-[200px] flex-col gap-2 rounded-xl p-3 overflow-hidden",
                isToday ? "bg-primary/5 ring-1 ring-primary/30" : "bg-surface-container",
                isPast && "opacity-60",
              )}
            >
              <div className="pb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                  {DAY_NAMES[dow]}
                </p>
                <p className={cn("text-sm font-semibold tabular-nums", isToday ? "text-primary" : "text-on-surface")}>
                  {dayDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {dayAppointments.map((a) => (
                  <AppointmentCard key={a._id} appointment={a} />
                ))}

                {isSLP &&
                  daySlots.map((slot) => (
                    <Button
                      key={slot.timestamp}
                      type="button"
                      variant="outline"
                      className="h-auto justify-start border-dashed border-[#3B7A57]/40 bg-[#3B7A57]/10 text-left text-on-surface hover:bg-[#3B7A57]/15 w-full overflow-hidden"
                      onClick={() => onEmptySlotClick?.(slot.timestamp)}
                    >
                      <span className="truncate text-sm font-medium min-w-0">
                        Open · {formatTime(slot.startTime)}
                      </span>
                    </Button>
                  ))}

                {dayAppointments.length === 0 &&
                  (!isSLP || daySlots.length === 0) && (
                    <p className="py-6 text-center text-sm text-on-surface-variant">
                      Nothing scheduled
                    </p>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
