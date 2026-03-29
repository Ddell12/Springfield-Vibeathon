"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { useInviteInfo, useAcceptInvite } from "../hooks/use-invite";
import { toast } from "sonner";

interface InviteLandingProps {
  paramsPromise: Promise<{ token: string }>;
}

export function InviteLanding({ paramsPromise }: InviteLandingProps) {
  const { token } = use(paramsPromise);
  const inviteInfo = useInviteInfo(token);
  const acceptInvite = useAcceptInvite();
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const acceptAttemptedRef = useRef(false);

  // Auto-accept if user is already signed in (came back from sign-up)
  useEffect(() => {
    if (isLoaded && isSignedIn && inviteInfo && !isAccepting && !acceptAttemptedRef.current) {
      acceptAttemptedRef.current = true;
      setIsAccepting(true);
      acceptInvite({ token })
        .then(() => {
          toast.success("You're connected!");
          router.push("/dashboard");
        })
        .catch((err) => {
          console.error("[invite] Failed to accept:", err);
          toast.error("Failed to accept invite. Please try again.");
          setIsAccepting(false);
        });
    }
  }, [isLoaded, isSignedIn, inviteInfo, token, acceptInvite, router, isAccepting]);

  // Loading state
  if (inviteInfo === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  // Invalid/expired token
  if (inviteInfo === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <MaterialIcon icon="error" size="lg" className="text-destructive" />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            Invite not found
          </h1>
          <p className="text-sm text-on-surface-variant">
            This invite is no longer valid. Ask your therapist to send a new one.
          </p>
        </div>
      </div>
    );
  }

  // Accepting state (signed-in user)
  if (isAccepting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-on-surface-variant">Connecting you...</p>
      </div>
    );
  }

  // Main invite card (not signed in)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-sm rounded-2xl bg-surface-container p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container">
          <span className="text-2xl font-bold text-white">B</span>
        </div>

        <h1 className="mb-2 text-xl font-semibold text-foreground">
          You&apos;re invited
        </h1>
        <p className="mb-6 text-sm text-on-surface-variant">
          You&apos;ve been invited to connect with{" "}
          <span className="font-medium text-foreground">
            {inviteInfo.patientFirstName}&apos;s
          </span>{" "}
          speech therapy on Bridges.
        </p>

        <div className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href={`/sign-up?redirect_url=/invite/${token}`}>
              Accept &amp; Sign Up
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Learn More</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
