"use client";

import { promptLevelLabel } from "../lib/goal-utils";

interface ProgressDataPoint {
  _id: string;
  date: string;
  accuracy: number;
  trials?: number;
  correct?: number;
  promptLevel?: string;
  source: string;
  notes?: string;
}

interface ProgressDataTableProps {
  data: ProgressDataPoint[];
}

function sourceLabel(source: string): string {
  switch (source) {
    case "session-note": return "Session Note";
    case "in-app-auto": return "In-App";
    case "manual-entry": return "Manual";
    default: return source;
  }
}

export function ProgressDataTable({ data }: ProgressDataTableProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No data points recorded yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 pr-4">Source</th>
            <th className="pb-2 pr-4">Accuracy</th>
            <th className="pb-2 pr-4">Trials</th>
            <th className="pb-2 pr-4">Prompt Level</th>
            <th className="pb-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((dp) => (
            <tr key={dp._id} className="border-b border-border/50">
              <td className="py-2 pr-4">{dp.date}</td>
              <td className="py-2 pr-4">{sourceLabel(dp.source)}</td>
              <td className="py-2 pr-4 font-medium">{dp.accuracy}%</td>
              <td className="py-2 pr-4 text-muted-foreground">
                {dp.trials !== undefined ? `${dp.correct ?? "?"}/${dp.trials}` : "\u2014"}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {dp.promptLevel ? promptLevelLabel(dp.promptLevel) : "\u2014"}
              </td>
              <td className="py-2 text-muted-foreground">{dp.notes ?? "\u2014"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
