import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

export default function PatientNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold text-foreground">Patient not found</h1>
      <p className="text-on-surface-variant">
        This patient doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Button asChild>
        <Link href="/patients">Back to Caseload</Link>
      </Button>
    </div>
  );
}
