import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";

export function CtaSection() {
  return (
    <section className="px-6 py-16 max-w-7xl mx-auto">
      <div className="bg-primary-gradient rounded-3xl px-10 py-16 text-center flex flex-col items-center gap-6 relative overflow-hidden">
        <div className="flex flex-col items-center gap-6 max-w-2xl">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
            <MaterialIcon icon="auto_awesome" className="text-white text-3xl" />
          </div>
          <h2 className="font-headline text-3xl md:text-[2rem] font-normal text-white leading-tight">
            Ready to bridge the gap?
          </h2>
          <p className="text-white/80 text-lg max-w-lg leading-relaxed">
            Whether you&apos;re a speech therapist building for your caseload or a family supporting your child at home — Bridges is free to start.
          </p>
          <Link
            href="/builder"
            className="bg-white text-primary px-10 py-4 rounded-lg text-lg font-bold hover:bg-white/90 transition-colors duration-300 active:scale-95 inline-flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            Build Your First App
            <MaterialIcon
              icon="arrow_forward"
              size="sm"
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
          <Link
            href="/library?tab=templates"
            className="text-white/80 hover:text-white text-base font-medium underline underline-offset-4 transition-colors duration-300"
          >
            Browse Templates
          </Link>
        </div>
      </div>
    </section>
  );
}
