import { Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

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

export function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-20 lg:px-10">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-headline text-4xl tracking-tight text-on-surface">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-base leading-7 text-on-surface-variant">
          Start free. Upgrade when you&apos;re ready for more.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start lg:mx-auto lg:max-w-3xl">
        {/* Free plan */}
        <div className="rounded-3xl bg-surface p-8 ring-1 ring-border">
          <h2 className="text-lg font-semibold text-on-surface">Free</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Get started building therapy apps
          </p>
          <p className="mt-6 text-3xl font-bold text-on-surface">
            $0
            <span className="text-sm font-normal text-on-surface-variant">/month</span>
          </p>
          <ul className="mt-6 space-y-3">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm text-on-surface">
                <Check className="size-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
          <Button
            asChild
            variant="outline"
            className="mt-8 w-full rounded-xl"
          >
            <Link href="/sign-in?role=slp">Get started free</Link>
          </Button>
        </div>

        {/* Premium plan */}
        <div className="rounded-3xl bg-surface p-8 ring-2 ring-primary">
          <h2 className="text-lg font-semibold text-on-surface">Premium</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Unlock the full power of Vocali
          </p>
          <p className="mt-6 text-3xl font-bold text-on-surface">
            $9.99
            <span className="text-sm font-normal text-on-surface-variant">/month</span>
          </p>
          <ul className="mt-6 space-y-3">
            {PREMIUM_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm text-on-surface">
                <Check className="size-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
          <Button
            asChild
            variant="gradient"
            className="mt-8 w-full rounded-xl font-semibold"
          >
            <Link href="/sign-in?role=slp">Start free trial</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
