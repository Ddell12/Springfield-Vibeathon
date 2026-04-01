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
        Describe it.
        <br />
        It&apos;s built.
      </h1>
      <p className="mt-5 max-w-md text-xl leading-8 text-on-surface-variant">
        Custom therapy tools for SLPs and families — just tell Vocali what your child needs. Ready in under a minute.
      </p>
      <div className="mt-10 w-full">
        <ClaudeSignInCard role={role} />
      </div>
    </>
  );
}
