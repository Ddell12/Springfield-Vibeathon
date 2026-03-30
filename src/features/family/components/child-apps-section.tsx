"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import { AppPicker } from "./app-picker";

interface ChildAppsSectionProps {
  patientId: Id<"patients">;
}

export function ChildAppsSection({ patientId }: ChildAppsSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const childApps = useQuery(api.childApps.listByPatient, { patientId });
  const removeApp = useMutation(api.childApps.remove);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-body text-lg font-semibold">Kid Mode Apps</h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add App
        </Button>
      </div>

      {childApps === undefined ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : childApps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No apps assigned yet. Add apps for the child to use in Kid Mode.
        </p>
      ) : (
        <div className="space-y-2">
          {childApps.map((ca) => (
            <div
              key={ca._id}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                  {(ca.label ?? ca.appTitle).charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{ca.label ?? ca.appTitle}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeApp({ childAppId: ca._id })}
                aria-label="Remove app"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AppPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        patientId={patientId}
      />
    </div>
  );
}
