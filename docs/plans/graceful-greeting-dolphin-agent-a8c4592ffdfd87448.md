# bolt.diy WebContainer Architecture Analysis

## Purpose

Reference analysis for replicating bolt.diy's WebContainer pattern in Bridges, replacing our current E2B sandbox approach.

---

## 1. WebContainer Boot & Initialization

**File:** `app/lib/webcontainer/index.ts`

WebContainer is initialized as a **module-level singleton Promise** that boots once and is shared across the entire app:

```ts
// SSR-safe: returns a never-resolving promise during SSR
export let webcontainer: Promise<WebContainer> = new Promise(() => {});

if (!import.meta.env.SSR) {
  webcontainer = import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => WebContainer.boot({
        coep: 'credentialless',       // Cross-origin isolation mode
        workdirName: WORK_DIR_NAME,   // e.g. "project"
        forwardPreviewErrors: true,   // Forward iframe errors to host
      }))
      .then(async (wc) => {
        // Inject inspector script into previews
        const response = await fetch('/inspector-script.js');
        const inspectorScript = await response.text();
        await wc.setPreviewScript(inspectorScript);

        // Listen for preview runtime errors (uncaught exceptions, unhandled rejections)
        wc.on('preview-message', (message) => {
          // Surface errors as alerts in the workbench UI
        });

        return wc;
      });

  // Preserve across HMR
  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
```

**Key patterns:**
- The `webcontainer` export is a `Promise<WebContainer>`, not the instance itself. All consumers `await` it.
- HMR preservation via `import.meta.hot.data` prevents re-booting during development.
- SSR safety: on the server, the promise never resolves, so no WebContainer code runs.
- Only ONE WebContainer instance per browser tab (API limitation).
- `coep: 'credentialless'` avoids requiring `Cross-Origin-Embedder-Policy` headers.

**Auth file:** `app/lib/webcontainer/auth.client.ts` re-exports `auth` from `@webcontainer/api` for client-only auth flows.

---

## 2. Writing Files to WebContainer Filesystem

**File:** `app/lib/runtime/action-runner.ts` (`#runFileAction`)
**File:** `app/lib/stores/files.ts` (`saveFile`, `#init`)

### From LLM output (ActionRunner):

```ts
async #runFileAction(action: ActionState) {
  const webcontainer = await this.#webcontainer;
  const relativePath = nodePath.relative(webcontainer.workdir, action.filePath);

  // Create parent directories
  let folder = nodePath.dirname(relativePath);
  if (folder !== '.') {
    await webcontainer.fs.mkdir(folder, { recursive: true });
  }

  // Write the file
  await webcontainer.fs.writeFile(relativePath, action.content);
}
```

### From user edits (FilesStore):

```ts
async saveFile(filePath: string, content: string) {
  const webcontainer = await this.#webcontainer;
  const relativePath = path.relative(webcontainer.workdir, filePath);
  await webcontainer.fs.writeFile(relativePath, content);

  // Immediately update local state (don't wait for watcher)
  this.files.setKey(filePath, { type: 'file', content, isBinary: false });
}
```

### File watcher (WebContainer -> local state):

```ts
async #init() {
  const webcontainer = await this.#webcontainer;

  webcontainer.internal.watchPaths(
    {
      include: [`${WORK_DIR}/**`],
      exclude: ['**/node_modules', '.git', '**/package-lock.json'],
      includeContent: true,
    },
    bufferWatchEvents(100, this.#processEventBuffer.bind(this)),
  );
}
```

The `watchPaths` API syncs the WebContainer FS back to the nanostores `files` map, handling `add_dir`, `remove_dir`, `add_file`, `change`, and `unlink` events. Events are buffered at 100ms to batch rapid changes.

---

## 3. Starting Vite / Dev Server Inside WebContainer

**File:** `app/lib/runtime/action-runner.ts` (`#runShellAction`, `#runStartAction`)
**File:** `app/utils/shell.ts` (`BoltShell`, `newShellProcess`)

Shell commands (including `npm install`, `npm run dev`) are executed through a JSH shell process spawned inside WebContainer:

```ts
// Spawn a shell
const process = await webcontainer.spawn('/bin/jsh', ['--osc', ...args], {
  terminal: { cols: terminal.cols ?? 80, rows: terminal.rows ?? 15 },
});
```

The LLM emits `<boltAction type="shell">npm install</boltAction>` and `<boltAction type="start">npm run dev</boltAction>` tags. The ActionRunner dispatches these:

- **`shell` actions:** Blocking. Waits for exit code. Throws `ActionCommandError` on non-zero exit.
- **`start` actions:** Non-blocking. Runs the dev server in background with a 2-second delay to avoid race conditions between sequential start actions.
- **`build` actions:** Uses `webcontainer.spawn('npm', ['run', 'build'])` directly (not through shell), captures output via `WritableStream`, and finds the build directory.

The `BoltShell` class manages a persistent shell session:
- Tees the output stream into 3 readers: terminal display, command execution tracking, and Expo URL detection
- Waits for the `interactive` OSC code before accepting input
- Commands are executed by writing to `process.input` and monitoring output for completion markers

