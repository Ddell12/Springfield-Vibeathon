"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { usePatients } from "@/features/patients/hooks/use-patients";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group";
import { canShowDeveloperAccelerators } from "@/shared/lib/developer-gate";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AvailabilityEditor } from "./availability-editor";
import { InviteEmailModal } from "./invite-email-modal";
const BookingModal = dynamic(
  () => import("./booking-modal").then((m) => ({ default: m.BookingModal })),
  { ssr: false }
);
import { useAppointmentActions, useAppointments } from "../hooks/use-appointments";
import { useAvailability } from "../hooks/use-availability";
import { useCalendar } from "../hooks/use-calendar";
import type { AppointmentListItem } from "./appointment-card";
import { CalendarView } from "./calendar-view";

export function SessionsPage() {
  const { user, isLoaded } = useUser();
  const role = user?.publicMetadata?.role as string | undefined;
  const isCaregiver = role === "caregiver";
  const isSLP = !isCaregiver;

  const {
    currentDate,
    weekStart,
    view,
    setView,
    goToToday,
    goToPrevious,
    goToNext,
  } = useCalendar();

  const appointmentsRaw = useAppointments(weekStart);
  const patients = usePatients("active");

  const availableSlots = useQuery(
    api.appointments.getAvailableSlots,
    isLoaded && isSLP && user?.id
      ? { slpId: user.id, weekStart }
      : "skip",
  );

  const { slots: availabilitySlots, createSlot, removeSlot } = useAvailability(
    isSLP ? user?.id : undefined,
  );

  const { create, startDeveloperTestCall } = useAppointmentActions();
  const router = useRouter();
  const showDeveloperAccelerators = canShowDeveloperAccelerators(
    user?.primaryEmailAddress?.emailAddress ?? null,
  );

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<number | null>(null);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [testCallLoading, setTestCallLoading] = useState(false);

  const appointments: AppointmentListItem[] = (appointmentsRaw ?? []).map(
    (a) => ({
      _id: a._id,
      scheduledAt: a.scheduledAt,
      duration: a.duration,
      status: a.status,
      patient: a.patient
        ? {
            firstName: a.patient.firstName,
            lastName: a.patient.lastName,
          }
        : null,
    }),
  );

  const handleBook = async (args: {
    patientId: Id<"patients">;
    scheduledAt: number;
    notes?: string;
    timezone: string;
  }) => {
    await create({
      patientId: args.patientId,
      scheduledAt: args.scheduledAt,
      duration: 30,
      notes: args.notes,
      timezone: args.timezone,
    });
    toast.success("Session booked");
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-on-surface-variant">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface font-headline">
            Sessions
          </h1>
          <p className="text-sm text-on-surface-variant">
            {isCaregiver
              ? "Upcoming sessions for your family"
              : "Schedule, run, document, and manage billing for sessions"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSLP && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(true)}
              >
                <MaterialIcon icon="send" size="sm" />
                Send invite
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAvailabilityOpen(true)}
              >
                <MaterialIcon icon="schedule" size="sm" />
                Availability
              </Button>
              {showDeveloperAccelerators && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={testCallLoading}
                  onClick={async () => {
                    setTestCallLoading(true);
                    try {
                      const appointmentId = await startDeveloperTestCall();
                      router.push(`/sessions/${appointmentId}/call`);
                    } catch {
                      toast.error("Failed to start test call");
                    } finally {
                      setTestCallLoading(false);
                    }
                  }}
                >
                  <MaterialIcon icon="science" size="sm" />
                  Start test call
                </Button>
              )}
            </>
          )}
          <div className="flex items-center gap-1 rounded-full bg-surface-container p-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={goToPrevious}
              aria-label="Previous"
            >
              <MaterialIcon icon="chevron_left" size="sm" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full px-3 text-sm"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={goToNext}
              aria-label="Next"
            >
              <MaterialIcon icon="chevron_right" size="sm" />
            </Button>
          </div>
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as "week" | "day")}
            className="flex gap-1 rounded-full bg-surface-container p-1"
          >
            <ToggleGroupItem value="week" className="rounded-full px-3 text-sm">
              Week
            </ToggleGroupItem>
            <ToggleGroupItem value="day" className="rounded-full px-3 text-sm">
              Day
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <CalendarView
        weekStart={weekStart}
        view={view}
        currentDate={currentDate}
        appointments={appointments}
        availableSlots={isSLP ? availableSlots ?? [] : []}
        isSLP={isSLP}
        onEmptySlotClick={(ts) => {
          setBookingSlot(ts);
          setBookingOpen(true);
        }}
      />

      <BookingModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        slotTimestamp={bookingSlot}
        patients={patients}
        onBook={handleBook}
      />

      <InviteEmailModal open={inviteOpen} onOpenChange={setInviteOpen} />

      {isSLP && user?.id && (
        <AvailabilityEditor
          open={availabilityOpen}
          onOpenChange={setAvailabilityOpen}
          onCreate={async (args) => {
            await createSlot(args);
          }}
          onRemove={async (id) => {
            await removeSlot(id);
          }}
          existingSlots={availabilitySlots}
        />
      )}
    </div>
  );
}
