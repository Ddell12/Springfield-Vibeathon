"use client";

import { useAction, useQuery } from "convex/react";
import { useState } from "react";

import { useEntitlements } from "@/core/hooks/use-entitlements";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";

export function BillingSection() {
  const { plan, limits, isPremium, isLoading } = useEntitlements();
  const apps = useQuery(api.apps.list) ?? [];
  const decks = useQuery(api.flashcard_decks.list) ?? [];
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
        <h3 className="font-headline text-lg font-medium text-on-surface mb-6">
          Billing
        </h3>
        <div className="animate-pulse h-32 rounded-2xl bg-surface-container" />
      </section>
    );
  }

  return (
    <section>
      <h3 className="font-headline text-lg font-medium text-on-surface mb-6">
        Billing
      </h3>

      <div className="rounded-2xl bg-surface-container p-6 space-y-4">
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
            <Button
              variant="outline"
              onClick={handleManage}
              disabled={actionLoading}
            >
              {actionLoading ? "Loading..." : "Manage Subscription"}
            </Button>
          ) : (
            <Button
              onClick={handleUpgrade}
              disabled={actionLoading}
              className="bg-gradient-135 text-white"
            >
              {actionLoading ? "Redirecting..." : "Upgrade to Premium"}
            </Button>
          )}
        </div>

        {!isPremium && (
          <div className="border-t border-outline-variant pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Apps</span>
              <span className="font-medium text-on-surface">
                {apps.length} / {limits.maxApps}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Flashcard Decks</span>
              <span className="font-medium text-on-surface">
                {decks.length} / {limits.maxDecks}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
