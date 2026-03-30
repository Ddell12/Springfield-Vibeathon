"use client";

import { useState } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useReportGeneration } from "../hooks/use-report-generation";
import { ProgressReportViewer } from "./progress-report-viewer";

type ReportType = "weekly-summary" | "monthly-summary" | "iep-progress-report";

interface ProgressReportGeneratorProps {
  patientId: Id<"patients">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function defaultPeriod(reportType: ReportType): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  switch (reportType) {
    case "weekly-summary":
      start.setDate(end.getDate() - 7);
      break;
    case "monthly-summary":
      start.setMonth(end.getMonth() - 1);
      break;
    case "iep-progress-report":
      start.setMonth(end.getMonth() - 3);
      break;
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function ProgressReportGenerator({
  patientId,
  open,
  onOpenChange,
}: ProgressReportGeneratorProps) {
  const [reportType, setReportType] = useState<ReportType>("weekly-summary");
  const period = defaultPeriod(reportType);
  const [periodStart, setPeriodStart] = useState(period.start);
  const [periodEnd, setPeriodEnd] = useState(period.end);

  const { status, streamedText, reportId, error, generate, reset } = useReportGeneration();

  function handleTypeChange(type: ReportType) {
    setReportType(type);
    const p = defaultPeriod(type);
    setPeriodStart(p.start);
    setPeriodEnd(p.end);
  }

  async function handleGenerate() {
    await generate({
      patientId: patientId as string,
      reportType,
      periodStart,
      periodEnd,
    });
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Generate Progress Report</SheetTitle>
          <SheetDescription>
            AI will generate a progress report based on the goal data for the selected period.
          </SheetDescription>
        </SheetHeader>

        {!reportId && status !== "generating" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => handleTypeChange(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly-summary">Weekly Summary</SelectItem>
                  <SelectItem value="monthly-summary">Monthly Summary</SelectItem>
                  <SelectItem value="iep-progress-report">IEP Progress Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Period Start</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Period End</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button onClick={handleGenerate}>
              <MaterialIcon icon="auto_awesome" size="sm" />
              Generate Report
            </Button>
          </div>
        )}

        {status === "generating" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Generating report...</p>
            </div>
            {streamedText && (
              <pre className="max-h-64 overflow-y-auto rounded-lg bg-muted p-4 text-xs">
                {streamedText}
              </pre>
            )}
          </div>
        )}

        {reportId && (
          <div className="mt-6">
            <ProgressReportViewer reportId={reportId} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
