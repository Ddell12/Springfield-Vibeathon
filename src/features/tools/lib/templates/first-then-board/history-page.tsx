"use client";

import { HistoryPage } from "@/features/tools/lib/runtime/history-page";
import type { PageProps } from "@/features/tools/lib/registry";

import type { FirstThenBoardConfig } from "./schema";

export function FirstThenBoardHistoryPage({ data }: PageProps<FirstThenBoardConfig>) {
  return <HistoryPage data={data} />;
}
