"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import type { FormTemplate } from "../lib/form-content";

interface IntakeFormRendererProps {
  template: FormTemplate;
  alreadySigned: boolean;
  signedAt?: number;
  onSign: (signerName: string) => Promise<void>;
}

export function IntakeFormRenderer({
  template,
  alreadySigned,
  signedAt,
  onSign,
}: IntakeFormRendererProps) {
  const [signerName, setSignerName] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSign = signerName.trim().length >= 2 && acknowledged && !isSubmitting;

  async function handleSign() {
    if (!canSign) return;
    setIsSubmitting(true);
    try {
      await onSign(signerName.trim());
      toast.success("Form signed successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sign form",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (alreadySigned) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-headline text-xl font-bold text-foreground">
          {template.title}
        </h2>
        <div className="rounded-xl bg-success/10 p-4 text-sm text-success">
          Signed on{" "}
          {signedAt
            ? new Date(signedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "a previous date"}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-headline text-xl font-bold text-foreground">
        {template.title}
      </h2>

      <div className="flex flex-col gap-4 rounded-xl bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
        {template.sections.map((section, i) => (
          <div key={i}>
            <h3 className="mb-1 font-semibold text-foreground">
              {section.heading}
            </h3>
            <p className="whitespace-pre-line text-muted-foreground">
              {section.body}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs italic text-muted-foreground">
        {template.disclaimer}
      </p>

      <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
        <div>
          <Label htmlFor="signer-name" className="text-sm font-medium">
            Full Legal Name
          </Label>
          <Input
            id="signer-name"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Type your full legal name"
            className="mt-1"
          />
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="acknowledge"
            checked={acknowledged}
            onCheckedChange={(checked) =>
              setAcknowledged(checked === true)
            }
          />
          <Label htmlFor="acknowledge" className="text-sm leading-snug">
            I acknowledge that I have read and understand this document, and I agree
            to its terms.
          </Label>
        </div>

        <Button
          onClick={handleSign}
          disabled={!canSign}
          className="w-full bg-gradient-to-br from-primary to-[#0d7377]"
          size="lg"
        >
          {isSubmitting ? "Signing..." : "Sign Document"}
        </Button>
      </div>
    </div>
  );
}
