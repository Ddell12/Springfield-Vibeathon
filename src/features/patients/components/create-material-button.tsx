import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import type { Id } from "../../../../convex/_generated/dataModel";

interface CreateMaterialButtonProps {
  patientId: Id<"patients">;
}

export function CreateMaterialButton({ patientId }: CreateMaterialButtonProps) {
  return (
    <Button asChild size="sm">
      <Link href={`/builder?patientId=${patientId}`}>
        <Sparkles className="mr-1.5 h-4 w-4" />
        Create Material
      </Link>
    </Button>
  );
}
