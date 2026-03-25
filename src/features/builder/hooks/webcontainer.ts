import { WebContainer } from "@webcontainer/api";

let _promise: Promise<WebContainer> | null = null;

export function getWebContainer(): Promise<WebContainer> {
  // SSR guard — return a never-resolving promise when running on server
  if (typeof window === "undefined") {
    return new Promise(() => {});
  }

  if (!_promise) {
    _promise = WebContainer.boot({
      coep: "credentialless",
      forwardPreviewErrors: "exceptions-only",
    });
  }

  return _promise;
}

export async function teardownWebContainer(): Promise<void> {
  if (_promise) {
    const wc = await _promise;
    await wc.teardown();
    _promise = null;
  }
}
