"use client";

import { useState } from "react";

import { PracticeProfileForm } from "@/features/intake/components/practice-profile-form";
import { BillingSection } from "../../billing/components/billing-section";
import { AccountSection } from "./account-section";
import { AppearanceSection } from "./appearance-section";
import { ProfileSection } from "./profile-section";
import { SettingsSidebar } from "./settings-sidebar";

export type SettingsSection = "profile" | "account" | "appearance" | "billing" | "practice";

const SECTION_LABELS: Record<SettingsSection, string> = {
  profile: "Profile",
  account: "Account",
  appearance: "Appearance",
  billing: "Billing",
  practice: "Practice",
};

export function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>("profile");

  return (
    <div className="flex min-h-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Settings</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Manage your profile, practice details, account access, and billing.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-20">
          <SettingsSidebar activeSection={section} onSectionChange={setSection} />
        </div>

        <div className="min-w-0 rounded-3xl bg-surface-container-lowest p-5 sm:p-6">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              {SECTION_LABELS[section]}
            </p>
          </div>
          {section === "profile" ? <ProfileSection /> : null}
          {section === "account" ? <AccountSection /> : null}
          {section === "appearance" ? <AppearanceSection /> : null}
          {section === "billing" ? <BillingSection /> : null}
          {section === "practice" ? <PracticeProfileForm /> : null}
        </div>
      </div>
    </div>
  );
}
