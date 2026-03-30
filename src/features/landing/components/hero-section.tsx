import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden max-w-7xl mx-auto px-6 py-20 md:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column */}
        <div className="lg:col-span-6 space-y-8">
          <div className="inline-flex items-center gap-2 bg-tertiary-fixed text-on-tertiary-fixed px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
            <MaterialIcon icon="auto_awesome" size="sm" />
            AI-Powered Support
          </div>

          <h1 className="font-headline text-4xl md:text-5xl font-normal text-on-surface leading-tight tracking-tight">
            Build therapy apps for your child —{" "}
            <span className="text-primary">just describe what you need</span>
          </h1>

          <p className="text-lg text-on-surface-variant mt-6 max-w-lg leading-relaxed">
            AI-powered therapy tools for speech therapists and families. Bridges turns your words into interactive apps — no technical skills required.
          </p>

          <div className="flex flex-wrap gap-4 mt-8">
            <Link
              href="/builder"
              className="bg-primary-gradient text-white px-8 py-3.5 rounded-lg text-lg font-semibold inline-flex items-center gap-2 transition-all duration-300 active:scale-95 group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]"
            >
              Start Building — It&apos;s Free
              <MaterialIcon
                icon="arrow_forward"
                size="sm"
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/templates"
              className="bg-surface-container-low text-on-surface px-8 py-3.5 rounded-lg text-lg font-semibold hover:bg-surface-container-high transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              View Templates
            </Link>
          </div>
        </div>

        {/* Right Column — Decorative Preview */}
        <div className="lg:col-span-6 relative overflow-hidden">
          <div className="absolute -z-10 w-[120%] h-[120%] bg-surface-container-low rounded-[3rem] -top-[10%] -right-[10%] rotate-3" />
          <div className="bg-surface-container-lowest rounded-3xl p-8 relative overflow-hidden aspect-[4/3] sanctuary-shadow">
            {/* Mock tool preview illustration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed/20 to-secondary-fixed/10" />
            <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4">
              <div className="flex gap-3">
                <div className="w-14 h-14 bg-primary-fixed rounded-xl flex items-center justify-center">
                  <MaterialIcon icon="calendar_today" className="text-primary" />
                </div>
                <div className="w-14 h-14 bg-surface-container rounded-xl flex items-center justify-center">
                  <MaterialIcon icon="grid_view" className="text-on-surface-variant" />
                </div>
                <div className="w-14 h-14 bg-tertiary-fixed rounded-xl flex items-center justify-center">
                  <MaterialIcon icon="star" className="text-tertiary" />
                </div>
              </div>
              <p className="font-body font-medium text-on-surface-variant text-sm">
                Schedules, Boards &amp; Rewards
              </p>
            </div>

            {/* Glass overlay card */}
            <div className="absolute bottom-6 -left-4 bg-white/80 backdrop-blur-xl p-5 rounded-xl sanctuary-shadow max-w-[260px] border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <MaterialIcon icon="chat_bubble" className="text-primary" size="sm" />
                </div>
                <span className="font-semibold text-sm text-on-surface">
                  AI Assistant
                </span>
              </div>
              <p className="text-xs text-on-surface-variant italic leading-normal">
                &quot;Create a bedtime routine with 5 steps using calm blue colors
                and friendly icons.&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
