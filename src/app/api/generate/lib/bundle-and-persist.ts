import type { ConvexHttpClient } from "convex/browser";
import { settleInBatches } from "@/core/utils";
import { acquireBuildSlot } from "../build-limiter";
import { runBundleWorker } from "../run-bundle-worker";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface BundleOpts {
  convex: ConvexHttpClient;
  sessionId: Id<"sessions">;
  collectedFiles: Map<string, string>;
  buildDir: string;
  send: (event: string, data: object) => void;
}

interface PersistOpts {
  convex: ConvexHttpClient;
  sessionId: Id<"sessions">;
  collectedFiles: Map<string, string>;
}

export async function bundleFiles(opts: BundleOpts): Promise<{
  html: string;
  succeeded: boolean;
}> {
  const { convex, sessionId, collectedFiles, buildDir, send } = opts;

  if (collectedFiles.size === 0) {
    return { html: "", succeeded: false };
  }

  send("status", { status: "bundling" });
  send("activity", { type: "thinking", message: "Bundling your app..." });

  const release = await acquireBuildSlot();

  try {
    let bundleHtml: string;

    try {
      bundleHtml = await runBundleWorker(buildDir);
      if (bundleHtml.length < 200) throw new Error("bundle HTML is suspiciously small");
    } catch (firstError) {
      const firstMsg = firstError instanceof Error ? firstError.message : String(firstError);
      console.error("[generate] Bundle worker failed (attempt 1):", firstMsg.slice(0, 500));

      await new Promise((r) => setTimeout(r, 1000));

      try {
        bundleHtml = await runBundleWorker(buildDir);
        if (bundleHtml.length < 200) throw new Error("bundle HTML is suspiciously small");
      } catch (secondError) {
        const secondMsg = secondError instanceof Error ? secondError.message : String(secondError);
        console.error("[generate] Bundle worker failed (attempt 2):", secondMsg.slice(0, 500));
        send("activity", { type: "complete", message: "We're having a little trouble — your app may need a small tweak" });
        bundleHtml = "";
      }
    }

    if (bundleHtml && bundleHtml.length >= 200) {
      send("activity", { type: "thinking", message: "Almost ready..." });
      send("bundle", { html: bundleHtml });

      try {
        await convex.mutation(api.generated_files.upsertAutoVersion, {
          sessionId,
          path: "_bundle.html",
          contents: bundleHtml,
        });
      } catch (err) {
        console.error("[generate] Failed to persist bundle:", err);
      }

      return { html: bundleHtml, succeeded: true };
    }

    return { html: "", succeeded: false };
  } finally {
    release();
  }
}

export async function persistFiles(
  opts: PersistOpts,
): Promise<Array<{ path: string; contents: string }>> {
  const { convex, sessionId, collectedFiles } = opts;

  const fileArray = [...collectedFiles.entries()].map(([path, contents]) => ({
    path,
    contents,
  }));

  const mutationThunks = fileArray.map(
    ({ path, contents }) =>
      () =>
        convex.mutation(api.generated_files.upsertAutoVersion, {
          sessionId,
          path,
          contents,
        }),
  );

  const settled =
    mutationThunks.length <= 20
      ? await Promise.allSettled(mutationThunks.map((fn) => fn()))
      : await settleInBatches(mutationThunks, 10);

  const failures = settled.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    console.error(`[generate] ${failures.length} file persistence failure(s)`);
  }

  return fileArray;
}
