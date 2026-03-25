"use client";

import { useMutation } from "convex/react";
import { useState } from "react";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";

interface BlueprintCardProps {
  sessionId: Id<"sessions">;
  blueprint: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blueprint: any;
    markdownPreview: string;
    approved: boolean;
  };
}

export function BlueprintCard({ sessionId, blueprint }: BlueprintCardProps) {
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const approve = useMutation(api.blueprints.approve);
  const requestChanges = useMutation(api.blueprints.requestChanges);

  const bp = blueprint.blueprint;

  const handleApprove = async () => {
    await approve({ sessionId });
  };

  const handleRequestChanges = async () => {
    if (!feedback.trim()) return;
    await requestChanges({ sessionId, feedback: feedback.trim() });
    setFeedback("");
    setShowFeedback(false);
  };

  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle className="text-base">App Blueprint</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <h3 className="font-semibold">{bp?.title}</h3>
        {bp?.therapyGoal && (
          <p>
            <span className="font-medium">Goal:</span> {bp.therapyGoal}
          </p>
        )}
        {bp?.targetSkill && (
          <p>
            <span className="font-medium">Skill:</span> {bp.targetSkill}
          </p>
        )}
        {bp?.ageRange && (
          <p>
            <span className="font-medium">Ages:</span> {bp.ageRange}
          </p>
        )}
        {bp?.interactionModel && (
          <p>
            <span className="font-medium">Interaction:</span>{" "}
            {bp.interactionModel}
          </p>
        )}
        {bp?.reinforcementStrategy && (
          <p>
            <span className="font-medium">Reinforcement:</span>{" "}
            {bp.reinforcementStrategy.type} —{" "}
            {bp.reinforcementStrategy.description}
          </p>
        )}
        {bp?.implementationRoadmap && (
          <div>
            <p className="font-medium">Phases:</p>
            <ol className="ml-4 list-decimal text-muted-foreground">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {bp.implementationRoadmap.map((phase: any, i: number) => (
                <li key={i}>
                  {phase.phase} — {phase.description}
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2">
        {!showFeedback ? (
          <div className="flex w-full gap-2">
            <Button onClick={handleApprove} className="flex-1">
              Looks Good
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFeedback(true)}
              className="flex-1"
            >
              Request Changes
            </Button>
          </div>
        ) : (
          <div className="flex w-full gap-2">
            <Input
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What should change?"
              className="flex-1"
            />
            <Button onClick={handleRequestChanges} disabled={!feedback.trim()}>
              Send
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
