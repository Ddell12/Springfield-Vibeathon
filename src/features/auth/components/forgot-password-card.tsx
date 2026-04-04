"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { mapAuthError } from "@/features/auth/lib/auth-content";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Step = "request" | "verify";

export function ForgotPasswordCard() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsBusy(true);
    try {
      await signIn("password", { email, flow: "reset" });
      setStep("verify");
    } catch (err) {
      setFormError(err instanceof Error ? mapAuthError(err.message) : "Could not send reset email.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsBusy(true);
    try {
      await signIn("password", { email, code, newPassword, flow: "reset-verification" });
      router.push("/sign-in");
    } catch (err) {
      setFormError(err instanceof Error ? mapAuthError(err.message) : "Could not reset password.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="w-full max-w-[360px] rounded-xl bg-surface px-5 py-5 shadow-[0_18px_55px_rgba(26,25,23,0.1)] ring-1 ring-border/70">
      {step === "request" ? (
        <form onSubmit={handleRequest} className="space-y-3">
          <h2 className="text-lg font-semibold text-on-surface">Reset your password</h2>
          <p className="text-sm text-on-surface-variant">
            Enter your email and, if we find an account, we&apos;ll send a reset code.
          </p>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="h-12 rounded-xl border border-border bg-background"
          />
          {formError && (
            <p className="rounded-lg bg-error-container px-4 py-3 text-sm text-error">{formError}</p>
          )}
          <Button type="submit" variant="gradient" disabled={!email || isBusy} className="w-full rounded-xl text-sm font-semibold">
            Send reset code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <h2 className="text-lg font-semibold text-on-surface">Enter reset code</h2>
          <p className="text-sm text-on-surface-variant">
            We sent a code to {email}.
          </p>
          <Input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Reset code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className="h-12 rounded-xl border border-border bg-background"
          />
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            required
            className="h-12 rounded-xl border border-border bg-background"
          />
          {formError && (
            <p className="rounded-lg bg-error-container px-4 py-3 text-sm text-error">{formError}</p>
          )}
          <Button type="submit" variant="gradient" disabled={!code || !newPassword || isBusy} className="w-full rounded-xl text-sm font-semibold">
            Reset password
          </Button>
        </form>
      )}
    </div>
  );
}
