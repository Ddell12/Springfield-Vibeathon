"use client";

interface FamilyMessagesCardProps {
  patientId: string;
  unreadCount: number;
}

export function FamilyMessagesCard({ unreadCount }: FamilyMessagesCardProps) {
  if (unreadCount === 0) return null;
  return (
    <div className="rounded-lg bg-background border p-4">
      <p className="text-sm">{unreadCount} unread message{unreadCount !== 1 ? "s" : ""}</p>
    </div>
  );
}
