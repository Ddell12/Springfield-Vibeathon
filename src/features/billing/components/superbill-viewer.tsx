"use client";

import { useQuery } from "convex/react";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface SuperbillViewerProps {
  recordId: Id<"billingRecords">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuperbillViewer({ recordId, open, onOpenChange }: SuperbillViewerProps) {
  const record = useQuery(api.billingRecords.get, { recordId });
  const patient = useQuery(
    api.patients.get,
    record ? { patientId: record.patientId } : "skip",
  );
  const profile = useQuery(api.practiceProfiles.get, {});

  const feeDisplay = record?.fee ? `$${(record.fee / 100).toFixed(2)}` : "$0.00";
  const totalFee = record?.fee
    ? `$${((record.fee * (record?.units ?? 1)) / 100).toFixed(2)}`
    : "$0.00";

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle className="font-display">Superbill</DialogTitle>
          <DialogDescription>Review and print this superbill for insurance submission.</DialogDescription>
        </DialogHeader>

        {!record || !patient ? (
          <div className="animate-pulse h-48 rounded-xl bg-surface-container" />
        ) : (
          <>
            <div id="superbill-print-root" className="superbill-content space-y-6 rounded-xl border border-surface-container-high p-6 print:border-black print:p-0">
              <div className="border-b border-surface-container-high pb-4 print:border-black">
                <h2 className="text-lg font-bold text-on-surface">
                  {profile?.practiceName ?? "Practice Name"}
                </h2>
                {profile?.address && (
                  <p className="text-sm text-on-surface-variant">{profile.address}</p>
                )}
                {profile?.phone && (
                  <p className="text-sm text-on-surface-variant">{profile.phone}</p>
                )}
                <div className="mt-2 flex gap-4 text-xs text-on-surface-variant">
                  {profile?.npiNumber && <span>NPI: {profile.npiNumber}</span>}
                  {profile?.taxId && <span>Tax ID: {profile.taxId}</span>}
                </div>
              </div>

              <div className="border-b border-surface-container-high pb-4 print:border-black">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  Patient Information
                </h3>
                <p className="text-sm font-medium text-on-surface">
                  {patient.firstName} {patient.lastName}
                </p>
                <p className="text-sm text-on-surface-variant">DOB: {patient.dateOfBirth}</p>
                {patient.insuranceCarrier && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                    <span>Carrier: {patient.insuranceCarrier}</span>
                    {patient.insuranceMemberId && (
                      <span>Member ID: {patient.insuranceMemberId}</span>
                    )}
                    {patient.insuranceGroupNumber && (
                      <span>Group #: {patient.insuranceGroupNumber}</span>
                    )}
                    {patient.insurancePhone && (
                      <span>Claims Phone: {patient.insurancePhone}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="border-b border-surface-container-high pb-4 print:border-black">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  Services Rendered
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-on-surface-variant">
                      <th className="pb-1">Date</th>
                      <th className="pb-1">CPT</th>
                      <th className="pb-1">Description</th>
                      <th className="pb-1">Mod</th>
                      <th className="pb-1">POS</th>
                      <th className="pb-1">Units</th>
                      <th className="pb-1 text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1">{record.dateOfService}</td>
                      <td className="py-1 font-mono">{record.cptCode}</td>
                      <td className="py-1">{record.cptDescription}</td>
                      <td className="py-1">{record.modifiers.join(", ")}</td>
                      <td className="py-1">{record.placeOfService}</td>
                      <td className="py-1">{record.units}</td>
                      <td className="py-1 text-right">{feeDisplay}</td>
                    </tr>
                  </tbody>
                </table>

                {record.diagnosisCodes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-on-surface-variant">Diagnosis Codes:</p>
                    {record.diagnosisCodes.map((dx, i) => (
                      <p key={i} className="text-xs text-on-surface-variant">
                        {dx.code} — {dx.description}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {(record.units ?? 1) > 1 && (
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-xs text-on-surface-variant">Total</p>
                    <p className="text-lg font-bold text-on-surface">{totalFee}</p>
                  </div>
                </div>
              )}

              <div className="border-t border-surface-container-high pt-4 print:border-black">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  Provider
                </h3>
                {profile?.credentials && (
                  <p className="text-sm text-on-surface">{profile.credentials}</p>
                )}
                {profile?.licenseNumber && (
                  <p className="text-xs text-on-surface-variant">
                    License #: {profile.licenseNumber}
                  </p>
                )}
                <div className="mt-6 border-b border-black w-64">
                  <p className="text-xs text-on-surface-variant pb-1">Signature</p>
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">Date: ____________</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 print:hidden">
              <Button
                type="button"
                onClick={handlePrint}
                className="bg-gradient-to-br from-primary to-primary-container text-white hover:opacity-90 gap-2"
              >
                <MaterialIcon icon="download" size="sm" />
                Download PDF
              </Button>
            </div>
          </>
        )}
        <style>{`
          @media print {
            body > *:not([data-radix-portal]) { display: none !important; }
            [data-radix-portal] [role="dialog"] {
              position: static !important;
              transform: none !important;
              max-width: 100% !important;
              max-height: none !important;
              box-shadow: none !important;
              border: none !important;
            }
            [data-radix-portal] [role="dialog"] > *:not(#superbill-print-root) {
              display: none !important;
            }
            #superbill-print-root { display: block !important; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
