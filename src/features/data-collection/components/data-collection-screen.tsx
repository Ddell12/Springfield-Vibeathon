"use client";

import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { use, useState } from "react";

import { useActiveGoals } from "@/features/goals/hooks/use-goals";
import { Button } from "@/shared/components/ui/button";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useDataCollection } from "../hooks/use-data-collection";
import { CueLevelToggle } from "./cue-level-toggle";
import { RunningTally } from "./running-tally";
import { SessionSummary } from "./session-summary";
import { TargetSelector } from "./target-selector";
import { TrialButtons } from "./trial-buttons";

interface DataCollectionScreenProps {
  paramsPromise: Promise<{ id: string }>;
}

type ScreenState = "picking" | "collecting" | "summary";

export function DataCollectionScreen({ paramsPromise }: DataCollectionScreenProps) {
  const { id } = use(paramsPromise);
  const patientId = id as Id<"patients">;
  const { isAuthenticated } = useConvexAuth();

  const [screenState, setScreenState] = useState<ScreenState>("picking");

  const {
    activeCollections,
    activeCollection,
    activeTrialId,
    setActiveTrialId,
    activeCueLevel,
    setActiveCueLevel,
    startCollection,
    recordTrial,
    endCollection,
    correctCount,
    totalCount,
  } = useDataCollection(patientId);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please sign in to collect data.</p>
      </div>
    );
  }

  if (screenState === "summary") {
    return (
      <SessionSummary
        collections={activeCollections}
        patientId={patientId}
        onStartNew={() => setScreenState("picking")}
      />
    );
  }

  if (screenState === "collecting" && activeCollection) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/patients/${patientId}`}>← Back</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await endCollection();
              setScreenState("summary");
            }}
          >
            End Session
          </Button>
        </div>

        {/* Target selector — only shown when multiple targets */}
        <TargetSelector
          targets={activeCollections}
          activeTargetId={activeTrialId}
          onSelect={setActiveTrialId}
        />

        {/* Target label */}
        <div className="px-4 py-2">
          <p className="text-lg font-semibold">{activeCollection.targetDescription}</p>
        </div>

        {/* Cue level toggle */}
        <CueLevelToggle value={activeCueLevel} onChange={setActiveCueLevel} />

        {/* Running tally — centered, large */}
        <div className="flex flex-1 items-center justify-center">
          <RunningTally correct={correctCount} total={totalCount} />
        </div>

        {/* Trial buttons pinned to bottom */}
        <div className="pb-8 pt-2">
          <TrialButtons
            onCorrect={() => recordTrial(true)}
            onError={() => recordTrial(false)}
          />
        </div>
      </div>
    );
  }

  // Goal picker screen
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Start Data Collection</h1>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/patients/${patientId}`}>Cancel</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Select a goal to begin collecting trial data.
      </p>

      <GoalPickerContent
        patientId={patientId}
        onSelect={async (goalId) => {
          await startCollection(goalId);
          setScreenState("collecting");
        }}
      />
    </div>
  );
}

// Inner component that uses the goals hook — kept separate so the hook
// call is always at the top level (rules of hooks).
function GoalPickerContent({
  patientId,
  onSelect,
}: {
  patientId: Id<"patients">;
  onSelect: (goalId: Id<"goals">) => Promise<void>;
}) {
  const goals = useActiveGoals(patientId);
  const [selecting, setSelecting] = useState<Id<"goals"> | null>(null);

  if (goals === undefined) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="rounded-xl bg-muted p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No active goals found for this patient.
        </p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link href={`/patients/${patientId}/goals/new`}>Add a Goal</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {goals.map((goal) => (
        <button
          key={goal._id}
          type="button"
          disabled={selecting !== null}
          onClick={async () => {
            setSelecting(goal._id);
            try {
              await onSelect(goal._id);
            } finally {
              setSelecting(null);
            }
          }}
          className="flex flex-col gap-1 rounded-xl bg-card border border-border p-4 text-left
            transition-colors duration-300 hover:bg-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            touch-manipulation"
        >
          <span className="text-sm font-semibold text-foreground line-clamp-2">
            {goal.shortDescription}
          </span>
          <span className="text-xs text-muted-foreground capitalize">{goal.domain}</span>
        </button>
      ))}
    </div>
  );
}
