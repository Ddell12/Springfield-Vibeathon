"use client";

import { use } from "react";
import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";
import { CaregiverBooking } from "./caregiver-booking";

interface CaregiverBookingPageProps {
  paramsPromise: Promise<{ slpId: string }>;
}

export function CaregiverBookingPage({ paramsPromise }: CaregiverBookingPageProps) {
  const { slpId } = use(paramsPromise);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-300"
      >
        <MaterialIcon icon="arrow_back" size="sm" />
        Back to sessions
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl bg-surface-container p-6">
        <h1 className="font-headline text-xl font-semibold text-on-surface">
          Book a session
        </h1>
        <p className="font-body text-sm text-on-surface-variant">
          Select an available time slot below.
        </p>
        <CaregiverBooking slpId={slpId} />
      </div>
    </div>
  );
}
