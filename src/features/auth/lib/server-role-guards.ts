import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function requireSlpUser() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;

  if (role === "caregiver") {
    redirect("/family");
  }

  return user;
}
