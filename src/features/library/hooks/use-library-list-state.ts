"use client";

import { useRouter, useSearchParams } from "next/navigation";

type LibrarySort = "recent" | "alphabetical" | "popular" | "newest";

export function useLibraryListState(defaultTab: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? defaultTab;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const search = searchParams.get("search") ?? "";
  const sort = (searchParams.get("sort") ?? "recent") as LibrarySort;

  function update(next: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    router.replace(`/library?${params.toString()}`, { scroll: false });
  }

  return { tab, page, search, sort, update };
}
