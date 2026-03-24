"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

const navItems = [
  { href: "/builder", label: "Builder", icon: "construction" },
  { href: "/builder/assets", label: "Assets", icon: "category" },
  { href: "/builder/library", label: "Library", icon: "folder_open" },
  { href: "/builder/settings", label: "Settings", icon: "settings" },
];

export function BuilderSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-surface h-full">
      {/* Top: Core Builder label */}
      <div className="p-4">
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
            <MaterialIcon icon="construction" filled />
          </div>
          <div>
            <p className="font-headline font-bold text-sm">Core Builder</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
              v1.0.4
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="space-y-1">
          {navItems.map(({ href, label, icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium",
                  isActive
                    ? "bg-primary/5 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                <MaterialIcon icon={icon} filled={isActive} size="md" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Help + Deploy */}
      <div className="mt-auto p-4 space-y-4">
        <Link
          href="/builder/help"
          className="flex items-center gap-3 text-on-surface-variant px-3 py-2.5 hover:bg-surface-container-high rounded-lg transition-all text-sm font-medium"
        >
          <MaterialIcon icon="help" />
          <span>Help</span>
        </Link>
        <button className="w-full bg-primary-gradient text-white py-3 rounded-xl font-bold text-sm sanctuary-shadow active:scale-[0.98] transition-all">
          Deploy Tool
        </button>
      </div>
    </aside>
  );
}
