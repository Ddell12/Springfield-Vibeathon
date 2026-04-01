"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Id } from "../../../../convex/_generated/dataModel";
import {
  useMarkReportReviewed,
  useReport,
  useSignReport,
  useUnsignReport,
  useUpdateReportNarrative,
} from "../hooks/use-report-generation";
import { domainColor, domainLabel, statusBadgeColor,trendArrow } from "../lib/goal-utils";

// Physician signature data from Plan of Care (SP2 dependency).
// Returns undefined if plansOfCare table does not exist yet.
interface PhysicianSigInfo {
  onFile: boolean;
  physicianName?: string;
  signatureDate?: string;
}
function usePhysicianSignature(_patientId: Id<"patients"> | undefined): PhysicianSigInfo | undefined {
  // SP2 dependency: plansOfCare table may not exist yet.
  // When SP2 is implemented, replace this with:
  //   const poc = useQuery(api.plansOfCare.getActive, { patientId });
  //   if (!poc) return undefined;
  //   return {
  //     onFile: poc.physicianSignatureOnFile ?? false,
  //     physicianName: poc.physicianName,
  //     signatureDate: poc.physicianSignatureDate,
  //   };
  return undefined;
}

interface ProgressReportViewerProps {
  reportId: Id<"progressReports">;
}

export function ProgressReportViewer({ reportId }: ProgressReportViewerProps) {
  const report = useReport(reportId);
  const markReviewed = useMarkReportReviewed();
  const signReport = useSignReport();
  const unsignReport = useUnsignReport();
  const updateNarrative = useUpdateReportNarrative();
  const [saving, setSaving] = useState(false);
  // IMPORTANT: Call hook unconditionally before any early return — React Rules of Hooks
  const physicianSig = usePhysicianSignature(report?.patientId);

  if (!report) {
    return <p className="text-sm text-muted-foreground">Loading report...</p>;
  }

  const isEditable = report.status === "draft" || report.status === "reviewed";

  async function handleNarrativeChange(index: number, narrative: string) {
    if (!report) return;
    const updated = [...report.goalSummaries];
    updated[index] = { ...updated[index], narrative };
    await updateNarrative({ reportId, goalSummaries: updated });
  }

  async function handleOverallChange(overallNarrative: string) {
    await updateNarrative({ reportId, overallNarrative });
  }

  async function handleAction(action: "review" | "sign" | "unsign") {
    setSaving(true);
    try {
      if (action === "review") await markReviewed({ reportId });
      else if (action === "sign") await signReport({ reportId });
      else await unsignReport({ reportId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium capitalize">
              {report.reportType.replace(/-/g, " ")}
            </p>
            {report.audience && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {report.audience === "clinical"
                  ? "Clinical"
                  : report.audience === "parent"
                    ? "Parent-Friendly"
                    : "IEP Team"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {report.periodStart} to {report.periodEnd}
          </p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeColor(report.status))}>
          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
        </span>
      </div>

      {report.goalSummaries.map((gs, i) => (
        <div key={gs.goalId} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-4 print:break-inside-avoid">
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", domainColor(gs.domain))}>
              {domainLabel(gs.domain)}
            </span>
            <span className="text-sm font-medium">{gs.shortDescription}</span>
            <span className="text-sm">{trendArrow(gs.accuracyTrend)}</span>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Avg: {gs.averageAccuracy}%</span>
            <span>{gs.sessionsCount} session{gs.sessionsCount !== 1 ? "s" : ""}</span>
          </div>
          {isEditable ? (
            <Textarea
              value={gs.narrative}
              onChange={(e) => handleNarrativeChange(i, e.target.value)}
              rows={3}
              className="text-sm"
            />
          ) : (
            <p className="text-sm">{gs.narrative}</p>
          )}
        </div>
      ))}

      <div className="flex flex-col gap-2 print:break-inside-avoid">
        <h4 className="text-sm font-semibold">Overall Summary</h4>
        {isEditable ? (
          <Textarea
            value={report.overallNarrative}
            onChange={(e) => handleOverallChange(e.target.value)}
            rows={4}
            className="text-sm"
          />
        ) : (
          <p className="text-sm">{report.overallNarrative}</p>
        )}
      </div>

      <div className="flex items-center gap-2 print:hidden">
        {report.status === "draft" && (
          <Button onClick={() => handleAction("review")} disabled={saving}>
            Mark Reviewed
          </Button>
        )}
        {report.status === "reviewed" && (
          <Button onClick={() => handleAction("sign")} disabled={saving}>
            <MaterialIcon icon="draw" size="sm" />
            Sign Report
          </Button>
        )}
        {report.status === "signed" && (
          <Button variant="outline" onClick={() => handleAction("unsign")} disabled={saving}>
            Unsign
          </Button>
        )}
        <Button variant="outline" onClick={() => window.print()}>
          <MaterialIcon icon="print" size="sm" />
          Print / Export PDF
        </Button>
      </div>

      {/* Physician signature status */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-4 py-3 print:break-inside-avoid">
        <MaterialIcon
          icon={physicianSig?.onFile ? "verified" : "pending"}
          size="sm"
          className={physicianSig?.onFile ? "text-success" : "text-muted-foreground"}
        />
        <div className="flex flex-col">
          {physicianSig?.onFile ? (
            <>
              <p className="text-sm font-medium text-foreground">
                Physician signature on file
              </p>
              {physicianSig.physicianName && (
                <p className="text-xs text-muted-foreground">
                  {physicianSig.physicianName}
                  {physicianSig.signatureDate && ` - Signed ${physicianSig.signatureDate}`}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Physician signature: Not on file
            </p>
          )}
        </div>
      </div>

      <div className="hidden print:block print:mt-8 print:border-t print:pt-4">
        <p className="text-xs text-muted-foreground">
          Generated by Vocali | {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
