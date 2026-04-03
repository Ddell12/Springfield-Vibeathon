"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import { api } from "../../../../convex/_generated/api";

export function ProfileSection() {
  const user = useCurrentUser();
  const updateName = useMutation(api.users.updateName);
  const [displayName, setDisplayName] = useState("");
  const [nameInitialized, setNameInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user !== undefined && user && !nameInitialized) {
      setDisplayName(user.name ?? "");
      setNameInitialized(true);
    }
  }, [user, nameInitialized]);

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await updateName({ name: displayName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const initial = displayName.charAt(0)?.toUpperCase() || "?";
  const email = user?.email ?? "";

  return (
    <div className="flex flex-col gap-12">
      {/* Section heading */}
      <h1 className="text-4xl font-headline font-normal text-primary tracking-tight">
        Profile
      </h1>

      {/* Avatar */}
      <div className="flex flex-col items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary text-3xl font-bold shadow-inner">
          {initial}
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-8">
        {/* Display Name */}
        <div className="space-y-2">
          <Label
            htmlFor="display-name"
            className="block text-sm font-semibold text-on-surface-variant ml-1"
          >
            Display name
          </Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full h-12 px-4 bg-surface-container-high border-none rounded-lg focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-medium"
          />
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2 opacity-60">
          <Label
            htmlFor="email"
            className="block text-sm font-semibold text-on-surface-variant ml-1"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="w-full h-12 px-4 bg-surface-container-high border-none rounded-lg text-on-surface-variant cursor-not-allowed font-medium"
          />
          <p className="text-xs text-on-surface-variant italic">
            Email cannot be changed after verification.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-error text-sm">
            <MaterialIcon icon="error" size="xs" />
            <span>{error}</span>
          </div>
        )}

        {/* Save button */}
        <div className="pt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-3 rounded-lg font-semibold text-sm hover:opacity-90 active:scale-95 transition-all h-auto disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
