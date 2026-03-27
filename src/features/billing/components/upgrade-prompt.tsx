"use client";

import { useAction } from "convex/react";
import { useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";

export function UpgradePrompt({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  const createCheckout = useAction(api.subscriptions.createCheckoutSession);
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const { url } = await createCheckout();
      if (url) window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 p-6 text-center",
        className,
      )}
    >
      <p className="mb-4 text-sm text-on-surface-variant">{message}</p>
      <Button
        onClick={handleUpgrade}
        disabled={loading}
        className="bg-gradient-135 text-white"
      >
        {loading ? "Redirecting..." : "Upgrade to Premium"}
      </Button>
      <p className="mt-2 text-xs text-on-surface-variant/60">
        $9.99/month · Cancel anytime
      </p>
    </div>
  );
}
