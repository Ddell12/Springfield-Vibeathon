"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

interface BlueprintCardProps {
  blueprint: Record<string, unknown>;
}

export function BlueprintCard({ blueprint }: BlueprintCardProps) {
  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle className="text-base">App Blueprint</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {typeof blueprint.title === "string" && (
          <h3 className="font-semibold">{blueprint.title}</h3>
        )}
        {typeof blueprint.therapyGoal === "string" && (
          <p>
            <span className="font-medium">Goal:</span>{" "}
            {blueprint.therapyGoal}
          </p>
        )}
        {typeof blueprint.targetSkill === "string" && (
          <p>
            <span className="font-medium">Skill:</span>{" "}
            {blueprint.targetSkill}
          </p>
        )}
        {typeof blueprint.targetUser === "string" && (
          <p>
            <span className="font-medium">For:</span>{" "}
            {blueprint.targetUser}
          </p>
        )}
        {typeof blueprint.ageRange === "string" && (
          <p>
            <span className="font-medium">Ages:</span>{" "}
            {blueprint.ageRange}
          </p>
        )}
        {typeof blueprint.interactionModel === "string" && (
          <p>
            <span className="font-medium">Interaction:</span>{" "}
            {blueprint.interactionModel}
          </p>
        )}
        {typeof blueprint.description === "string" && (
          <p className="text-muted-foreground">
            {blueprint.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
