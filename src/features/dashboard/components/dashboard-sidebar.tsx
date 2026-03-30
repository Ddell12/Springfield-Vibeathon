"use client";

import { Show, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { isNavActive, NAV_ITEMS, CAREGIVER_NAV_ITEMS } from "@/shared/lib/navigation";

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
    if (isCaregiver && !pathname.startsWith("/family") && !pathname.startsWith("/settings") && !pathname.startsWith("/speech-coach")) {
      router.replace("/family");
    }
  }, [isCaregiver, pathname, router]);

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-20 md:flex flex-col items-center bg-surface-container py-6">
      {/* Logo */}
      <div className="mb-10">
        <Link
          href={isCaregiver ? "/family" : "/dashboard"}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container text-lg font-bold text-white shadow-sm"
        >
          B
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex flex-1 flex-col items-center gap-6">
        {navItems.map((item) => {
          const isActive = isNavActive(item.href, pathname, tab);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group relative rounded-xl p-3 transition-all duration-300 active:scale-90",
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              <MaterialIcon icon={item.icon} filled={isActive} size="md" />
              <span className="pointer-events-none absolute left-16 rounded-lg bg-primary px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: User menu */}
      <div className="mt-auto flex flex-col items-center gap-6">
        <Show when="signed-in">
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
