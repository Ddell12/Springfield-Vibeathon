import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await currentUser();
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;

  redirect(role === "caregiver" ? "/family" : "/builder");
}
