"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

import type { TherapyBlueprint } from "../lib/schemas";

interface BlueprintCardProps {
  blueprint: TherapyBlueprint;
}

function BlueprintField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-1">
        {label}
      </span>
      <p className="text-sm font-medium text-on-surface">{value}</p>
    </div>
  );
}

export function BlueprintCard({ blueprint }: BlueprintCardProps) {
  const { title, therapyGoal, targetSkill, ageRange, interactionModel, description } = blueprint;

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
          <MaterialIcon icon="auto_awesome" size="sm" className="text-primary" filled />
          <h3 className="font-headline font-semibold text-[13px] tracking-wide text-primary uppercase">
            App Blueprint
          </h3>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <h2 className="font-headline font-normal text-xl text-primary leading-tight">
            {title}
          </h2>

          <div className="space-y-4">
            <BlueprintField label="Therapy Goal" value={therapyGoal} />
            <BlueprintField label="Target Skill" value={targetSkill} />

            <div className="grid grid-cols-2 gap-4">
              <BlueprintField label="Age Range" value={ageRange} />
              <BlueprintField label="Interaction Model" value={interactionModel} />
            </div>

            {description && (
              <div className="pt-2 border-t border-outline-variant/10">
                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                  {description}
                </p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
