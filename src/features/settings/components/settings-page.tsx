"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import { AccountSection } from "./account-section";
import { AppearanceSection } from "./appearance-section";
import { ProfileSection } from "./profile-section";
import { SettingsSidebar } from "./settings-sidebar";

export type SettingsSection = "profile" | "account" | "appearance";

const SECTION_LABELS: Record<SettingsSection, string> = {
  profile: "Profile",
  account: "Account",
  appearance: "Appearance",
};

export function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>("profile");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on Escape or click outside
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex h-full flex-col bg-surface md:flex-row">
      {/* Mobile header with back + section picker */}
      <div className="flex items-center gap-2 bg-surface-container-low px-4 py-3 md:hidden">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          aria-label="Back to dashboard"
        >
          <MaterialIcon icon="arrow_back" size="xs" />
        </Link>
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-sm font-semibold font-headline"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-haspopup="listbox"
          >
            {SECTION_LABELS[section]}
            <MaterialIcon icon="expand_more" className="text-sm" />
          </Button>
          {mobileMenuOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg bg-surface-container-lowest p-1 shadow-lg" role="listbox">
              {(Object.entries(SECTION_LABELS) as [SettingsSection, string][]).map(
                ([id, label]) => (
                  <button
                    key={id}
                    role="option"
                    aria-selected={section === id}
                    onClick={() => {
                      setSection(id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      section === id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <SettingsSidebar activeSection={section} onSectionChange={setSection} />

      <main className="flex-1 overflow-y-auto bg-surface-container-lowest min-h-screen">
        <div className="max-w-[640px] mx-auto py-16 px-6 md:px-8">
          {section === "profile" && <ProfileSection />}
          {section === "account" && <AccountSection />}
          {section === "appearance" && <AppearanceSection />}
        </div>
      </main>
    </div>
  );
}
