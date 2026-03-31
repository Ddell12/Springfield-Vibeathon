"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useCreateGoal, useUpdateGoal } from "../hooks/use-goals";
import { type GoalDomain } from "../lib/goal-bank-data";
import { domainLabel } from "../lib/goal-utils";
import { GoalBankPicker, type GoalBankSelection } from "./goal-bank-picker";

const DOMAINS: GoalDomain[] = [
  "articulation", "language-receptive", "language-expressive",
  "fluency", "voice", "pragmatic-social", "aac", "feeding",
];

interface GoalFormProps {
  patientId: Id<"patients">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editGoal?: {
    _id: Id<"goals">;
    domain: GoalDomain;
    shortDescription: string;
    fullGoalText: string;
    targetAccuracy: number;
    targetConsecutiveSessions: number;
    startDate: string;
    targetDate?: string;
    notes?: string;
  };
}

export function GoalForm({ patientId, open, onOpenChange, editGoal }: GoalFormProps) {
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const [saving, setSaving] = useState(false);

  const [domain, setDomain] = useState<GoalDomain>(editGoal?.domain ?? "articulation");
  const [shortDescription, setShortDescription] = useState(editGoal?.shortDescription ?? "");
  const [fullGoalText, setFullGoalText] = useState(editGoal?.fullGoalText ?? "");
  const [targetAccuracy, setTargetAccuracy] = useState(editGoal?.targetAccuracy ?? 80);
  const [targetConsecutiveSessions, setTargetConsecutiveSessions] = useState(editGoal?.targetConsecutiveSessions ?? 3);
  const [startDate, setStartDate] = useState(editGoal?.startDate ?? new Date().toISOString().slice(0, 10));
  const [targetDate, setTargetDate] = useState(editGoal?.targetDate ?? "");
  const [notes, setNotes] = useState(editGoal?.notes ?? "");

  function handleTemplateSelect(selection: GoalBankSelection) {
    setDomain(selection.domain);
    setShortDescription(selection.shortDescription);
    setTargetAccuracy(selection.defaultTargetAccuracy);
    setTargetConsecutiveSessions(selection.defaultConsecutiveSessions);
    setFullGoalText(selection.fullGoalText);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editGoal) {
        await updateGoal({
          goalId: editGoal._id,
          domain,
          shortDescription,
          fullGoalText,
          targetAccuracy,
          targetConsecutiveSessions,
          startDate,
          targetDate: targetDate || undefined,
          notes: notes || undefined,
        });
      } else {
        await createGoal({
          patientId,
          domain,
          shortDescription,
          fullGoalText,
          targetAccuracy,
          targetConsecutiveSessions,
          startDate,
          targetDate: targetDate || undefined,
          notes: notes || undefined,
        });
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save goal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editGoal ? "Edit Goal" : "Add IEP Goal"}</DialogTitle>
          <DialogDescription>
            {editGoal ? "Update this goal's details." : "Choose from the goal bank or write your own."}
          </DialogDescription>
        </DialogHeader>

        {!editGoal && (
          <Tabs defaultValue="bank" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="bank" className="flex-1">Goal Bank</TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="bank">
              <GoalBankPicker onSelect={handleTemplateSelect} />
            </TabsContent>
            <TabsContent value="custom">
              <p className="text-sm text-muted-foreground">Fill out all fields below.</p>
            </TabsContent>
          </Tabs>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="domain">Domain</Label>
            <Select value={domain} onValueChange={(v) => setDomain(v as GoalDomain)}>
              <SelectTrigger id="domain">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOMAINS.map((d) => (
                  <SelectItem key={d} value={d}>{domainLabel(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="shortDesc">Short Description</Label>
            <Input
              id="shortDesc"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder='e.g., "Produce /r/ in initial position"'
              maxLength={200}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fullGoal">Full Goal Text</Label>
            <Textarea
              id="fullGoal"
              value={fullGoalText}
              onChange={(e) => setFullGoalText(e.target.value)}
              placeholder="Complete IEP goal with measurable criteria..."
              rows={3}
              maxLength={2000}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="accuracy">Target Accuracy (%)</Label>
              <Input
                id="accuracy"
                type="number"
                min={1}
                max={100}
                value={targetAccuracy}
                onChange={(e) => setTargetAccuracy(Number(e.target.value))}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sessions">Consecutive Sessions</Label>
              <Input
                id="sessions"
                type="number"
                min={1}
                max={10}
                value={targetConsecutiveSessions}
                onChange={(e) => setTargetConsecutiveSessions(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="targetDate">Target Date (optional)</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={2}
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving..." : editGoal ? "Update Goal" : "Add Goal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
