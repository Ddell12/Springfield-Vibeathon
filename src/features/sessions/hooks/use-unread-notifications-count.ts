"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";

export function useUnreadNotificationsCount() {
  const notifications = useQuery(api.notifications.list);

  return {
    notifications,
    unreadCount: notifications?.filter((notification) => !notification.read).length ?? 0,
  };
}
