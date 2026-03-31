"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { Gamepad2, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { ROUTES } from "@/core/routes";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useIntakeForms } from "@/features/intake/hooks/use-intake-forms";
import { useFamilyData } from "../hooks/use-family-data";
import { AppPicker } from "./app-picker";
import { CelebrationCard } from "./celebration-card";
const PinSetupModal = dynamic(
  () => import("./pin-setup-modal").then((m) => ({ default: m.PinSetupModal })),
  { ssr: false }
);
import { StreakTracker } from "./streak-tracker";
import { TodayActivities } from "./today-activities";
import { WeeklyProgress } from "./weekly-progress";

interface FamilyDashboardProps {
  paramsPromise: Promise<{ patientId: string }>;
}

export function FamilyDashboard({ paramsPromise }: FamilyDashboardProps) {
  const { patientId } = use(paramsPromise);
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

  // Loading state
  if (patient === undefined || isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    );
  }

  const childName = patient?.firstName ?? "your child";
  const metGoals = goals?.filter((g: { status: string }) => g.status === "met") ?? [];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="font-headline text-2xl font-bold text-foreground">
          {patient ? `${patient.firstName}'s Practice` : "Practice Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track progress and stay connected with the therapy team.
        </p>
      </div>

      {/* Intake banner */}
      {!requiredFormProgress.isComplete && (
        <Link
          href={`/intake/${patientId}`}
          className="flex items-center gap-3 rounded-xl bg-caution/10 p-4 transition-colors hover:bg-caution/15"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-caution/20">
            <MaterialIcon icon="description" className="text-caution" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              Complete intake forms for {childName}
            </p>
            <p className="text-xs text-muted-foreground">
              {requiredFormProgress.signed} of {requiredFormProgress.total} required forms signed
            </p>
          </div>
          <MaterialIcon icon="chevron_right" className="text-muted-foreground" />
        </Link>
      )}

      {/* Kid Mode entry */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleKidMode}
          className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary-container py-6 text-lg font-bold text-white shadow-lg"
          size="lg"
        >
          <Gamepad2 className="h-6 w-6" />
          Kid Mode
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14"
          onClick={() => setShowAppPicker(true)}
          aria-label="Manage apps"
          title="Manage apps for Kid Mode"
        >
          <Settings2 className="h-5 w-5" />
        </Button>
      </div>

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

      {/* Speech Coach programs */}
      <SpeechCoachCards patientId={patientId as Id<"patients">} />

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

      {/* Messages link */}
      <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Therapist messages</p>
          {unreadCount !== undefined && unreadCount > 0 ? (
            <p className="text-xs text-caution">
              {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Stay in touch with your team</p>
          )}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/family/${patientId}/messages`}>Message Therapist</Link>
        </Button>
      </div>
    </div>
  );
}

function SpeechCoachCards({ patientId }: { patientId: Id<"patients"> }) {
  const programs = useQuery(api.homePrograms.getActiveByPatient, { patientId });

  if (!programs) return null;

  const speechCoachPrograms = programs.filter(
    (p: { type?: string }) => p.type === "speech-coach"
  );

  if (speechCoachPrograms.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-headline text-lg font-semibold text-foreground">Speech Coach</h2>
      {speechCoachPrograms.map((program) => (
        <Link
          key={program._id}
          href={`/family/${patientId}/speech-coach?program=${program._id}`}
          className="flex items-center gap-4 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted/70"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <MaterialIcon icon="record_voice_over" className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{program.title}</p>
            <p className="text-xs text-muted-foreground">
              {(program as { speechCoachConfig?: { targetSounds?: string[] } }).speechCoachConfig?.targetSounds?.join(", ") ?? "Voice coaching"}
            </p>
          </div>
          <MaterialIcon icon="chevron_right" className="text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
