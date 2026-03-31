import { SignInScreen } from "@/features/auth/components/sign-in-screen";
import { getAuthRole } from "@/features/auth/lib/auth-content";

type SearchParams = Promise<{ role?: string }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  return <SignInScreen role={getAuthRole(params.role)} />;
}
