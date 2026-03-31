"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";

import type { Id } from "../../../../convex/_generated/dataModel";
import type { TherapyBlueprint } from "../lib/schemas";
import { ContinueCard } from "./continue-card";
import { InputBar } from "./input-bar";
import { InterviewController } from "./interview/interview-controller";

const CATEGORY_CHIPS: { label: string; prompt: string }[] = [
  { label: "Communication Board", prompt: "I need a communication board for a child who " },
  { label: "Visual Schedule", prompt: "I need a visual schedule for " },
  { label: "Token Board", prompt: "I need a token board for a child working on " },
  { label: "Social Story", prompt: "I need a social story about " },
  { label: "Feelings Check-In", prompt: "I need a feelings check-in tool for " },
  { label: "Bridges' choice", prompt: "Build me something useful for a child with " },
];

function getGreeting(firstName: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return `Good morning, ${firstName}`;
  if (hour >= 12 && hour < 18) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

interface HomeScreenProps {
  onGenerate: (prompt: string, blueprint?: TherapyBlueprint) => void;
  mostRecent?: { _id: Id<"sessions">; title: string } | null;
  onContinueDismiss?: () => void;
}

export function HomeScreen({ onGenerate, mostRecent, onContinueDismiss }: HomeScreenProps) {
  const { user } = useUser();
  const firstName = user?.firstName ?? "there";
  const [input, setInput] = useState("");
  const [showGuided, setShowGuided] = useState(false);

  const handleSubmit = (value: string) => {
    if (!value.trim()) return;
    onGenerate(value.trim());
    setInput("");
  };

  const handleGuidedGenerate = (prompt: string, blueprint?: TherapyBlueprint) => {
    onGenerate(prompt, blueprint);
    setShowGuided(false);
  };

  if (showGuided) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
        <div className="text-center">
          <h1 className="font-headline text-3xl font-normal text-foreground">
            What would you like to build?
          </h1>
        </div>
        <div className="w-full max-w-2xl">
          <InterviewController
            onGenerate={handleGuidedGenerate}
            onEscapeHatch={() => setShowGuided(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container text-lg font-bold text-white shadow-sm">
          B
        </div>
        <h1 className="font-headline text-4xl font-normal text-foreground">
          {getGreeting(firstName)}
        </h1>
      </div>

      <InputBar
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        placeholder="What would you like to build?"
        isGenerating={false}
        className="w-full max-w-2xl"
        showGuidedPill
        onGuidedClick={() => setShowGuided(true)}
      />

      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORY_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setInput(chip.prompt)}
            className="rounded-full border border-outline-variant/30 bg-surface px-4 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {mostRecent && (
        <ContinueCard
          sessionId={mostRecent._id}
          title={mostRecent.title}
          onDismiss={() => onContinueDismiss?.()}
        />
      )}
    </div>
  );
}
