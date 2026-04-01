import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ClinicalBillingDashboard } from "@/features/billing/components/clinical-billing-dashboard";

export const metadata = { title: "Clinical Billing — Vocali" };

export default async function BillingPage() {
  const user = await currentUser();
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  if (role === "caregiver") redirect("/family");
  return <ClinicalBillingDashboard />;
}
