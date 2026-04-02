"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

import { ROUTES } from "@/core/routes";
import { useIntakeForms } from "@/features/intake/hooks/use-intake-forms";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useFamilyData } from "../hooks/use-family-data";
import { AppPicker } from "./app-picker";
import { CelebrationCard } from "./celebration-card";
import { FamilyDashboardHeader } from "./family-dashboard-header";
import { FamilyIntakeBanner } from "./family-intake-banner";
import { FamilyKidModeEntry } from "./family-kid-mode-entry";
import { FamilyMessagesCard } from "./family-messages-card";
import { FamilySpeechCoachCards } from "./family-speech-coach-cards";
const PinSetupModal = dynamic(
  () => import("./pin-setup-modal").then((m) => ({ default: m.PinSetupModal })),
  { ssr: false }
);
import { PublishedToolsSection } from "./published-tools-section";
import { StreakTracker } from "./streak-tracker";
import { TodayActivities } from "./today-activities";
import { WeeklyProgress } from "./weekly-progress";

interface FamilyDashboardProps {
  paramsPromise: Promise<{ patientId: string }>;
}

export function FamilyDashboard({ paramsPromise }: FamilyDashboardProps) {
  const { patientId } = React.use(paramsPromise);

  return <FamilyDashboardInner patientId={patientId} />;
}

function FamilyDashboardInner({ patientId }: { patientId: string }) {
  const { isAuthenticated } = useConvexAuth();

  const patient = useQuery(
    api.patients.get,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );

  const goals = useQuery(
    api.goals.listByPatient,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );

  const { streakData, unreadCount, isLoading } = useFamilyData(
    patientId as Id<"patients">
  );

  const { requiredFormProgress } = useIntakeForms(patientId as Id<"patients">);

  const router = useRouter();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showAppPicker, setShowAppPicker] = useState(false);
  const hasPIN = useQuery(
    api.childApps.hasPIN,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );
  const setPINMutation = useMutation(api.childApps.setPIN);

  function handleKidMode() {
    if (hasPIN === false) {
      setShowPinSetup(true);
    } else {
      router.push(ROUTES.FAMILY_PLAY(patientId));
    }
  }

  async function handlePinSet(pin: string) {
    await setPINMutation({ patientId: patientId as Id<"patients">, pin });
    setShowPinSetup(false);
    router.push(ROUTES.FAMILY_PLAY(patientId));
  }

  const childName = patient?.firstName ?? "your child";
  const metGoals = Array.isArray(goals)
    ? goals.filter((g: { status: string }) => g.status === "met")
    : [];
  const isPatientLoading = patient === undefined || isLoading;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      {isPatientLoading ? (
        <Skeleton className="h-8 w-48" />
      ) : (
        <FamilyDashboardHeader patient={patient} />
      )}

      {/* Intake banner */}
      <FamilyIntakeBanner
        patientId={patientId}
        childName={childName}
        requiredFormProgress={requiredFormProgress}
      />

      {/* Kid Mode entry — always rendered so PIN loading state is visible */}
      <FamilyKidModeEntry
        hasPIN={hasPIN}
        onEnter={handleKidMode}
        onManageApps={() => setShowAppPicker(true)}
      />

      <PinSetupModal
        open={showPinSetup}
        onOpenChange={setShowPinSetup}
        onPinSet={handlePinSet}
      />

      <AppPicker
        open={showAppPicker}
        onOpenChange={setShowAppPicker}
        patientId={patientId as Id<"patients">}
      />

      {isPatientLoading ? (
        <>
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </>
      ) : (
        <>
          {/* Celebration card (conditionally rendered) */}
          {streakData && (
            <CelebrationCard
              childName={childName}
              currentStreak={streakData.currentStreak}
              goals={metGoals.map((g: { status: string; shortDescription: string }) => ({
                status: g.status,
                shortDescription: g.shortDescription,
              }))}
            />
          )}

          {/* Streak tracker */}
          {streakData ? (
            <StreakTracker streakData={streakData} />
          ) : (
            <Skeleton className="h-28 rounded-xl" />
          )}

          <Separator />

          {/* Today's Activities */}
          <TodayActivities patientId={patientId as Id<"patients">} />

          {/* Published apps */}
          <PublishedToolsSection patientId={patientId as Id<"patients">} />

          {/* Speech Coach programs */}
          <FamilySpeechCoachCardsConnected patientId={patientId as Id<"patients">} />

          <Separator />

          {/* Weekly progress */}
          {streakData ? (
            <WeeklyProgress
              weeklyPracticeDays={streakData.weeklyPracticeDays}
              weeklyTarget={streakData.weeklyTarget}
            />
          ) : (
            <Skeleton className="h-10 rounded-full" />
          )}

          {/* Messages */}
          <FamilyMessagesCard patientId={patientId} unreadCount={unreadCount ?? 0} />
        </>
      )}
    </div>
  );
}

function FamilySpeechCoachCardsConnected({ patientId }: { patientId: Id<"patients"> }) {
  const programs = useQuery(api.homePrograms.listActiveSpeechCoachByPatient, { patientId });

  if (!programs) return null;

  return <FamilySpeechCoachCards patientId={patientId} programs={programs} />;
}
