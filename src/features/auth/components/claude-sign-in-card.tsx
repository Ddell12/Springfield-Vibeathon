"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { cn } from "@/core/utils";
import { AUTH_REDIRECT_URL, type AuthRole,ROLE_COPY } from "@/features/auth/lib/auth-content";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Step = "collect" | "verify" | "requirements";

function getClerkErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray((error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors) &&
    (error as { errors: Array<{ longMessage?: string; message?: string }> }).errors.length > 0
  ) {
    const first = (error as { errors: Array<{ longMessage?: string; message?: string }> }).errors[0];
    return first.longMessage ?? first.message ?? fallback;
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

export function ClaudeSignInCard({
  role,
}: {
  role: AuthRole;
}) {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<Step>("collect");
  const [emailAddress, setEmailAddress] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const missingFields = useMemo(
    () => (signUp?.status === "missing_requirements" ? signUp.missingFields : []),
    [signUp]
  );

  const isBusy = fetchStatus === "fetching";

  const navigateAfterAuth = ({
    decorateUrl,
  }: {
    decorateUrl: (url: string) => string;
  }) => {
    const url = decorateUrl(AUTH_REDIRECT_URL);
    if (url.startsWith("http")) {
      window.location.href = url;
      return;
    }
    router.push(url);
  };

  const finalizeSignIn = async () => {
    if (!signIn) return;

    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        navigateAfterAuth({ decorateUrl });
      },
    });
  };

  const finalizeSignUp = async () => {
    if (!signUp) return;

    await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        navigateAfterAuth({ decorateUrl });
      },
    });
  };

  const resetFlow = () => {
    signIn?.reset();
    setStep("collect");
    setCode("");
    setShowCodeEntry(false);
    setStatusMessage(null);
    setFormError(null);
  };

  const sendEmailCode = async () => {
    if (!signIn) return;

    const { error } = await signIn.emailCode.sendCode();
    if (error) {
      setFormError(getClerkErrorMessage(error, "We couldn't send a verification code."));
      return;
    }

    setStatusMessage(`We sent a verification code to ${emailAddress}.`);
    setStep("verify");
    setShowCodeEntry(false);
  };

  const handleContinue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signIn) return;

    setFormError(null);
    setStatusMessage(null);

    const { error } = await signIn.create(
      role === "slp"
        ? {
            identifier: emailAddress,
            signUpIfMissing: true,
          }
        : {
            identifier: emailAddress,
          }
    );

    if (error) {
      setFormError(getClerkErrorMessage(error, "We couldn't start that sign-in."));
      return;
    }

    await sendEmailCode();
  };

  const handleTransfer = async () => {
    if (!signUp) return;

    const { error } = await signUp.create({ transfer: true });
    if (error) {
      setFormError(getClerkErrorMessage(error, "We couldn't create your account yet."));
      return;
    }

    if (signUp.status === "complete") {
      await finalizeSignUp();
      return;
    }

    if (signUp.status === "missing_requirements") {
      setStep("requirements");
      return;
    }

    setFormError("Your account needs one more step before it can open.");
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signIn) return;

    setFormError(null);

    const { error } = await signIn.emailCode.verifyCode({ code });
    if (error) {
      if (isClerkAPIResponseError(error)) {
        const firstCode = error.errors[0]?.code;
        if (firstCode === "sign_up_if_missing_transfer" && role === "slp") {
          await handleTransfer();
          return;
        }

        if (role === "caregiver" && firstCode === "form_identifier_not_found") {
          setFormError(
            "No caregiver access was found for that email. Use the invited email or ask your therapist to resend the invite."
          );
          return;
        }
      }

      setFormError(getClerkErrorMessage(error, "That verification code didn't work."));
      return;
    }

    if (signIn.status === "complete" || signIn.status === "needs_client_trust") {
      await finalizeSignIn();
      return;
    }

    setFormError("Your sign-in isn't complete yet. Try the code again.");
  };

  const handleRequirements = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signUp) return;

    setFormError(null);

    const payload: {
      firstName?: string;
      lastName?: string;
      legalAccepted?: boolean;
    } = {};

    if (missingFields.includes("first_name")) payload.firstName = firstName.trim();
    if (missingFields.includes("last_name")) payload.lastName = lastName.trim();
    if (missingFields.includes("legal_accepted")) payload.legalAccepted = legalAccepted;

    const { error } = await signUp.update(payload);
    if (error) {
      setFormError(getClerkErrorMessage(error, "We couldn't finish your account setup."));
      return;
    }

    if (signUp.status === "complete") {
      await finalizeSignUp();
      return;
    }

    setFormError("A few required details are still missing.");
  };

  const handleGoogle = async () => {
    if (!signIn) return;

    setFormError(null);

    const redirectCallbackUrl = `${window.location.origin}/sso-callback`;
    const { error } = await signIn.sso({
      strategy: "oauth_google",
      redirectCallbackUrl,
      redirectUrl: AUTH_REDIRECT_URL,
    });

    if (error) {
      setFormError(getClerkErrorMessage(error, "Google sign-in isn't available right now."));
    }
  };

  if (step === "requirements") {
    return (
      <div className="w-full max-w-[360px] rounded-[2rem] bg-surface px-6 py-6 shadow-[0_18px_55px_rgba(26,25,23,0.1)] ring-1 ring-border/70">
        <h2 className="text-lg font-semibold text-on-surface">Complete your account</h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          Your email is verified. We just need the last few details before opening your workspace.
        </p>

        <form className="mt-5 space-y-3" onSubmit={handleRequirements}>
          {missingFields.some((field) => field === "first_name") && (
            <Input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="First name"
            />
          )}
          {missingFields.some((field) => field === "last_name") && (
            <Input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Last name"
            />
          )}
          {missingFields.includes("legal_accepted") && (
            <label className="flex items-start gap-3 rounded-2xl bg-background px-4 py-3 text-sm leading-6 text-on-surface">
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(event) => setLegalAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary"
              />
              <span>I agree to the Terms of Service and Privacy Policy.</span>
            </label>
          )}

          {formError ? (
            <p className="rounded-2xl bg-error-container px-4 py-3 text-sm text-error">
              {formError}
            </p>
          ) : null}

          <Button type="submit" variant="gradient" className="w-full rounded-xl text-sm font-semibold">
            Finish account setup
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[360px] rounded-[2rem] bg-surface px-5 py-5 shadow-[0_18px_55px_rgba(26,25,23,0.1)] ring-1 ring-border/70">
      {step === "collect" ? (
        <form onSubmit={handleContinue} className="space-y-3">
          <button
            type="button"
            onClick={handleGoogle}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-on-surface transition-colors duration-300 hover:bg-surface-container-low"
          >
            <span aria-hidden="true" className="text-base">
              G
            </span>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Input
            type="email"
            value={emailAddress}
            onChange={(event) => setEmailAddress(event.target.value)}
            placeholder="Enter your personal or work email"
            aria-label="Email address"
            autoComplete="email"
            className="h-12 rounded-xl border border-border bg-background"
          />

          {(formError ?? errors.fields.identifier?.message) ? (
            <p className="rounded-2xl bg-error-container px-4 py-3 text-sm text-error">
              {formError ?? errors.fields.identifier?.message}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="gradient"
            disabled={!emailAddress || isBusy}
            className="w-full rounded-xl text-sm font-semibold"
          >
            Continue with email
          </Button>

          <p className="px-2 text-center text-[12px] leading-5 text-on-surface-variant">
            {ROLE_COPY[role].helper}
          </p>
        </form>
      ) : (
        <div className="space-y-4 px-2 py-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-2xl text-primary">
            ✦
          </div>
          <div className="space-y-2">
            <p className="text-sm leading-6 text-on-surface-variant">
              {statusMessage ?? `We sent a verification code to ${emailAddress}.`}
            </p>
            <p className="text-base font-semibold text-on-surface">{emailAddress}</p>
          </div>

          {showCodeEntry ? (
            <form onSubmit={handleVerify} className="space-y-3 text-left">
              <label className="block text-sm font-medium text-on-surface" htmlFor="code">
                Verification code
              </label>
              <Input
                id="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter code"
                className="h-12 rounded-xl border border-border bg-background text-center tracking-[0.28em]"
              />

              {formError ? (
                <p className="rounded-2xl bg-error-container px-4 py-3 text-sm text-error">
                  {formError}
                </p>
              ) : null}

              <Button type="submit" variant="gradient" className="w-full rounded-xl text-sm font-semibold">
                Verify and continue
              </Button>
            </form>
          ) : (
            <p className="text-sm leading-6 text-on-surface-variant">
              {ROLE_COPY[role].pendingHelper}
            </p>
          )}

          <div className="space-y-2 text-sm text-on-surface-variant">
            <button
              type="button"
              onClick={() => setShowCodeEntry(true)}
              className="underline decoration-border underline-offset-4 transition-colors hover:text-on-surface"
            >
              Enter verification code
            </button>
            <div>
              <button
                type="button"
                onClick={sendEmailCode}
                className="underline decoration-border underline-offset-4 transition-colors hover:text-on-surface"
              >
                Try sending again
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={resetFlow}
                className="underline decoration-border underline-offset-4 transition-colors hover:text-on-surface"
              >
                Use a different email
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="clerk-captcha" className={cn(step === "collect" ? "mt-2" : "sr-only")} />

      <p className="mt-4 text-center text-[12px] leading-5 text-on-surface-variant">
        By continuing, you acknowledge Bridges&apos;{" "}
        <Link href="/" className="underline underline-offset-4">
          Privacy Policy
        </Link>{" "}
        and agree to receive occasional product updates.
      </p>
    </div>
  );
}
