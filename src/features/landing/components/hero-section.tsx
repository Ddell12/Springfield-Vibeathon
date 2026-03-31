import { AuthHeroContent } from "@/features/auth/components/auth-hero-content";
import { AuthShell } from "@/features/auth/components/auth-shell";

export function HeroSection() {
  return (
    <section className="overflow-hidden pb-10 pt-4 md:pb-16 md:pt-8">
      <AuthShell>
        <AuthHeroContent role="slp" />
      </AuthShell>
    </section>
  );
}
