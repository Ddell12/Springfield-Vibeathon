"use client";

import { useState } from "react";
import { toast } from "sonner";

import { extractErrorMessage } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

import type { Id } from "../../../../convex/_generated/dataModel";
import { DAY_NAMES, TIME_OPTIONS } from "../lib/time-slots";

export function AvailabilityEditor({
  open,
  onOpenChange,
  onCreate,
  onRemove,
  existingSlots,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (args: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
    timezone: string;
  }) => Promise<void>;
  onRemove: (id: Id<"availability">) => Promise<void>;
  existingSlots: Array<{
    _id: Id<"availability">;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
  }>;
}) {
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [isRecurring, setIsRecurring] = useState(true);
  const [busy, setBusy] = useState(false);

  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const handleAdd = async () => {
    setBusy(true);
    try {
      if (startTime >= endTime) {
        toast.error("Start time must be before end time");
        return;
      }
      await onCreate({
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        isRecurring,
        timezone: tz,
      });
      toast.success("Availability added");
    } catch (e) {
      toast.error(extractErrorMessage(e, "Could not save availability"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-headline text-left">Weekly hours</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Day</Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((name, i) => (
                  <SelectItem key={name} value={String(i)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Start</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={`s-${t}`} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>End</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={`e-${t}`} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
            <Checkbox
              checked={isRecurring}
              onCheckedChange={(v) => setIsRecurring(v === true)}
            />
            <span className="text-sm text-on-surface">Repeats every week</span>
          </label>
          <Button
            type="button"
            className="bg-gradient-to-br from-[#00595c] to-[#0d7377] text-white"
            disabled={busy}
            onClick={() => void handleAdd()}
          >
            Add block
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            Current blocks
          </p>
          {existingSlots.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No blocks yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {existingSlots.map((slot) => (
                <li
                  key={slot._id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-container px-3 py-2"
                >
                  <span className="text-sm text-on-surface">
                    {DAY_NAMES[slot.dayOfWeek]} · {slot.startTime}–{slot.endTime}
                    {!slot.isRecurring && " (one-off)"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-on-surface-variant hover:text-destructive"
                    aria-label="Remove block"
                    onClick={() => {
                      void onRemove(slot._id).catch((e) => {
                        toast.error(extractErrorMessage(e, "Could not remove"));
                      });
                    }}
                  >
                    <MaterialIcon icon="delete" size="sm" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
