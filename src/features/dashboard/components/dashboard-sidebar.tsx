"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

import { ROUTES } from "@/core/routes";
import { cn } from "@/core/utils";
import { NotificationBell } from "@/features/sessions/components/notification-bell";
import { useUnreadNotificationsCount } from "@/features/sessions/hooks/use-unread-notifications-count";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { CAREGIVER_NAV_ITEMS, isNavActive, NAV_ITEMS } from "@/shared/lib/navigation";

import { api } from "../../../../convex/_generated/api";

export function DashboardSidebar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const { signOut } = useAuthActions();
  const router = useRouter();

  const role = user?.role;
  const isCaregiver = role === "caregiver";
  const navItems = isCaregiver ? CAREGIVER_NAV_ITEMS : NAV_ITEMS;

  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("vocali_sidebar_collapsed") === "true",
  );

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("vocali_sidebar_collapsed", String(!prev));
      return !prev;
    });
  };

  const recentTools = useQuery(api.tools.listRecentBySLP, { limit: 5 }) ?? [];
  const { unreadCount } = useUnreadNotificationsCount();

  const initials = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U";

  const planLabel = "Free";

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        "hidden h-screen shrink-0 flex-col overflow-hidden border-r border-outline-variant/40 bg-surface-container transition-[width] duration-300 md:flex",
        collapsed ? "w-14" : "w-44",
      )}
    >
      {/* Collapse toggle + wordmark */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-outline-variant/10 px-3">
        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={toggleCollapsed}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <MaterialIcon icon="menu" size="sm" />
          {collapsed && unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white h-4"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        {!collapsed && (
          <>
            <span className="text-sm font-bold tracking-tight text-on-surface">Vocali</span>
            <div className="ml-auto">
              <NotificationBell align="start" />
            </div>
          </>
        )}
      </div>

      {/* Nav items */}
      <nav aria-label="Primary" className="flex flex-col gap-1 px-2 py-3">
        {navItems.map((item) => {
          const isActive = isNavActive(item.href, pathname);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-2 py-2 transition-all duration-300 active:scale-95",
                collapsed ? "justify-center" : "",
                isActive
                  ? "bg-primary/10 text-on-surface"
                  : "text-on-surface-variant hover:bg-surface-container-high",
              )}
            >
              <MaterialIcon icon={item.icon} filled={isActive} size="sm" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Recents */}
      {!collapsed && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden px-2">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">
            Recents
          </p>
          <div className="flex flex-col gap-0.5 overflow-y-auto">
            {recentTools.length === 0 ? (
              <p className="px-2 text-xs text-on-surface-variant/50">No recent apps</p>
            ) : (
              recentTools.map((tool) => {
                const isActive = pathname === ROUTES.TOOLS_EDIT(tool._id);
                return (
                  <Link
                    key={tool._id}
                    href={ROUTES.TOOLS_EDIT(tool._id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors",
                      isActive && "bg-surface-container-high text-on-surface font-medium",
                    )}
                  >
                    <span className="truncate">{tool.title || "Untitled App"}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* User menu */}
      <div className="mt-auto shrink-0 border-t border-outline-variant/10 p-2">
        {user ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-container-high",
                  collapsed ? "justify-center" : "",
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-xs font-bold text-white">
                  {initials}
                </div>
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-on-surface">
                        {user?.name ?? "User"}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/60">{planLabel} plan</p>
                    </div>
                    <MaterialIcon icon="expand_more" size="xs" className="text-on-surface-variant/40" />
                  </>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-56 p-1">
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-on-surface">
                    {user?.name ?? "User"}
                  </p>
                  <p className="truncate text-xs text-on-surface-variant">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="my-1 border-t border-outline-variant/20" />
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <MaterialIcon icon="settings" size="sm" />
                Settings
              </Link>
              <div className="my-1 border-t border-outline-variant/20" />
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.push("/sign-in");
                }}
                className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <MaterialIcon icon="logout" size="sm" />
                Sign out
              </button>
            </PopoverContent>
          </Popover>
        ) : null}
        {user === null ? (
          <Link
            href="/sign-in"
            className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <MaterialIcon icon="login" size="sm" />
            {!collapsed && <span>Sign in</span>}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
