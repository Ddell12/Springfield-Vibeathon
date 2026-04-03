import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";

import { api } from "../../../../convex/_generated/api";

export default async function DashboardPage() {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/sign-in");
  }

  const user = await fetchQuery(api.users.currentUser, {}, { token });
  const role = user?.role;

  redirect(role === "caregiver" ? "/family" : "/builder");
}
