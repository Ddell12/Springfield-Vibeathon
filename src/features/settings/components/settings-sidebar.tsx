"use client";

import { ArrowLeft, Palette, Shield, User } from "lucide-react";
import Link from "next/link";

import { cn } from "@/core/utils";
import type { SettingsSection } from "./settings-page";

const SECTIONS: { id: SettingsSection; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
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
        className="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Back</span>
      </Link>

      <div className="mb-8 px-4">
        <h2 className="font-headline font-bold text-lg text-primary">Settings</h2>
        <p className="text-xs text-on-surface-variant font-medium">Manage your sanctuary</p>
      </div>

      <nav className="space-y-1">
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold font-headline tracking-wide text-left transition-all duration-200",
                isActive
                  ? "bg-primary-container text-on-primary border-l-4 border-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:translate-x-1"
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
