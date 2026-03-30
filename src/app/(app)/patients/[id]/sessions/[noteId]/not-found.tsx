import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

export default function SessionNoteNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold">Session note not found</h2>
      <p className="text-sm text-muted-foreground">
        This session note doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Button asChild variant="outline">
        <Link href="/patients">Back to Caseload</Link>
      </Button>
    </div>
  );
}
