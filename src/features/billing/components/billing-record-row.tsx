"use client";

import { useQuery } from "convex/react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  finalized: "bg-blue-100 text-blue-800",
  billed: "bg-green-100 text-green-800",
};

interface BillingRecordRowProps {
  record: Doc<"billingRecords">;
  onEdit: (recordId: Id<"billingRecords">) => void;
  onGenerateSuperbill?: (recordId: Id<"billingRecords">) => void;
  onMarkBilled?: (recordId: Id<"billingRecords">) => void;
  onToggle?: (id: Id<"billingRecords">) => void;
  isSelected?: boolean;
}

export function BillingRecordRow({
  record,
  onEdit,
  onGenerateSuperbill,
  onMarkBilled,
  onToggle,
  isSelected,
}: BillingRecordRowProps) {
  const patient = useQuery(api.patients.get, { patientId: record.patientId });
  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : "Loading...";
  const feeDisplay = record.fee ? `$${(record.fee / 100).toFixed(2)}` : "—";

  return (
    <tr className="border-b border-surface-container-high hover:bg-surface-container-lowest/50 transition-colors duration-300">
      {onToggle && (
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={isSelected ?? false}
            onChange={() => onToggle(record._id)}
            aria-label={`Select record for ${patientName}`}
            className="h-4 w-4 rounded border-on-surface-variant accent-primary cursor-pointer"
          />
        </td>
      )}
      <td className="px-4 py-3 text-sm text-on-surface">{patientName}</td>
      <td className="px-4 py-3 text-sm text-on-surface-variant">{record.dateOfService}</td>
      <td className="px-4 py-3 text-sm font-mono text-on-surface">{record.cptCode}</td>
      <td className="px-4 py-3 text-sm text-on-surface-variant">
        {record.modifiers.join(", ") || "—"}
      </td>
      <td className="px-4 py-3 text-sm text-on-surface">{feeDisplay}</td>
      <td className="px-4 py-3">
        <Badge className={cn("text-xs", STATUS_STYLES[record.status])}>
          {record.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {record.status === "draft" && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(record._id)}>
              <MaterialIcon icon="edit" size="sm" />
            </Button>
          )}
          {record.status === "finalized" && onGenerateSuperbill && (
            <Button variant="ghost" size="sm" onClick={() => onGenerateSuperbill(record._id)}>
              <MaterialIcon icon="receipt" size="sm" />
            </Button>
          )}
          {record.status === "finalized" && onMarkBilled && (
            <Button variant="ghost" size="sm" onClick={() => onMarkBilled(record._id)}>
              <MaterialIcon icon="check_circle" size="sm" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
