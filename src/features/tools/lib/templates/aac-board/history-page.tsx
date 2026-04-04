"use client";

import { HistoryPage } from "@/features/tools/lib/runtime/history-page";
import type { PageProps } from "@/features/tools/lib/registry";

import { aacHistoryStats } from "./history-stats";
import type { AACBoardConfig } from "./schema";

export function AACBoardHistoryPage({ data }: PageProps<AACBoardConfig>) {
  return <HistoryPage data={data} historyStats={aacHistoryStats} />;
}
