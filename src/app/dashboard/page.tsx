import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";

import { api } from "../../../convex/_generated/api";

export default async function DashboardPage() {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/sign-in");
  }

  try {
    const user = await fetchQuery(api.users.currentUser, {}, { token });
    redirect(user?.role === "caregiver" ? "/family" : "/tools/new");
  } catch {
    // fetchQuery failed (e.g. Convex sync in progress after fresh sign-in)
    redirect("/tools/new");
  }
}
