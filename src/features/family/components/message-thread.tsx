"use client";

interface MessageThreadProps {
  paramsPromise: Promise<{ patientId: string }>;
}

export function MessageThread({ paramsPromise }: MessageThreadProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <p className="text-on-surface-variant">Messages loading...</p>
    </div>
  );
}
