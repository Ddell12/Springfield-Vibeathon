import { redirect } from "next/navigation";

type SearchParams = Promise<{ role?: string }>;

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const role = params.role === "caregiver" ? "caregiver" : "slp";
  redirect(`/sign-in?role=${role}`);
}
