import { execFile } from "child_process";
import { join } from "path";

/**
 * Spawns esbuild bundling as a child process to isolate memory from the
 * Next.js server heap. The worker reads files from buildDir, runs esbuild,
 * processes CSS, and returns self-contained HTML via stdout JSON.
 */
export function runBundleWorker(buildDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const workerPath = join(process.cwd(), "scripts", "bundle-worker.mjs");
    // Pass the root node_modules path so the worker can resolve shared packages
    const rootNodeModules = join(process.cwd(), "node_modules");

    execFile(
      process.execPath, // use the same node binary as the parent
      [workerPath, buildDir, rootNodeModules],
      {
        maxBuffer: 50 * 1024 * 1024, // 50MB — bundleHtml can be several MB
        timeout: 30_000, // 30s hard limit — kills child if stuck
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr ? `\n${stderr.slice(0, 500)}` : "";
          return reject(new Error(`Bundle worker failed: ${error.message}${detail}`));
        }
        try {
          const result = JSON.parse(stdout);
          if (result.ok) resolve(result.html);
          else reject(new Error(result.error || "Unknown worker error"));
        } catch {
          reject(new Error(`Invalid worker output: ${stdout.slice(0, 200)}`));
        }
      },
    );
  });
}
