import { requireSlpUser } from "@/features/auth/lib/server-role-guards";
import { ClinicalBillingDashboard } from "@/features/billing/components/clinical-billing-dashboard";

export const metadata = { title: "Clinical Billing — Vocali" };

export default async function BillingPage() {
  await requireSlpUser();
  return <ClinicalBillingDashboard />;
}
