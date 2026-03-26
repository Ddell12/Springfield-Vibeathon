"use client";

import { useState } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export function ProfileSection() {
  const [displayName, setDisplayName] = useState("Desha");
  const [role, setRole] = useState("ABA Therapist");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-12">
      {/* Section heading */}
      <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">
        Profile
      </h1>

      {/* Avatar */}
      <div className="flex flex-col items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary text-3xl font-bold font-headline shadow-inner">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-primary hover:bg-surface-container-high transition-colors outline outline-1 outline-outline-variant/15">
          Change avatar
        </button>
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
            value="user@bridges.ai"
            disabled
            className="w-full h-12 px-4 bg-surface-container-high border-none rounded-lg text-on-surface-variant cursor-not-allowed font-medium"
          />
          <p className="text-xs text-on-surface-variant italic">
            Email cannot be changed after verification.
          </p>
        </div>

        {/* Role */}
        <div className="space-y-2">
          <Label
            htmlFor="role"
            className="block text-sm font-semibold text-on-surface-variant ml-1"
          >
            Role
          </Label>
          <div className="relative">
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-12 px-4 pr-10 bg-surface-container-high border-none rounded-lg focus:ring-2 focus:ring-primary/20 appearance-none transition-all text-on-surface font-medium"
            >
              <option>Parent</option>
              <option>ABA Therapist</option>
              <option>Speech Therapist</option>
              <option>Teacher</option>
            </select>
            <MaterialIcon icon="expand_more" size="xs" className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          </div>
        </div>

        {/* Save button */}
        <div className="pt-6 flex justify-end">
          <Button
            onClick={handleSave}
            className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-3 rounded-lg font-semibold text-sm hover:opacity-90 active:scale-95 transition-all h-auto"
          >
            {saved ? "Saved!" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
