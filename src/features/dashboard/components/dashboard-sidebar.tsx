"use client";

import { Show,useClerk, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ROUTES } from "@/core/routes";
import { cn } from "@/core/utils";
import { AUTH_SIGN_OUT_URL } from "@/features/auth/lib/auth-content";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { CAREGIVER_NAV_ITEMS, isNavActive, NAV_ITEMS } from "@/shared/lib/navigation";

import { api } from "../../../../convex/_generated/api";

const CAREGIVER_ALLOWED_PREFIXES = [
  "/family",
  "/settings",
  "/speech-coach",
  "/sessions",
  "/tools/new",
  "/flashcards",
  "/my-tools",
  "/templates",
  "/library",
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  const isCaregiver = role === "caregiver";
  const navItems = isCaregiver ? CAREGIVER_NAV_ITEMS : NAV_ITEMS;

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("bridges_sidebar_collapsed") === "true");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("bridges_sidebar_collapsed", String(!prev));
      return !prev;
    });
  };

  const recentSessions = useQuery(api.sessions.listRecent) ?? [];

  useEffect(() => {
    if (isCaregiver && !CAREGIVER_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
      router.replace("/family");
    }
  }, [isCaregiver, pathname, router]);

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "U";

  const planLabel = (user?.publicMetadata as { plan?: string } | undefined)?.plan ?? "Free";

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
          className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          <MaterialIcon icon="menu" size="sm" />
        </button>
        {!collapsed && (
          <span className="text-sm font-bold text-on-surface tracking-tight">Bridges</span>
        )}
      </div>

      {/* New App button */}
      <div className="shrink-0 px-2 py-3">
        <Link
          href="/tools/new"
          aria-label="Create tool"
          className={cn(
            "flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface text-on-surface shadow-sm transition-colors hover:bg-surface-container-high active:scale-95",
            collapsed ? "h-10 w-10 justify-center" : "px-3 py-2",
          )}
        >
          <MaterialIcon icon="add" size="sm" />
          {!collapsed && <span className="text-sm font-semibold">Create tool</span>}
        </Link>
      </div>

      {/* Nav items */}
      <nav aria-label="Primary" className="flex flex-col gap-1 px-2">
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
            {recentSessions.length === 0 ? (
              <p className="px-2 text-xs text-on-surface-variant/50">No recent apps</p>
            ) : (
              recentSessions.map((s) => {
                const isActive = pathname === ROUTES.BUILDER_SESSION(s._id);
                return (
                  <Link
                    key={s._id}
                    href={ROUTES.BUILDER_SESSION(s._id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors",
                      isActive && "bg-surface-container-high text-on-surface font-medium",
                    )}
                  >
                    {s.state === "generating" && (
                      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary" />
                    )}
                    <span className="truncate">{s.title || "Untitled App"}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* User menu */}
      <div className="mt-auto shrink-0 border-t border-outline-variant/10 p-2">
        <Show when="signed-in">
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
                        {user?.firstName} {user?.lastName}
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
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs text-on-surface-variant">
                    {user?.primaryEmailAddress?.emailAddress}
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
                onClick={() => signOut({ redirectUrl: AUTH_SIGN_OUT_URL })}
                className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <MaterialIcon icon="logout" size="sm" />
                Sign out
              </button>
            </PopoverContent>
          </Popover>
        </Show>
        <Show when="signed-out">
          <Link
            href="/sign-in"
            className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <MaterialIcon icon="login" size="sm" />
            {!collapsed && <span>Sign in</span>}
          </Link>
        </Show>
      </div>
    </aside>
  );
}
