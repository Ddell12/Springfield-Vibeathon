"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

// ── Child card (one useQuery per child) ──────────────────────────────────────

interface ChildCardProps {
  patientId: Id<"patients">;
}

function ChildCard({ patientId }: ChildCardProps) {
  const patient = useQuery(api.patients.get, { patientId });

  if (patient === undefined) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="mb-3 h-6 w-32" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (patient === null) {
    // Link exists but patient was deleted — skip silently
    return null;
  }

  return (
    <Card className="transition-shadow duration-300 hover:shadow-md">
      <CardContent className="flex flex-col gap-4 p-6">
        <div>
          <p className="font-headline text-xl font-semibold text-foreground">
            {patient.firstName}
          </p>
          {patient.lastName && (
            <p className="text-sm text-muted-foreground">{patient.lastName}</p>
          )}
        </div>
        <Button asChild className="w-full bg-primary-gradient text-white hover:opacity-90">
          <Link href={`/family/${patientId}`}>View Practice</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Family landing ────────────────────────────────────────────────────────────

export function FamilyLanding() {
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  const links = useQuery(
    api.caregivers.listByCaregiver,
    isAuthenticated ? {} : "skip"
  );

  // Auto-redirect when there's exactly one child
  useEffect(() => {
    if (links && links.length === 1) {
      router.replace(`/family/${links[0].patientId}`);
    }
  }, [links, router]);

  // Loading state
  if (links === undefined) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div>
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    );
  }

  // Empty state
  if (links.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl" role="img" aria-label="family">
          👨‍👩‍👧
        </div>
        <div>
          <p className="font-headline text-xl font-semibold text-foreground">
            No children linked yet
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Ask your child&apos;s therapist for an invite link to get started.
          </p>
        </div>
      </div>
    );
  }

  // Single child — redirect in progress, show spinner
  if (links.length === 1) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Multiple children — show grid
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-headline text-2xl font-bold text-foreground">
          Your children
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a child to view their practice dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <ChildCard key={link._id} patientId={link.patientId} />
        ))}
      </div>
    </div>
  );
}
