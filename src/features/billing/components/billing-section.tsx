"use client";

import { useAction } from "convex/react";
import { useState } from "react";

import { useEntitlements } from "@/core/hooks/use-entitlements";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import { BillingHistory } from "./billing-history";
import { DowngradeWarningDialog } from "./downgrade-warning-dialog";
import { PlanComparisonCard } from "./plan-comparison-card";
import { UpgradeConfirmationDialog } from "./upgrade-confirmation-dialog";
import { UsageMeter } from "./usage-meter";

export function BillingSection() {
  const { isPremium, isLoading } = useEntitlements();
  const createCheckout = useAction(api.subscriptions.createCheckoutSession);
  const createPortal = useAction(api.subscriptions.createPortalSession);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleUpgrade() {
    setActionLoading(true);
    try {
      const { url } = await createCheckout();
      if (url) window.location.href = url;
    } finally {
      setActionLoading(false);
    }
  }

  async function handleManage() {
    setActionLoading(true);
    try {
      const { url } = await createPortal();
      if (url) window.location.href = url;
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <section>
        <h3 className="font-headline text-lg font-bold text-on-surface mb-6">
          Billing
        </h3>
        <div className="animate-pulse h-32 rounded-2xl bg-surface-container" />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h3 className="font-headline text-lg font-bold text-on-surface">
        Billing
      </h3>

      <PlanComparisonCard />

      <UsageMeter />

      <div className="rounded-2xl bg-surface-container p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-headline font-semibold text-on-surface">
              {isPremium ? "Premium" : "Free"} Plan
            </p>
            {isPremium && (
              <p className="text-sm text-on-surface-variant">$9.99/month</p>
            )}
          </div>
          {isPremium ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleManage}
                disabled={actionLoading}
              >
                {actionLoading ? "Loading..." : "Manage Subscription"}
              </Button>
              <DowngradeWarningDialog>
                <Button variant="ghost" className="text-destructive">
                  Cancel
                </Button>
              </DowngradeWarningDialog>
            </div>
          ) : (
            <UpgradeConfirmationDialog>
              <Button
                className="bg-gradient-135 text-white"
                disabled={actionLoading}
              >
                {actionLoading ? "Redirecting..." : "Upgrade to Premium"}
              </Button>
            </UpgradeConfirmationDialog>
          )}
        </div>
      </div>

      <BillingHistory />
    </section>
  );
}
