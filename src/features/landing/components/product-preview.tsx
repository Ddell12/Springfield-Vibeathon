import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";

export function ProductPreview() {
  return (
    <section className="py-20 max-w-7xl mx-auto px-6">
      <h2 className="sr-only">See What You Can Build</h2>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Large card — Visual Schedules */}
        <div className="lg:col-span-8 bg-surface-container h-[400px] rounded-2xl p-8 relative overflow-hidden flex flex-col justify-end sanctuary-shadow">
          {/* Abstract background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed/30 to-surface-container" />
          <div className="absolute top-8 right-8 flex gap-3 opacity-40">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-xl">
              🛏️
            </div>
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-xl">
              🪥
            </div>
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-xl">
              🥣
            </div>
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-xl">
              🎒
            </div>
          </div>
          <div className="relative z-10">
            <span className="px-3 py-1 bg-primary-container text-on-primary-container rounded-full text-xs font-bold mb-4 inline-block">
              MOST POPULAR
            </span>
            <h3 className="text-3xl font-headline font-extrabold mb-2 text-on-surface">
              Visual Schedules
            </h3>
            <p className="text-on-surface-variant max-w-md">
              Reduce transition anxiety with step-by-step interactive flows
              customized for any routine.
            </p>
          </div>
        </div>

        {/* Small card — Communication Boards */}
        <div className="lg:col-span-4 bg-tertiary-fixed text-on-tertiary-fixed rounded-2xl p-8 flex flex-col justify-between">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <MaterialIcon icon="grid_view" />
          </div>
          <div>
            <h3 className="text-2xl font-headline font-extrabold mb-2">
              Communication Boards
            </h3>
            <p className="opacity-80">
              Give every child a voice with instant PECS-style boards based on
              their specific environment.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-primary font-headline font-bold text-lg hover:underline transition-colors"
        >
          See them in action →
        </Link>
      </div>
    </section>
  );
}
