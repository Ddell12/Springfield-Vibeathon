import { requireSlpUser } from "@/features/auth/lib/server-role-guards";

export default async function PatientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSlpUser();
  return <>{children}</>;
}
