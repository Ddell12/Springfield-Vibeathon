"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { MaterialIcon } from "@/shared/components/material-icon";
import { usePatients, usePatientStats } from "../hooks/use-patients";
import { PatientRow } from "./patient-row";
import { PatientRowExpanded } from "./patient-row-expanded";

const FILTERS = [
  { value: undefined, label: "All" },
  { value: "active", label: "Active" },
  { value: "on-hold", label: "On Hold" },
  { value: "pending-intake", label: "Pending" },
  { value: "discharged", label: "Discharged" },
] as const;

export function PatientsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const patients = usePatients(statusFilter);
  const stats = usePatientStats();

  const filtered = patients?.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(term) ||
      p.lastName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface font-headline">My Caseload</h1>
          {stats && (
            <p className="text-sm text-on-surface-variant">
              {stats.active} active patient{stats.active !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/patients/new">
            <MaterialIcon icon="add" size="sm" />
            Add Patient
          </Link>
        </Button>
      </div>

      {/* Filter pills + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-300",
                statusFilter === f.value
                  ? "bg-primary text-white"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>

      {/* Patient list */}
      {patients === undefined ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-on-surface-variant">Loading caseload...</p>
        </div>
      ) : filtered && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
            <MaterialIcon icon="group" size="lg" className="text-on-surface-variant" />
          </div>
          <p className="text-lg font-medium text-on-surface">
            {search ? "No patients match your search" : "No patients yet"}
          </p>
          {!search && (
            <Button asChild>
              <Link href="/patients/new">Add your first patient</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered?.map((patient) => (
            <div key={patient._id}>
              <PatientRow
                patient={patient}
                isExpanded={expandedId === patient._id}
                onToggle={() =>
                  setExpandedId(expandedId === patient._id ? null : patient._id)
                }
              />
              {expandedId === patient._id && (
                <PatientRowExpanded patient={patient} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
