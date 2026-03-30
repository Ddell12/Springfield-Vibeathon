export type AppointmentStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show";

export type MeetingRecordStatus =
  | "processing"
  | "transcribing"
  | "summarizing"
  | "complete"
  | "failed";

export type NotificationType =
  | "session-booked"
  | "session-cancelled"
  | "session-reminder"
  | "session-starting"
  | "notes-ready";

export type ContentType = "flashcard" | "app" | "image";

export type ContentUpdate = {
  type: "content-update";
  contentType: ContentType;
  payload: Record<string, unknown>;
};

export type ContentControl = {
  type: "content-next" | "content-previous" | "content-clear" | "content-reveal";
  revealed?: boolean; // only for "content-reveal"
};

export type Interaction = {
  type: "interaction";
  action: string;
  target: string;
  value?: unknown;
  timestamp: number;
};

export type InteractiveMessage = ContentUpdate | ContentControl | Interaction;

export type TimeSlot = {
  timestamp: number;
  startTime: string;
  dayOfWeek: number;
};
