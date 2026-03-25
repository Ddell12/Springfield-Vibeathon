"use client";

import { Id } from "../../../../convex/_generated/dataModel";

export function CodePanel({ sessionId }: { sessionId: Id<"sessions"> | null }) {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      Code panel — coming in Task 12
    </div>
  );
}
