import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";

export function HowItWorks() {
  return (
    <section className="py-20 bg-surface-container-lowest">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="font-headline text-3xl md:text-[2rem] text-center text-on-surface mb-12">
          From a description to a working therapy app — in under a minute.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* SLP Column */}
          <div className="rounded-2xl bg-primary/5 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <MaterialIcon icon="medical_services" className="text-primary" />
              </div>
              <h3 className="font-body text-xl font-medium text-on-surface">For Speech Therapists</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MaterialIcon icon="check_circle" size="sm" className="text-primary mt-0.5" filled />
                <span className="text-on-surface-variant">Build custom therapy apps in minutes</span>
              </li>
              <li className="flex items-start gap-3">
                <MaterialIcon icon="check_circle" size="sm" className="text-primary mt-0.5" filled />
                <span className="text-on-surface-variant">Manage patient caseloads and goals</span>
              </li>
              <li className="flex items-start gap-3">
                <MaterialIcon icon="check_circle" size="sm" className="text-primary mt-0.5" filled />
                <span className="text-on-surface-variant">Track progress with session notes</span>
              </li>
              <li className="flex items-start gap-3">
                <MaterialIcon icon="check_circle" size="sm" className="text-primary mt-0.5" filled />
                <span className="text-on-surface-variant">Share apps directly with families</span>
              </li>
            </ul>
            <Link
              href="/sign-up"
              className="mt-6 inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Get Started as SLP
              <MaterialIcon icon="arrow_forward" size="sm" />
            </Link>
          </div>

          {/* Family Column */}
          <div className="rounded-2xl bg-tertiary-fixed/30 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary/10">
                <MaterialIcon icon="family_restroom" className="text-tertiary" />
              </div>
              <h3 className="font-body text-xl font-medium text-on-surface">For Families</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MaterialIcon icon="check_circle" size="sm" className="text-tertiary mt-0.5" filled />
                <span className="text-on-surface-variant">Describe what your child needs in plain language</span>
              </li>
              <li className="flex items-start gap-3">
                <MaterialIcon icon="check_circle" size="sm" className="text-tertiary mt-0.5" filled />
                <span className="text-on-surface-variant">Access speech coach anytime, anywhere</span>
              </li>
              <li className="flex items-start gap-3">
                <MaterialIcon icon="check_circle" size="sm" className="text-tertiary mt-0.5" filled />
                <span className="text-on-surface-variant">Play therapy apps together at home</span>
              </li>
              <li className="flex items-start gap-3">
                <MaterialIcon icon="check_circle" size="sm" className="text-tertiary mt-0.5" filled />
                <span className="text-on-surface-variant">Track your child&apos;s progress over time</span>
              </li>
            </ul>
            <Link
              href="/sign-up"
              className="mt-6 inline-flex items-center gap-2 bg-tertiary text-on-tertiary px-6 py-3 rounded-lg font-semibold hover:bg-tertiary/90 transition-colors"
            >
              Get Started as Family
              <MaterialIcon icon="arrow_forward" size="sm" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
