"use client";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

export function AccountSection() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-headline font-bold text-primary">Account</h2>
        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-high px-2 py-1 rounded">
          Advanced
        </span>
      </div>

      <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="bg-error-container p-2 rounded-lg flex-shrink-0">
            <MaterialIcon icon="warning" size="sm" className="text-error" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-on-surface mb-1">
              Danger Zone
            </h3>
            <p className="text-sm text-on-surface-variant">
              Deleting your account is permanent. All your therapy app
              configurations and history will be wiped from the sanctuary.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          disabled
          className="w-full py-3 px-6 rounded-lg border-2 border-error/20 text-error font-bold text-sm hover:bg-error/5 transition-colors h-auto"
        >
          Delete account
        </Button>
        <p className="text-xs text-on-surface-variant italic text-center">
          Account deletion is not yet available. Contact support for assistance.
        </p>
      </div>
    </div>
  );
}
