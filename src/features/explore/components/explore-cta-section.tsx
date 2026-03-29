import Link from "next/link";

export function ExploreCtaSection() {
  return (
    <section className="text-center py-20 px-6">
      <h2 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface mb-4">
        These are just examples
      </h2>
      <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-8">
        Describe what YOU need and we&apos;ll build a custom therapy tool —
        tailored to your client, your goals, your workflow.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/builder"
          className="bg-primary-gradient text-on-primary px-8 py-4 rounded-lg font-semibold text-lg shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all duration-300 active:scale-95"
        >
          Start Building — It&apos;s Free
        </Link>
        <Link
          href="/templates"
          className="px-8 py-4 rounded-lg font-semibold text-lg text-on-surface-variant bg-surface-container hover:bg-surface-container-low transition-all duration-300"
        >
          Browse Templates
        </Link>
      </div>
    </section>
  );
}
