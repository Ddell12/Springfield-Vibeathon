"use client";

import { useMutation, useQuery } from "convex/react";

import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useAppointments(weekStart?: number) {
  const user = useCurrentUser();
  const isLoaded = user !== undefined;
  const isCaregiver = user?.role === "caregiver";

  const slpArgs = weekStart !== undefined ? { weekStart } : {};
  const caregiverArgs = weekStart !== undefined ? { weekStart } : {};

  const slpAppointments = useQuery(
    api.appointments.listBySlp,
    isLoaded && !isCaregiver ? slpArgs : "skip",
  );

  const caregiverAppointments = useQuery(
    api.appointments.listForCaregiver,
    isLoaded && isCaregiver ? caregiverArgs : "skip",
  );

  if (!isLoaded) return [];
  if (isCaregiver) return caregiverAppointments ?? [];
  return slpAppointments ?? [];
}

export function useAppointment(appointmentId: Id<"appointments"> | null) {
  return useQuery(
    api.appointments.get,
    appointmentId ? { appointmentId } : "skip",
  );
}

export function useAvailableSlots(slpId: string | null, weekStart: number) {
  return useQuery(
    api.appointments.getAvailableSlots,
    slpId ? { slpId, weekStart } : "skip",
  );
}

export function useAppointmentActions() {
  const create = useMutation(api.appointments.create);
  const bookAsCaregiver = useMutation(api.appointments.bookAsCaregiver);
  const cancel = useMutation(api.appointments.cancel);
  const startSession = useMutation(api.appointments.startSession);
  const completeSession = useMutation(api.appointments.completeSession);
  const markNoShow = useMutation(api.appointments.markNoShow);
  const startDeveloperTestCall = useMutation(api.appointments.startDeveloperTestCall);

  return {
    create,
    bookAsCaregiver,
    cancel,
    startSession,
    completeSession,
    markNoShow,
    startDeveloperTestCall,
  };
}
