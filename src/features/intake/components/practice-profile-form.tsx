"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { api } from "../../../../convex/_generated/api";

interface FormFields {
  practiceName: string;
  practiceAddress: string;
  practicePhone: string;
  npiNumber: string;
  licenseNumber: string;
  licenseState: string;
  taxId: string;
  credentials: string;
}

const EMPTY_FIELDS: FormFields = {
  practiceName: "",
  practiceAddress: "",
  practicePhone: "",
  npiNumber: "",
  licenseNumber: "",
  licenseState: "",
  taxId: "",
  credentials: "",
};

export function PracticeProfileForm() {
  const profile = useQuery(api.practiceProfiles.get, {});
  const updateProfile = useMutation(api.practiceProfiles.upsert);
  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS);
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profile && !initialized) {
      setFields({
        practiceName: profile.practiceName ?? "",
        practiceAddress: profile.address ?? "",
        practicePhone: profile.phone ?? "",
        npiNumber: profile.npiNumber ?? "",
        licenseNumber: profile.licenseNumber ?? "",
        licenseState: profile.licenseState ?? "",
        taxId: profile.taxId ?? "",
        credentials: profile.credentials ?? "",
      });
      setInitialized(true);
    }
    if (profile === null && !initialized) {
      setInitialized(true);
    }
  }, [profile, initialized]);

  if (profile === undefined) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  function setField(key: keyof FormFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateProfile({
        practiceName: fields.practiceName || undefined,
        address: fields.practiceAddress || undefined,
        phone: fields.practicePhone || undefined,
        npiNumber: fields.npiNumber || undefined,
        licenseNumber: fields.licenseNumber || undefined,
        licenseState: fields.licenseState || undefined,
        taxId: fields.taxId || undefined,
        credentials: fields.credentials || undefined,
      });
      toast.success("Practice profile saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const FIELD_CONFIG: { key: keyof FormFields; label: string; placeholder: string }[] = [
    { key: "practiceName", label: "Practice Name", placeholder: "Springfield Speech Center" },
    { key: "practiceAddress", label: "Practice Address", placeholder: "123 Main St, Springfield, IL 62701" },
    { key: "practicePhone", label: "Phone Number", placeholder: "(217) 555-0100" },
    { key: "credentials", label: "Credentials", placeholder: "M.S., CCC-SLP" },
    { key: "npiNumber", label: "NPI Number", placeholder: "1234567890" },
    { key: "licenseNumber", label: "License Number", placeholder: "SLP-12345" },
    { key: "licenseState", label: "License State", placeholder: "IL" },
    { key: "taxId", label: "Tax ID (EIN)", placeholder: "12-3456789" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-headline text-lg font-semibold text-foreground">
          Practice Profile
        </h2>
        <p className="text-sm text-muted-foreground">
          This information appears on patient intake forms and legal documents.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELD_CONFIG.map(({ key, label, placeholder }) => (
          <div key={key} className={key === "practiceAddress" ? "sm:col-span-2" : ""}>
            <Label htmlFor={`practice-${key}`} className="text-sm font-medium">
              {label}
            </Label>
            <Input
              id={`practice-${key}`}
              value={fields[key]}
              onChange={(e) => setField(key, e.target.value)}
              placeholder={placeholder}
              className="mt-1"
            />
          </div>
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-fit bg-gradient-to-br from-primary to-[#0d7377]"
      >
        {isSaving ? "Saving..." : "Save Practice Profile"}
      </Button>
    </div>
  );
}
