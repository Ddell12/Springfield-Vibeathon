"use client";

import { Check } from "lucide-react";

import { useEntitlements } from "@/core/hooks/use-entitlements";
import { cn } from "@/core/utils";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

const FREE_FEATURES = [
  "Up to 5 apps",
  "20 generations per month",
  "Community templates",
  "Basic TTS voices",
];

const PREMIUM_FEATURES = [
  "Unlimited apps",
  "Unlimited generations",
  "All templates",
  "Premium TTS voices",
  "Priority support",
  "Custom publishing",
];

export function PlanComparisonCard() {
  const { isPremium, isLoading } = useEntitlements();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="animate-pulse h-64 rounded-2xl bg-surface-container" />
        <div className="animate-pulse h-64 rounded-2xl bg-surface-container" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card
        className={cn(
          "relative",
          !isPremium && "ring-2 ring-primary",
        )}
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Free</CardTitle>
            {!isPremium && (
              <Badge variant="secondary">Current Plan</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Get started building therapy apps
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold mb-4">
            $0<span className="text-sm font-normal text-muted-foreground">/month</span>
          </p>
          <ul className="space-y-2">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-primary shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "relative",
          isPremium && "ring-2 ring-primary",
        )}
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Premium</CardTitle>
            {isPremium && (
              <Badge variant="default">Current Plan</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Unlock the full power of Vocali
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold mb-4">
            $9.99<span className="text-sm font-normal text-muted-foreground">/month</span>
          </p>
          <ul className="space-y-2">
            {PREMIUM_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-primary shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
