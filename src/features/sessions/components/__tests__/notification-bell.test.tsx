import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createContext, type ReactNode,useContext } from "react";
import { beforeEach,describe, expect, it, vi } from "vitest";

import { NotificationBell } from "../notification-bell";

const mockPush = vi.fn();
const mockMarkRead = vi.fn(() => Promise.resolve());
const mockMarkAllRead = vi.fn(() => Promise.resolve());
const mockNotifications = vi.fn();

vi.mock("@convex/_generated/api", () => ({
  api: {
    notifications: {
      list: "notifications.list",
      markRead: "notifications.markRead",
      markAllRead: "notifications.markAllRead",
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: () => mockNotifications(),
  useMutation: (ref: string) =>
    ref === "notifications.markRead" ? mockMarkRead : mockMarkAllRead,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("@/shared/components/ui/popover", () => {
  const React = require("react");
  const PopoverContext = createContext<
    { open: boolean; onOpenChange: (open: boolean) => void } | undefined
  >(undefined);

  function Popover({
    children,
    open,
    onOpenChange,
  }: {
    children: ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) {
    return (
      <PopoverContext.Provider value={{ open, onOpenChange }}>
        {children}
      </PopoverContext.Provider>
    );
  }

  function PopoverTrigger({ asChild, children }: { asChild?: boolean; children: ReactNode }) {
    const context = useContext(PopoverContext);
    if (!context) return <>{children}</>;

    const child = React.Children.only(children) as React.ReactElement<{
      onClick?: () => void;
    }>;

    if (!asChild) return <button onClick={() => context.onOpenChange(!context.open)}>{children}</button>;

    return React.cloneElement(child, {
      onClick: () => context.onOpenChange(!context.open),
    });
  }

  function PopoverContent({ children }: { children: ReactNode }) {
    const context = useContext(PopoverContext);
    if (!context?.open) return null;
    return <div>{children}</div>;
  }

  return { Popover, PopoverTrigger, PopoverContent };
});

beforeEach(() => {
  mockPush.mockClear();
  mockMarkRead.mockClear();
  mockMarkAllRead.mockClear();
});

describe("NotificationBell", () => {
  beforeEach(() => {
    mockNotifications.mockReturnValue([
      {
        _id: "notif1",
        _creationTime: Date.now(),
        type: "session-booked",
        title: "Session Booked",
        body: "Session with Ace Rivera has been booked",
        link: "/sessions/appt123",
        read: false,
        appointmentId: "appt123",
        userId: "user1",
      },
    ]);
  });

  it("routes to the notification link and marks the item read", async () => {
    const user = userEvent.setup();

    render(<NotificationBell />);
    await user.click(screen.getByRole("button", { name: /notifications/i }));
    await user.click(screen.getByRole("button", { name: /session booked/i }));

    expect(mockMarkRead).toHaveBeenCalledWith({ notificationId: "notif1" });
    expect(mockPush).toHaveBeenCalledWith("/sessions/appt123");
  });

  it("falls back to a known session route when no explicit link is present", async () => {
    mockNotifications.mockReturnValue([
      {
        _id: "notif2",
        _creationTime: Date.now(),
        type: "session-reminder",
        title: "Session Reminder",
        body: "Session with Ace Rivera starts soon",
        read: false,
        appointmentId: "appt123",
        userId: "user1",
      },
    ]);

    const user = userEvent.setup();

    render(<NotificationBell />);
    await user.click(screen.getByRole("button", { name: /notifications/i }));
    await user.click(screen.getByRole("button", { name: /session reminder/i }));

    expect(mockMarkRead).toHaveBeenCalledWith({ notificationId: "notif2" });
    expect(mockPush).toHaveBeenCalledWith("/sessions/appt123/call");
  });
});
