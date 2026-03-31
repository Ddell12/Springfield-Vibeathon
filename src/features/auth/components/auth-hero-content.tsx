import { ClaudeSignInCard } from "@/features/auth/components/claude-sign-in-card";
import { RoleSwitch } from "@/features/auth/components/role-switch";
import type { AuthRole } from "@/features/auth/lib/auth-content";

export function AuthHeroContent({
  role,
}: {
  role: AuthRole;
}) {
  return (
    <>
      <RoleSwitch role={role} className="mb-10" />
      <h1 className="max-w-[8ch] font-headline text-6xl leading-[0.96] tracking-[-0.04em] text-on-surface sm:text-7xl">
        Overwhelmed?
        <br />
        Organized.
      </h1>
      <p className="mt-5 max-w-md text-xl leading-8 text-on-surface-variant">
        The AI for therapy teams, caregivers, and the everyday work between sessions.
      </p>
      <div className="mt-10 w-full">
        <ClaudeSignInCard role={role} />
      </div>
    </>
  );
}
