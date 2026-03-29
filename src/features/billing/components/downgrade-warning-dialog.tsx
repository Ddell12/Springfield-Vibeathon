"use client";

import { useAction } from "convex/react";
import { AlertTriangle } from "lucide-react";
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

const FEATURES_LOST = [
  "Unlimited app creation (back to 5 apps)",
  "Unlimited generations (back to 20/month)",
  "Premium TTS voices",
  "Priority support",
  "Custom publishing",
];

export function DowngradeWarningDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const createPortal = useAction(api.subscriptions.createPortalSession);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const { url } = await createPortal();
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
          <DialogTitle className="font-headline flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel? You will lose access to these
            features at the end of your current billing period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm font-medium text-muted-foreground">
            Features you will lose:
          </p>
          <ul className="space-y-2">
            {FEATURES_LOST.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="size-1.5 rounded-full bg-destructive shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Redirecting..." : "Continue to Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
