"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { NotificationBell } from "@/features/sessions/components/notification-bell";

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-4 border-b border-outline-variant/20 bg-background/80 px-4 backdrop-blur-sm">
      {title && (
        <h1 className="text-sm font-semibold text-on-surface font-headline truncate">
          {title}
        </h1>
      )}
      <div className="flex-1" />
      <Show when="signed-in">
        <NotificationBell />
        {/* UserButton visible on mobile only — desktop uses sidebar user menu */}
        <div className="md:hidden">
          <UserButton />
        </div>
      </Show>
      <Show when="signed-out">
        <Link href="/sign-in" className="text-sm font-semibold text-primary">
          Sign in
        </Link>
      </Show>
    </header>
  );
}
