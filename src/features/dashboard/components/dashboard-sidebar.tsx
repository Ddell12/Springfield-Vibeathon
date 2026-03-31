"use client";

import { Show, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { CAREGIVER_NAV_ITEMS,isNavActive, NAV_ITEMS } from "@/shared/lib/navigation";
import { NotificationBell } from "@/features/sessions/components/notification-bell";

export function DashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { user } = useUser();
  const router = useRouter();

  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  const isCaregiver = role === "caregiver";
  const navItems = isCaregiver ? CAREGIVER_NAV_ITEMS : NAV_ITEMS;

  // Redirect caregivers away from SLP-only routes
  useEffect(() => {
    if (isCaregiver && !pathname.startsWith("/family") && !pathname.startsWith("/settings") && !pathname.startsWith("/speech-coach") && !pathname.startsWith("/sessions")) {
      router.replace("/family");
    }
  }, [isCaregiver, pathname, router]);

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-20 md:flex flex-col items-center bg-surface-container py-6 overflow-hidden">
      {/* Logo */}
      <div className="mb-10 shrink-0">
        <Link
          href={isCaregiver ? "/family" : "/dashboard"}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container text-lg font-bold text-white shadow-sm"
        >
          B
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="sidebar-nav-scroll flex flex-col items-center gap-4">
        {navItems.map((item) => {
          const isActive = isNavActive(item.href, pathname, tab);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-all duration-300 active:scale-90",
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              <MaterialIcon icon={item.icon} filled={isActive} size="md" />
              <span className="text-[10px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: User menu */}
      <div className="hidden md:flex shrink-0 flex-col items-center gap-4 pt-4">
        <Show when="signed-in">
          <NotificationBell />
          <UserButton />
        </Show>
        <Show when="signed-out">
          <Link
            href="/sign-in"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container text-white shadow-sm transition-all hover:shadow-md active:scale-90"
          >
            <MaterialIcon icon="login" size="md" />
          </Link>
        </Show>
      </div>
    </aside>
  );
}
