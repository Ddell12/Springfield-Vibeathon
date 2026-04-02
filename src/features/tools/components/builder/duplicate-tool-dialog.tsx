"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface DuplicateToolDialogProps {
  appInstanceId: Id<"app_instances">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicateToolDialog({
  appInstanceId,
  open,
  onOpenChange,
}: DuplicateToolDialogProps) {
  const router = useRouter();
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const patients = useQuery(api.patients.list, {});
  const duplicate = useMutation(api.tools.duplicate);

  async function handleConfirm() {
    if (!selectedPatientId) return;
    setIsLoading(true);
    try {
      const newId = await duplicate({
        id: appInstanceId,
        patientId: selectedPatientId as Id<"patients">,
      });
      toast.success("App duplicated");
      onOpenChange(false);
      router.push(`/tools/${newId}`);
    } catch {
      toast.error("Failed to duplicate app");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate App</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <Label htmlFor="dup-patient">Copy to child</Label>
          <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
            <SelectTrigger id="dup-patient">
              <SelectValue placeholder="Select a child" />
            </SelectTrigger>
            <SelectContent>
              {patients?.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {p.firstName} {p.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedPatientId || isLoading}>
            {isLoading ? "Duplicating…" : "Duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
