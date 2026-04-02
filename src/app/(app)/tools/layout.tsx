import { requireSlpUser } from "@/features/auth/lib/server-role-guards";

export default async function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSlpUser();
  return <>{children}</>;
}
