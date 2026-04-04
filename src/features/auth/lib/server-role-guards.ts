import { api } from "@convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";

export async function requireSlpUser() {
  const token = await convexAuthNextjsToken();
  if (!token) redirect("/sign-in");

  const user = await fetchQuery(api.users.currentUser, {}, { token });
  if (!user) redirect("/sign-in");
  if (user.role === "caregiver") redirect("/family");

  return user;
}
