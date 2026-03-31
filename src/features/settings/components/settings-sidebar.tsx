"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import type { SettingsSection } from "./settings-page";

const SECTIONS: { id: SettingsSection; label: string; icon: string }[] = [
  { id: "profile", label: "Profile", icon: "person" },
  { id: "practice", label: "Practice", icon: "local_hospital" },
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
    <aside className="rounded-3xl bg-surface-container-low p-3">
      <nav className="flex gap-2 overflow-x-auto lg:flex-col">
        {SECTIONS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "flex h-auto items-center justify-start gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold tracking-wide transition-all duration-200 lg:w-full",
                isActive
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              <MaterialIcon icon={item.icon} size="sm" filled={isActive} />
              <span>{item.label}</span>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
