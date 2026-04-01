import type { Metadata } from "next";

import { RoleTabs } from "./_components/role-tabs";

export const metadata: Metadata = {
  title: "Solutions — Bridges",
  description:
    "Bridges adapts to how you work — whether you're a clinician, a parent, or both. See how Bridges fits each role in the therapy room.",
};

export default function SolutionsPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-20 lg:px-10">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-headline text-5xl leading-[1.15] tracking-tight text-on-surface">
          The right tool for every role in the therapy room.
        </h1>
        <p className="mt-6 text-lg leading-7 text-on-surface-variant">
          Bridges adapts to how you work — whether you&apos;re a clinician, a parent, or both.
        </p>
      </div>

      {/* Role tabs */}
      <div className="mt-16">
        <RoleTabs />
      </div>
    </main>
  );
}
