"use client";

import { HistoryPage } from "@/features/tools/lib/runtime/history-page";
import type { PageProps } from "@/features/tools/lib/registry";

import type { VisualScheduleConfig } from "./schema";

export function VisualScheduleHistoryPage({ data }: PageProps<VisualScheduleConfig>) {
  return <HistoryPage data={data} />;
}
