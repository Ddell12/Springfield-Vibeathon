import { useCallback, useEffect, useRef, useState } from "react";

import { getWebContainer } from "./webcontainer";
import { templateFiles } from "./webcontainer-files";

export type WebContainerStatus = "booting" | "installing" | "ready" | "error";

export interface UseWebContainerReturn {
  status: WebContainerStatus;
  previewUrl: string | null;
  error: string | null;
  writeFile: (path: string, contents: string) => Promise<void>;
}

export function useWebContainer(): UseWebContainerReturn {
  const [status, setStatus] = useState<WebContainerStatus>("booting");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guard against StrictMode double-fire
  const bootedRef = useRef(false);
  // Store the WebContainer instance for writeFile
  const wcRef = useRef<Awaited<ReturnType<typeof getWebContainer>> | null>(null);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    let unsubscribeServerReady: (() => void) | undefined;

    async function boot() {
      try {
        const wc = await getWebContainer();
        wcRef.current = wc;

        // Register server-ready before starting npm so we don't miss the event
        const off = wc.on("server-ready", (_port: number, url: string) => {
          setPreviewUrl(url);
          setStatus("ready");
        });
        unsubscribeServerReady = off;

        // Mount template files
        await wc.mount(templateFiles);

        // Install dependencies
        setStatus("installing");
        const installProcess = await wc.spawn("npm", ["install"]);
        const exitCode = await installProcess.exit;

        if (exitCode !== 0) {
          setStatus("error");
          setError("npm install failed");
          return;
        }

        // Start dev server in background
        await wc.spawn("npm", ["run", "dev"]);
        // status will transition to "ready" when server-ready fires
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "WebContainer boot failed");
      }
    }

    boot();

    return () => {
      if (unsubscribeServerReady) {
        unsubscribeServerReady();
      }
    };
  }, []);

  const writeFile = useCallback(async (path: string, contents: string) => {
    const wc = wcRef.current;
    if (!wc) return;

    const lastSlash = path.lastIndexOf("/");
    if (lastSlash > 0) {
      const dir = path.slice(0, lastSlash);
      await wc.fs.mkdir(dir, { recursive: true });
    }

    await wc.fs.writeFile(path, contents);
  }, []);

  return { status, previewUrl, error, writeFile };
}
