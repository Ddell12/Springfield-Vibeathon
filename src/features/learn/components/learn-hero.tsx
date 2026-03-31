import Link from "next/link";

export function LearnHero() {
  return (
    <section className="bg-canvas px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[720px] text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-on-surface-variant mb-6">
          Speech &amp; Language Pathology
        </p>
        <h1 className="font-headline font-normal text-5xl md:text-[3.5rem] leading-[1.1] tracking-[-0.02em] text-on-surface mb-6">
          The science behind every session
        </h1>
        <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed mb-10 max-w-[560px] mx-auto">
          Speech therapy changes lives — but the day-to-day work is hard. Learn
          how evidence-based approaches work, and how Bridges helps SLPs do more
          of what matters.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-in?role=slp"
            className="bg-primary-gradient text-on-primary px-7 py-3.5 rounded-xl font-semibold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all duration-300 active:scale-95"
          >
            Try Bridges Free
          </Link>
          <Link
            href="/explore"
            className="px-7 py-3.5 rounded-xl font-semibold text-on-surface-variant bg-surface hover:bg-surface-container-low border border-border transition-all duration-300"
          >
            See Example Apps
          </Link>
        </div>
      </div>
    </section>
  );
}
