"use client";

import { HistoryPage } from "@/features/tools/lib/runtime/history-page";
import type { PageProps } from "@/features/tools/lib/registry";

import { tokenHistoryStats } from "./history-stats";
import type { TokenBoardConfig } from "./schema";

export function TokenBoardHistoryPage({ data }: PageProps<TokenBoardConfig>) {
  return <HistoryPage data={data} historyStats={tokenHistoryStats} />;
}
