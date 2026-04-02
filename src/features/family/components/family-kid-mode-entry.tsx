"use client";

import { Gamepad2, Settings2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

interface FamilyKidModeEntryProps {
  hasPIN: boolean | undefined;
  onEnter: () => void;
  onManageApps: () => void;
}

export function FamilyKidModeEntry({
  hasPIN,
  onEnter,
  onManageApps,
}: FamilyKidModeEntryProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onEnter}
        disabled={hasPIN === undefined}
        className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary-container py-6 text-lg font-bold text-white shadow-lg"
        size="lg"
        aria-label="kid mode"
      >
        <Gamepad2 className="h-6 w-6" />
        Kid Mode
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-14 w-14"
        onClick={onManageApps}
        aria-label="Manage apps"
        title="Manage apps for Kid Mode"
      >
        <Settings2 className="h-5 w-5" />
      </Button>
    </div>
  );
}
