"use client";

import { useAction } from "convex/react";
import { Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";

import { api } from "../../../../convex/_generated/api";

const PREMIUM_BENEFITS = [
  "Unlimited app creation",
  "Unlimited generations per month",
  "Premium TTS voices",
  "Priority support",
  "Custom publishing to your domain",
];

export function UpgradeConfirmationDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const createCheckout = useAction(api.subscriptions.createCheckoutSession);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const { url } = await createCheckout();
      if (url) window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            Get the most out of Bridges with unlimited access to all features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="font-headline text-2xl font-bold">
            $9.99<span className="text-sm font-normal text-muted-foreground">/month</span>
          </p>
          <ul className="space-y-2">
            {PREMIUM_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-primary shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-gradient-135 text-white"
          >
            {loading ? "Redirecting..." : "Confirm Upgrade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
