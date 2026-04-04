"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/core/utils";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { NotificationBell } from "@/features/sessions/components/notification-bell";
import { MaterialIcon } from "@/shared/components/material-icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { CAREGIVER_NAV_ITEMS, isNavActive, NAV_ITEMS } from "@/shared/lib/navigation";

interface AppHeaderProps {
  title?: string;
  className?: string;
}

export function AppHeader({ title, className }: AppHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const user = useCurrentUser();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const role = user?.role;
  const navItems = role === "caregiver" ? CAREGIVER_NAV_ITEMS : NAV_ITEMS;

  return (
    <header className={cn("sticky top-0 z-40 flex h-14 shrink-0 items-center gap-4 border-b border-outline-variant/20 bg-background/80 px-4 backdrop-blur-sm md:hidden", className)}>
      {/* Mobile nav hamburger — md:hidden */}
      {user ? (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open navigation"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              <MaterialIcon icon="menu" size="sm" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>
                Open the primary app navigation for the current user.
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3 pt-14">
              {navItems.map((item) => {
                const active = isNavActive(item.href, pathname);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300",
                      active
                        ? "bg-primary text-white"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    )}
                  >
                    <MaterialIcon icon={item.icon} filled={active} size="sm" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      ) : null}
      {title && (
        <h2 className="text-sm font-semibold text-on-surface font-headline truncate">
          {title}
        </h2>
      )}
      <div className="flex-1" />
      {user ? (
        <>
          <NotificationBell />
          {/* Avatar button visible on mobile only — desktop uses sidebar user menu */}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/sign-in");
            }}
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-sm font-semibold text-primary"
          >
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?"}
          </button>
        </>
      ) : null}
      {user === null ? (
        <Link href="/sign-in" className="text-sm font-semibold text-primary">
          Sign in
        </Link>
      ) : null}
    </header>
  );
}