---

## 4. Preview URL Discovery & Display

**File:** `app/lib/stores/previews.ts` (`PreviewsStore`)
**File:** `app/components/workbench/Preview.tsx`
**File:** `app/routes/webcontainer.preview.$id.tsx`

### URL Discovery

The `PreviewsStore` listens to two WebContainer events:

```ts
async #init() {
  const webcontainer = await this.#webcontainer;

  // Fires when a server is ready (e.g., Vite dev server started)
  webcontainer.on('server-ready', (port, url) => {
    // url is like: https://<id>.local-credentialless.webcontainer-api.io
    this.broadcastUpdate(url);
  });

  // Fires for all port state changes (open/close)
  webcontainer.on('port', (port, type, url) => {
    if (type === 'close') {
      this.#availablePreviews.delete(port);
      return;
    }
    // Track new preview
    previewInfo = { port, ready: type === 'open', baseUrl: url };
    this.#availablePreviews.set(port, previewInfo);
    this.previews.set([...previews]);
  });
}
```

Preview URLs follow the pattern: `https://<id>.local-credentialless.webcontainer-api.io`

### Display in iframe

The `Preview.tsx` component subscribes to `workbenchStore.previews` (a nanostores atom) and renders an iframe:

```tsx
const previews = useStore(workbenchStore.previews);
const activePreview = previews[activePreviewIndex];

useEffect(() => {
  if (activePreview) {
    setIframeUrl(activePreview.baseUrl);
  }
}, [activePreview]);

// The iframe
<iframe
  ref={iframeRef}
  src={iframeUrl}
  sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
  allow="cross-origin-isolated"
/>
```

The component auto-selects the lowest-port preview when multiple are available.

### Separate window previews

Route `app/routes/webcontainer.preview.$id.tsx` renders a standalone preview page:
- Constructs URL from route param: `https://${previewId}.local-credentialless.webcontainer-api.io`
- Uses `BroadcastChannel` to listen for refresh/file-change events from other tabs
- The iframe gets `sandbox` and `allow="cross-origin-isolated"` attributes

### Cross-tab sync

`BroadcastChannel('preview-updates')` syncs file changes and refreshes across browser tabs. The `PreviewsStore` also syncs localStorage state between tabs.

---

## 5. Error Handling, Reconnection & Cleanup

### Error handling:

1. **Shell command errors:** `ActionCommandError` class wraps exit code + output. Enhanced error messages suggest fixes (e.g., "Try running npm install first"). Errors surface as `ActionAlert` in the UI.

2. **Preview runtime errors:** WebContainer's `preview-message` event catches uncaught exceptions and unhandled rejections from iframes. These are surfaced as alerts with stack traces cleaned via `cleanStackTrace()`.

3. **Build errors:** The `#runBuildAction` method captures build output via `WritableStream`, checks exit code, and fires `DeployAlert` with build status.

4. **Action abort:** Each action has an `AbortController`. Aborting sets status to `'aborted'` and skips error handling.

5. **Shell validation:** `#validateShellCommand()` pre-checks commands for common issues (unavailable commands in WebContainer, missing packages) and can modify commands before execution.

### Cleanup:

- `TerminalStore.detachTerminal()` kills the shell process
- File watcher cleanup is handled by the WebContainer lifecycle
- `BroadcastChannel.close()` on component unmount
- HMR: State is preserved via `import.meta.hot.data` to avoid re-initialization

### Reconnection:

- No explicit reconnection logic found. WebContainer runs in-browser (WASM), so it doesn't have network connectivity issues like E2B.
- HMR preservation means the WebContainer survives code changes during development.

---

## 6. Key Files Summary

| File | Purpose |
|------|---------|
| `app/lib/webcontainer/index.ts` | Boot WebContainer singleton, SSR guard, HMR preservation |
| `app/lib/webcontainer/auth.client.ts` | Re-export auth API for client-only imports |
| `app/lib/runtime/action-runner.ts` | Execute file writes, shell commands, build, start actions |
| `app/lib/runtime/message-parser.ts` | Parse `<boltArtifact>` and `<boltAction>` tags from LLM stream |
| `app/lib/stores/workbench.ts` | Central orchestrator: ties ActionRunner, FilesStore, PreviewsStore, TerminalStore |
| `app/lib/stores/previews.ts` | Listen for `server-ready`/`port` events, manage preview URLs, cross-tab sync |
| `app/lib/stores/files.ts` | File state management, WebContainer FS watcher, file CRUD |
| `app/lib/stores/terminal.ts` | Shell process management, terminal attachment |
| `app/utils/shell.ts` | `BoltShell` class, `newShellProcess()`, command execution |
| `app/components/workbench/Preview.tsx` | Preview iframe UI, device mode, responsive simulation |
| `app/routes/webcontainer.preview.$id.tsx` | Standalone preview route for separate windows |
| `app/routes/webcontainer.connect.$id.tsx` | WebContainer connect endpoint (loads connect.js from CDN) |

---

## 7. How Streaming LLM Output Gets Written to WebContainer in Real-Time

The complete data flow:

