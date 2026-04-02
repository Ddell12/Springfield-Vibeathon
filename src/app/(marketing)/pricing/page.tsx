import type { Metadata } from "next";

import { PricingPage } from "@/features/landing/components/pricing-page";

export const metadata: Metadata = {
  title: "Pricing — Vocali",
  description: "Simple, transparent pricing for speech therapists and caregivers.",
};

export default function Page() {
  return <PricingPage />;
}
