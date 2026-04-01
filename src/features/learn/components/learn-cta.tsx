import Link from "next/link";

export function LearnCta() {
  return (
    <section className="bg-surface px-6 py-20">
      <div className="mx-auto max-w-[720px] text-center">
        <h2 className="font-headline font-normal text-4xl md:text-[2.5rem] leading-[1.2] tracking-[-0.02em] text-on-surface mb-5">
          Ready to build something?
        </h2>
        <p className="text-on-surface-variant text-lg leading-relaxed mb-10 max-w-[500px] mx-auto">
          Vocali is free to start. Describe a therapy tool and have it running
          in your browser in under a minute.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-in?role=slp"
            className="bg-primary-gradient text-on-primary px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all duration-300 active:scale-95"
          >
            Start Building — It&apos;s Free
          </Link>
          <Link
            href="/sign-in?role=caregiver"
            className="px-8 py-4 rounded-xl font-semibold text-lg text-on-surface-variant bg-canvas hover:bg-surface-container-low border border-border transition-all duration-300"
          >
            I&apos;m a Caregiver
          </Link>
        </div>
      </div>
    </section>
  );
}
