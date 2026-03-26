import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Extract a human-readable message from an unknown caught value. */
export function extractErrorMessage(err: unknown, fallback = "Unknown error"): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}

/** Run promise-returning thunks in sequential batches, collecting all settled results. */
export async function settleInBatches<T>(
  thunks: (() => Promise<T>)[],
  batchSize: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < thunks.length; i += batchSize) {
    const batch = thunks.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map((fn) => fn()));
    results.push(...settled);
  }
  return results;
}
