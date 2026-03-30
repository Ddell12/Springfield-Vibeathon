"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface AppPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: Id<"patients">;
}

export function AppPicker({ open, onOpenChange, patientId }: AppPickerProps) {
  const apps = useQuery(api.apps.listMine);
  const childApps = useQuery(api.childApps.listByPatient, { patientId });
  const assign = useMutation(api.childApps.assign);
  const remove = useMutation(api.childApps.remove);

  const assignedAppIds = new Set((childApps ?? []).map((ca) => ca.appId as string));

  const childAppByAppId = new Map(
    (childApps ?? []).map((ca) => [ca.appId as string, ca._id])
  );

  async function handleToggle(appId: Id<"apps">, title: string) {
    const isAssigned = assignedAppIds.has(appId as string);
    try {
      if (isAssigned) {
        const childAppId = childAppByAppId.get(appId as string);
        if (childAppId) await remove({ childAppId });
        toast.success(`Removed "${title}" from Kid Mode`);
      } else {
        await assign({ patientId, appId });
        toast.success(`Added "${title}" to Kid Mode`);
      }
    } catch {
      toast.error(isAssigned ? "Failed to remove app" : "Failed to add app");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Kid Mode Apps</DialogTitle>
          <DialogDescription>
            Choose which apps appear in Kid Mode
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {!apps ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : apps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved apps yet. Build one in the Builder!
            </p>
          ) : (
            apps.map((app) => {
              const isAssigned = assignedAppIds.has(app._id as string);
              return (
                <button
                  key={app._id}
                  onClick={() => handleToggle(app._id, app.title)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors",
                    isAssigned ? "bg-primary/5" : "hover:bg-muted"
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                    {app.title.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium">{app.title}</span>
                  {isAssigned ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