```
LLM SSE stream
    |
    v
StreamingMessageParser.parse(messageId, chunk)
    |
    |-- Detects <boltArtifact> open tag
    |     -> callbacks.onArtifactOpen() -> workbenchStore.addArtifact()
    |        Creates ActionRunner with webcontainer promise
    |
    |-- Detects <boltAction type="file" filePath="..."> open tag
    |     -> callbacks.onActionOpen() -> workbenchStore.addAction()
    |        Queues action in ActionRunner
    |
    |-- While inside file action, accumulates content
    |     -> callbacks.onActionStream() -> workbenchStore.runAction(data, isStreaming=true)
    |        ActionRunner.runAction() with isStreaming=true:
    |          - Only executes for type="file" (shell/start wait for close)
    |          - Calls #runFileAction() which writes partial content to WebContainer
    |          - Vite HMR picks up the file change and hot-reloads the preview
    |
    |-- Detects </boltAction> close tag
    |     -> callbacks.onActionClose() -> workbenchStore.runAction(data, isStreaming=false)
    |        Final write with complete content
    |
    |-- Detects </boltArtifact> close tag
    |     -> callbacks.onArtifactClose()
```

**Critical detail for streaming file writes:** The `runAction` method uses a sampler (`actionStreamSampler`) for streaming updates to avoid flooding the WebContainer FS with writes on every token. File actions during streaming (`isStreaming=true`) are the ONLY action type that executes during streaming -- shell and start actions wait until the action tag closes.

The `workbenchStore` uses a global execution queue (`#globalExecutionQueue`) to serialize all actions, preventing race conditions between concurrent file writes and shell commands.

---

## 8. Comparison with Our E2B Approach

| Aspect | bolt.diy (WebContainer) | Bridges (E2B) |
|--------|------------------------|---------------|
| **Runtime** | In-browser WASM | Remote Docker sandbox |
| **Latency** | Near-zero (local FS) | Network round-trip per file write |
| **Preview** | Same-origin iframe via credentialless COEP | E2B proxy URL (`*.e2b.app`) |
| **Cost** | Free (runs in user's browser) | Per-minute billing |
| **HMR** | Native Vite HMR (files are local) | Must wait for network write + Vite reload |
| **Streaming writes** | Can write on every LLM token (sampled) | Too slow for per-token writes |
| **Shell** | Full JSH shell with terminal | SSH-like commands via E2B API |
| **Limitations** | No native binaries, limited Node.js APIs | Full Linux environment |
| **Cleanup** | Automatic (browser tab close) | Must explicitly close sandbox |
| **State persistence** | None built-in (in-memory per session) | Survives within sandbox lifetime |

---

## 9. Architecture Diagram for Our Refactor

```
                    Next.js App (Client)
                    ============================

    Chat UI          WebContainer (WASM)         Preview Panel
    -------          -------------------         -------------
    |               |                   |        |
    | SSE stream    | boot() once       |        | <iframe>
    |               | coep:credentialless|        | src={previewUrl}
    v               v                   |        |
    StreamParser --> ActionRunner ------>|        |
    |               |                   |        |
    | onActionOpen  | #runFileAction:   |        |
    | onActionStream|   fs.mkdir()      |        |
    | onActionClose |   fs.writeFile()  |        |
    |               |                   |        |
    | onActionOpen  | #runShellAction:  |        |
    | (type=shell)  |   BoltShell.exec()|        |
    |               |   spawn('/bin/jsh')|       |
    |               |                   |        |
    |               | Events:           |        |
    |               |   server-ready -->|------->| setIframeUrl()
    |               |   port (open) --->|------->|
    |               |   preview-message>|        | Error alerts
    |               |                   |        |
    FilesStore <----|-- watchPaths() ---|        |
    (nanostores)    |   (100ms buffer) |        |
                    ============================
```

---

## 10. What We Need to Implement for Bridges

### Must-have files:
1. **`src/lib/webcontainer/index.ts`** -- Boot singleton, SSR guard
2. **`src/lib/stores/previews.ts`** -- Listen for `server-ready`/`port`, manage preview URLs
3. **`src/lib/stores/files.ts`** -- File map synced with WebContainer via `watchPaths`
4. **`src/lib/runtime/action-runner.ts`** -- Execute file writes and shell commands against WebContainer
5. **`src/lib/runtime/message-parser.ts`** -- Parse artifact/action tags from our LLM stream (or adapt our existing streaming format)
6. **`src/features/builder/components/Preview.tsx`** -- iframe showing WebContainer preview URL

### Key differences from bolt.diy:
- Our LLM runs in Convex (server-side), not a Remix route. The streaming format needs to match.
- We write only `src/App.tsx` (single file), not a full project. Much simpler action runner.
- Our therapy design system CSS is pre-built (no `npm install` needed if we pre-install deps in WebContainer).
- We can potentially skip the terminal UI entirely for v1.

### Package to install:
```
npm install @webcontainer/api
```

### COEP requirement:
WebContainer requires cross-origin isolation. With `coep: 'credentialless'`, the page must serve:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```
These headers must be set in `next.config.ts` or via middleware.
