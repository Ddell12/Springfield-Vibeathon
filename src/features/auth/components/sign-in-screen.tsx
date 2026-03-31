import { AuthHeroContent } from "@/features/auth/components/auth-hero-content";
import { AuthShell } from "@/features/auth/components/auth-shell";
import type { AuthRole } from "@/features/auth/lib/auth-content";
import { MarketingHeader } from "@/shared/components/marketing-header";

export function SignInScreen({
  role,
}: {
  role: AuthRole;
}) {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main className="pb-10 pt-2">
        <AuthShell>
          <AuthHeroContent role={role} />
        </AuthShell>
      </main>
    </div>
  );
}
