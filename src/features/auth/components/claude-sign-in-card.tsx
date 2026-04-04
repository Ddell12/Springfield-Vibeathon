"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AUTH_REDIRECT_URL, mapAuthError, type AuthRole, ROLE_COPY } from "@/features/auth/lib/auth-content";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Flow = "signIn" | "signUp";


export function ClaudeSignInCard({ role }: { role: AuthRole }) {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [flow, setFlow] = useState<Flow>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsBusy(true);

    try {
      await signIn("password", {
        email,
        password,
        flow,
        ...(flow === "signUp" && name.trim() ? { name: name.trim() } : {}),
      });
      router.push(AUTH_REDIRECT_URL);
    } catch (err) {
      const message =
        err instanceof Error ? mapAuthError(err.message) : "Something went wrong. Please try again.";
      setFormError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoogle = async () => {
    setFormError(null);
    try {
      await signIn("google");
    } catch (err) {
      setFormError(err instanceof Error ? mapAuthError(err.message) : "Google sign-in isn't available right now.");
    }
  };

  const handleApple = async () => {
    setFormError(null);
    try {
      await signIn("apple");
    } catch (err) {
      setFormError(err instanceof Error ? mapAuthError(err.message) : "Apple sign-in isn't available right now.");
    }
  };

  return (
    <div className="w-full max-w-[360px] rounded-xl bg-surface px-5 py-5 shadow-[0_18px_55px_rgba(26,25,23,0.1)] ring-1 ring-border/70">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* OAuth buttons */}
        <button
          type="button"
          onClick={handleGoogle}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-on-surface transition-colors duration-300 hover:bg-surface-container-low"
        >
          <span aria-hidden="true" className="text-base">G</span>
          Continue with Google
        </button>

        <button
          type="button"
          onClick={handleApple}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-on-surface transition-colors duration-300 hover:bg-surface-container-low"
        >
          <span aria-hidden="true" className="text-base">🍎</span>
          Sign in with Apple
        </button>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Email + password fields */}
        {flow === "signUp" && (
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name (optional)"
            autoComplete="name"
            className="h-12 rounded-xl border border-border bg-background"
          />
        )}

        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          autoComplete="email"
          required
          className="h-12 rounded-xl border border-border bg-background"
        />

        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          required
          className="h-12 rounded-xl border border-border bg-background"
        />

        {formError ? (
          <p className="rounded-lg bg-error-container px-4 py-3 text-sm text-error">
            {formError}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="gradient"
          disabled={!email || !password || isBusy}
          className="w-full rounded-xl text-sm font-semibold"
        >
          {flow === "signIn" ? "Sign in" : "Create account"}
        </Button>

        {/* Toggle signIn / signUp — only for SLPs (caregivers must use invite) */}
        {role === "slp" && (
          <p className="text-center text-sm text-on-surface-variant">
            {flow === "signIn" ? (
              <>
                No account?{" "}
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => { setFlow("signUp"); setFormError(null); }}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => { setFlow("signIn"); setFormError(null); }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        )}

        {flow === "signIn" && (
          <p className="text-center text-sm text-on-surface-variant">
            <Link href="/forgot-password" className="underline underline-offset-4">
              Forgot password?
            </Link>
          </p>
        )}

        <p className="px-2 text-center text-[12px] leading-5 text-on-surface-variant">
          {ROLE_COPY[role].helper}
        </p>
      </form>

      <p className="mt-4 text-center text-[12px] leading-5 text-on-surface-variant">
        By continuing, you acknowledge Vocali&apos;s{" "}
        <Link href="/" className="underline underline-offset-4">
          Privacy Policy
        </Link>{" "}
        and agree to receive occasional product updates.
      </p>
    </div>
  );
}
