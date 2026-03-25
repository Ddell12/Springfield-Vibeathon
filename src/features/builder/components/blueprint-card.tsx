"use client";

import { Lightbulb, Sparkles } from "lucide-react";

import { cn } from "@/core/utils";

interface BlueprintCardProps {
  blueprint: Record<string, unknown>;
}

function BlueprintField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-1">
        {label}
      </label>
      <p className="text-sm font-medium text-on-surface">{value}</p>
    </div>
  );
}

export function BlueprintCard({ blueprint }: BlueprintCardProps) {
  const title = typeof blueprint.title === "string" ? blueprint.title : undefined;
  const therapyGoal = typeof blueprint.therapyGoal === "string" ? blueprint.therapyGoal : undefined;
  const targetSkill = typeof blueprint.targetSkill === "string" ? blueprint.targetSkill : undefined;
  const ageRange = typeof blueprint.ageRange === "string" ? blueprint.ageRange : undefined;
  const targetUser = typeof blueprint.targetUser === "string" ? blueprint.targetUser : undefined;
  const interactionModel = typeof blueprint.interactionModel === "string" ? blueprint.interactionModel : undefined;
  const description = typeof blueprint.description === "string" ? blueprint.description : undefined;
  const therapistNote = typeof blueprint.therapistNote === "string" ? blueprint.therapistNote : undefined;

  return (
    <div
        className={cn(
          "bg-surface-container-lowest rounded-xl overflow-hidden",
          "shadow-[0_20px_40px_rgba(19,29,30,0.06)]",
          "outline outline-1 outline-outline-variant/15"
        )}
      >
        {/* Card Header */}
        <div className="bg-surface-container-low/50 px-5 py-3 flex items-center gap-2 border-b border-outline-variant/10">
          <Sparkles className="size-5 text-primary fill-primary" />
          <h3 className="font-headline font-semibold text-[13px] tracking-wide text-primary uppercase">
            App Blueprint
          </h3>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {title && (
            <h2 className="font-headline font-bold text-xl text-primary leading-tight">
              {title}
            </h2>
          )}

          <div className="space-y-4">
            {therapyGoal && <BlueprintField label="Therapy Goal" value={therapyGoal} />}
            {targetSkill && <BlueprintField label="Target Skill" value={targetSkill} />}

            {/* Age Range + Target User side by side */}
            {(ageRange || targetUser) && (
              <div className="grid grid-cols-2 gap-4">
                {ageRange && <BlueprintField label="Age Range" value={ageRange} />}
                {targetUser && <BlueprintField label="Target User" value={targetUser} />}
              </div>
            )}

            {interactionModel && (
              <BlueprintField label="Interaction Model" value={interactionModel} />
            )}

            {description && (
              <div className="pt-2 border-t border-outline-variant/10">
                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                  {description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Warm Peach Highlight Bar */}
        {therapistNote && (
          <div className="bg-tertiary-fixed px-5 py-4 flex gap-3">
            <Lightbulb className="size-[18px] text-on-tertiary-fixed shrink-0 mt-0.5" />
            <p className="text-[12px] font-medium text-on-tertiary-fixed italic leading-snug">
              &ldquo;{therapistNote}&rdquo;
            </p>
          </div>
        )}
    </div>
  );
}
