"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/shared/components/ui/sheet";

interface PublishSheetProps {
  open: boolean;
  onClose: () => void;
  isSaving: boolean;
  publishedShareToken: string | null;
  instanceId: Id<"app_instances"> | null;
  patientId: Id<"patients"> | null;
  onSelectPatient: (id: Id<"patients">) => void;
  onPublish: () => Promise<string | null>;
  onUnpublish: () => Promise<void>;
}

export function PublishSheet({
  open, onClose, isSaving, publishedShareToken,
  instanceId: _instanceId, patientId, onSelectPatient,
  onPublish, onUnpublish,
}: PublishSheetProps) {
  const [copied, setCopied] = useState(false);
  const patients = useQuery(api.patients.list, {}) ?? [];

  const shareUrl = publishedShareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/apps/${publishedShareToken}`
    : null;
  const sessionUrl = shareUrl ? `${shareUrl}?session=true` : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-[400px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Publish app</SheetTitle>
          <SheetDescription>
            Share with caregivers or open directly in your session.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 mt-6">
          {!publishedShareToken ? (
            <Button className="w-full" disabled={isSaving} onClick={() => void onPublish()}>
              {isSaving ? "Publishing…" : "Publish app"}
            </Button>
          ) : (
            <>
              {/* Open in Session — primary CTA */}
              <a
                href={sessionUrl!}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Session"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-[#00595c] to-[#0d7377] hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Session
              </a>

              {/* Share link */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Share link
                </Label>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                  <span className="flex-1 truncate font-mono text-xs">{shareUrl}</span>
                  <Button variant="ghost" size="sm" onClick={() => void handleCopy()}>
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* QR code */}
              <div className="flex flex-col items-center gap-2">
                <QRCodeSVG value={shareUrl!} size={120} />
                <p className="text-xs text-muted-foreground">Scan to open on child&apos;s tablet</p>
              </div>

              {/* Assign to child */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium">Assign to child (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Attaches usage data to their profile for session notes.
                </p>
                <Select
                  value={patientId ?? "__none__"}
                  onValueChange={(v) => {
                    if (v !== "__none__") onSelectPatient(v as Id<"patients">);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select from caseload…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {patients.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unpublish */}
              <div className="pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => void onUnpublish()}
                >
                  Unpublish
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
