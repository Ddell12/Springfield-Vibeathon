"use client";

import { HistoryPage } from "@/features/tools/lib/runtime/history-page";
import type { PageProps } from "@/features/tools/lib/registry";

import { matchingHistoryStats } from "./history-stats";
import type { MatchingGameConfig } from "./schema";

export function MatchingGameHistoryPage({ data }: PageProps<MatchingGameConfig>) {
  return <HistoryPage data={data} historyStats={matchingHistoryStats} />;
}
