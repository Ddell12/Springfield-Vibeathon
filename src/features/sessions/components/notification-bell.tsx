"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

type NotificationType =
  | "session-booked"
  | "session-cancelled"
  | "session-reminder"
  | "session-starting"
  | "notes-ready";

const TYPE_ICONS: Record<NotificationType, string> = {
  "session-booked": "event_available",
  "session-cancelled": "event_busy",
  "session-reminder": "alarm",
  "session-starting": "videocam",
  "notes-ready": "description",
};

function timeAgo(timestamp: number): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMs = timestamp - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  return rtf.format(diffDay, "day");
}

export function NotificationBell() {
  const router = useRouter();
  const notifications = useQuery(api.notifications.list);
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const [open, setOpen] = useState(false);

  const count = notifications?.filter((n) => !n.read).length ?? 0;

  const handleNotificationClick = useCallback(async (id: Id<"notifications">, link?: string) => {
    setOpen(false);
    void markRead({ notificationId: id });
    if (link) router.push(link);
  }, [markRead, router]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
            "text-on-surface-variant hover:bg-surface-container-high active:scale-90"
          )}
        >
          <MaterialIcon
            icon={count > 0 ? "notifications_active" : "notifications"}
            size="md"
          />
          {count > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white",
                "h-4", count > 9 ? "min-w-[1.25rem]" : "w-4"
              )}
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-headline text-sm font-semibold text-foreground">
            Notifications
          </h2>
          <Button
            variant="ghost"
            size="sm"
            disabled={count === 0}
            onClick={() => void markAllRead()}
            className="h-auto px-2 py-1 text-xs text-primary hover:text-primary disabled:opacity-40"
          >
            Mark all read
          </Button>
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto">
          {notifications === undefined ? (
            <div className="flex flex-col gap-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-container" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <MaterialIcon icon="notifications_none" size="lg" className="text-on-surface-variant/40" />
              <p className="font-body text-sm text-on-surface-variant">
                No notifications yet
              </p>
            </div>
          ) : (
            <ul role="list">
              {notifications.map((notification) => {
                const icon = TYPE_ICONS[notification.type as NotificationType] ?? "notifications";
                return (
                  <li key={notification._id}>
                    <button
                      onClick={() =>
                        void handleNotificationClick(notification._id, notification.link)
                      }
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-200",
                        "hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        notification.read
                          ? "opacity-60"
                          : "bg-surface-container/40"
                      )}
                    >
                      {/* Icon */}
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          notification.read
                            ? "bg-surface-container-high"
                            : "bg-primary/10"
                        )}
                      >
                        <MaterialIcon
                          icon={icon}
                          size="sm"
                          className={notification.read ? "text-on-surface-variant" : "text-primary"}
                        />
                      </span>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "font-body text-sm leading-snug",
                              notification.read
                                ? "font-normal text-on-surface-variant"
                                : "font-semibold text-foreground"
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span
                              aria-hidden="true"
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                            />
                          )}
                        </div>
                        <p className="mt-0.5 font-body text-xs text-on-surface-variant line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="mt-1 font-body text-[11px] text-on-surface-variant/60">
                          {timeAgo(notification._creationTime)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
