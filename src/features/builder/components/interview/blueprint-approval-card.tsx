"use client";

import { Button } from "@/shared/components/ui/button";

import type { TherapyBlueprint } from "../../lib/schemas";
import { BlueprintCard } from "../blueprint-card";

interface BlueprintApprovalCardProps {
  blueprint: TherapyBlueprint;
  onApprove: () => void;
  onEdit: () => void;
}

export function BlueprintApprovalCard({ blueprint, onApprove, onEdit }: BlueprintApprovalCardProps) {
  return (
    <div className="space-y-3">
      <BlueprintCard blueprint={blueprint} />
      <div className="flex items-center gap-3">
        <Button
          onClick={onApprove}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold rounded-xl px-6 shadow-md hover:shadow-lg"
        >
          Build this!
        </Button>
        <Button variant="ghost" onClick={onEdit}>
          Change something
        </Button>
      </div>
    </div>
  );
}
