"use client";

export function PhaseTimeline({
  phases,
  currentIndex,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  phases: any[];
  currentIndex: number;
}) {
  return (
    <div className="border-t p-2 text-sm text-muted-foreground">
      Phase timeline — coming in Task 12
    </div>
  );
}
