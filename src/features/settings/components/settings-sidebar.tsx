"use client";

import Link from "next/link";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

import type { SettingsSection } from "./settings-page";

const SECTIONS: { id: SettingsSection; label: string; icon: string }[] = [
  { id: "profile", label: "Profile", icon: "person" },
  { id: "account", label: "Account", icon: "shield" },
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "billing", label: "Billing", icon: "payments" },
];

export function SettingsSidebar({
  activeSection,
  onSectionChange,
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}) {
  return (
    <aside className="hidden md:flex w-64 flex-shrink-0 flex-col bg-surface-container-low px-4 py-8 h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
      {/* Back to dashboard */}
      <Link
        href="/dashboard"
        className="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-300"
      >
        <MaterialIcon icon="arrow_back" className="text-sm" />
        <span>Back</span>
      </Link>

      <div className="mb-8 px-4">
        <h2 className="font-headline font-medium text-lg text-primary">Settings</h2>
        <p className="text-xs text-on-surface-variant font-medium">Manage your sanctuary</p>
      </div>

      <nav className="space-y-1">
        {SECTIONS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold tracking-wide text-left transition-all duration-200",
                isActive
                  ? "bg-primary-container text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:translate-x-1"
              )}
            >
              <MaterialIcon icon={item.icon} size="sm" filled={isActive} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
