"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SsoCallbackPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  useEffect(() => {
    // OAuth providers redirect here after authentication.
    // Convex Auth handles the token exchange via the provider config.
    // Redirect to the app after a brief moment.
    const timeout = setTimeout(() => {
      router.push("/builder");
    }, 1000);
    return () => clearTimeout(timeout);
  }, [router, signIn]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-on-surface-variant text-sm">Signing you in…</p>
    </div>
  );
}
