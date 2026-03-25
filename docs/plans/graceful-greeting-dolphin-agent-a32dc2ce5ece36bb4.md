# WebContainer API Analysis

Source repos analyzed:
- `stackblitz/webcontainer-core` (10 files, 3,752 tokens) -- mostly CI/issue templates, not the actual source
- `stackblitz/webcontainer-docs` (165 files, 234,314 tokens) -- full API docs, guides, tutorials
- `stackblitz/webcontainer-api-starter` (10 files, 3,420 tokens) -- working example app

The `@webcontainer/api` npm package is closed-source. The public repos contain documentation and examples only. The actual runtime is distributed as a compiled npm package.

---

## 1. Booting a WebContainer Instance

```ts
import { WebContainer } from '@webcontainer/api';

// Only ONE instance can exist at a time
const wc = await WebContainer.boot({
  coep?: 'require-corp' | 'credentialless' | 'none',  // COEP header mode
  workdirName?: string,       // cosmetic folder name
  forwardPreviewErrors?: boolean | 'exceptions-only',  // capture iframe errors
});
```

Key constraints:
- **Singleton**: Only one WebContainer can be booted concurrently. Call `teardown()` before booting another.
- **Expensive**: Booting is heavy -- do it once, reuse the instance.
- `coep` is locked on first boot and cannot change on reboots.
- `coep: 'none'` only works on Chromium with Origin Trial.

To destroy and reclaim resources:
```ts
wc.teardown(); // makes instance and all derived entities unusable
// Now you can boot() again
```

### Properties on the instance
- `wc.fs` -- FileSystemAPI (see below)
- `wc.path` -- default PATH env var for spawned processes
- `wc.workdir` -- full path to the working directory

---

## 2. File System API

### Mounting a file tree (bulk)

```ts
await wc.mount(tree);                              // mount at workdir root
await wc.mount(tree, { mountPoint: '/subdir' });   // mount at specific path
await wc.mount(binarySnapshot);                    // Uint8Array from @webcontainer/snapshot
```

### Individual file operations (modeled after `fs.promises`)

```ts
// Write
await wc.fs.writeFile('/src/App.tsx', 'export default ...');
await wc.fs.writeFile('/binary.png', uint8Array);

// Read
const content = await wc.fs.readFile('/package.json', 'utf-8'); // string
const bytes   = await wc.fs.readFile('/image.png');              // Uint8Array

// Directory
await wc.fs.mkdir('/src/components', { recursive: true });
const entries = await wc.fs.readdir('/src');
const dirents = await wc.fs.readdir('/src', { withFileTypes: true });

// Delete
await wc.fs.rm('/src/old.js');
await wc.fs.rm('/dist', { recursive: true });

// Rename
await wc.fs.rename('/src/index.js', '/src/main.js');

// Watch
const watcher = wc.fs.watch('/src', { recursive: true }, (event, filename) => {
  console.log(event, filename); // 'rename' | 'change'
});
watcher.close();
```

### Exporting (v1.4.0+)

```ts
const tree = await wc.export('dist', { format: 'json' });         // FileSystemTree
const zip  = await wc.export('dist', { format: 'zip' });          // Uint8Array
const bin  = await wc.export('.', { format: 'binary', excludes: ['node_modules/**'] });
```

---

## 3. FileSystemTree Structure

```ts
interface FileSystemTree {
  [name: string]: FileNode | SymlinkNode | DirectoryNode;
}

interface FileNode {
  file: { contents: string | Uint8Array };
}

interface SymlinkNode {
  file: { symlink: string };
}

interface DirectoryNode {
  directory: FileSystemTree;  // recursive nesting
}
```

Example:

```ts
const files: FileSystemTree = {
  'package.json': {
    file: {
      contents: JSON.stringify({
        name: 'my-app',
        type: 'module',
        dependencies: { vite: 'latest', react: 'latest' },
        scripts: { dev: 'vite' }
      }),
    },
  },
  src: {
    directory: {
      'App.tsx': {
        file: { contents: 'export default function App() { return <h1>Hello</h1> }' },
      },
      'main.tsx': {
        file: { contents: 'import App from "./App";\n...' },
      },
    },
  },
  'index.html': {
    file: { contents: '<!DOCTYPE html>...' },
  },
};
```

---

## 4. Running Commands (spawn)

```ts
const process = await wc.spawn('npm', ['install'], {
  cwd?: string,                              // relative to workdir
  env?: Record<string, string | number | boolean>,
  output?: boolean,                          // false to suppress output stream
  terminal?: { cols: number; rows: number }, // pseudo-terminal size
});
```

### Process object (WebContainerProcess)

```ts
// Stream stdout/stderr
process.output.pipeTo(new WritableStream({
  write(data) { console.log(data); }
}));

// Wait for exit
const exitCode = await process.exit;  // Promise<number>

// Write to stdin
const writer = process.input.getWriter();
await writer.write('some input\n');

// Kill
process.kill();

// Resize terminal
process.resize({ cols: 120, rows: 40 });
```

### Typical command sequence for a Vite app

```ts
// 1. Install deps
const install = await wc.spawn('npm', ['install']);
const installCode = await install.exit;

// 2. Start dev server
await wc.spawn('npm', ['run', 'dev']);

// 3. Listen for server ready
wc.on('server-ready', (port, url) => {
  iframe.src = url;  // <-- this is the preview URL
});
```

---

## 5. Getting the Preview URL

There are two event types for detecting running servers:

```ts
// server-ready: fires when a server is ready to receive traffic
wc.on('server-ready', (port: number, url: string) => {
  // url is the full preview URL you set as iframe.src
  iframeElement.src = url;
});

// port: fires on port open/close
wc.on('port', (port: number, type: 'open' | 'close', url: string) => {
  // more granular port tracking
});
```

To reload a preview iframe:
```ts
import { reloadPreview } from '@webcontainer/api/utils';
await reloadPreview(iframeElement, 200); // 200ms hard refresh timeout
```

### Other events

```ts
wc.on('error', (error: { message: string }) => { ... });

// If forwardPreviewErrors enabled:
wc.on('preview-message', (msg: PreviewMessage) => {
  // msg.type: 'UncaughtException' | 'UnhandledRejection' | 'ConsoleError'
  // msg.port, msg.pathname, msg.previewId
});
```

---

## 6. Limitations and Browser Requirements

### Hard requirements

1. **SharedArrayBuffer** must be available -- this is the foundation of the runtime
2. **Cross-origin isolation** headers must be set on the page:
   ```
   Cross-Origin-Embedder-Policy: require-corp
   Cross-Origin-Opener-Policy: same-origin
   ```
   Or for credentialless mode (Chromium only):
   ```
   Cross-Origin-Embedder-Policy: credentialless
   Cross-Origin-Opener-Policy: same-origin
   ```
3. **HTTPS required** in production (localhost is exempt in development)

### Browser support matrix

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome / Chromium | Full support | Blocking 3rd-party cookies can break it |
| Edge | Full support | Chromium-based |
| Brave | Supported with config | Aggressive blocking needs to be relaxed |
| Firefox | Alpha | Cross-origin isolation limitations; preview server may not embed properly |
| Safari 16.4+ TP | Beta | Older versions lack `Atomics.waitAsync` and lookbehind regex |
| Mobile browsers | Not supported | Desktop only |

### Architecture limitations

- **Singleton**: Only one WebContainer instance at a time per page
- **Node.js only**: Runs Node.js in the browser -- no native addons, no `child_process.exec` with native binaries
- **In-browser**: Everything runs client-side; no real OS-level access
- **Cookie blockers**: Browser extensions or built-in cookie blocking can prevent WebContainer from working
- **V8 compatibility**: Best compatibility on Chromium since Node.js itself runs on V8; Firefox/Safari may have minor runtime differences
- **M1 Mac Chrome regression**: Known performance issue on M1 Macs in Chrome (Chromium bugs 1228686 and 1356099)

### Vite config for development

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
});
```

### Vercel deployment headers

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" }
      ]
    }
  ]
}
```

---

## 7. Commercial Usage

- Free for open source projects (apply via form)
- Commercial/for-profit use requires an API key via `configureAPIKey()`
- `configureAPIKey()` must be called BEFORE `WebContainer.boot()`
- Enterprise tier available for security-conscious orgs

```ts
import { WebContainer, configureAPIKey } from '@webcontainer/api';

configureAPIKey('your-key-here');  // MUST be before boot()
const wc = await WebContainer.boot();
```

---

## 8. Complete Working Example (from starter repo)

```ts
import { WebContainer } from '@webcontainer/api';

const files = {
  'index.js': {
    file: {
      contents: `
        import express from 'express';
        const app = express();
        app.get('/', (req, res) => res.send('Hello!'));
        app.listen(3111);
      `,
    },
  },
  'package.json': {
    file: {
      contents: JSON.stringify({
        name: 'example-app',
        type: 'module',
        dependencies: { express: 'latest', nodemon: 'latest' },
        scripts: { start: 'nodemon index.js' },
      }),
    },
  },
};

let wc;

window.addEventListener('load', async () => {
  wc = await WebContainer.boot();
  await wc.mount(files);

  // Install
  const install = await wc.spawn('npm', ['install']);
  install.output.pipeTo(new WritableStream({ write: console.log }));
  const code = await install.exit;
  if (code !== 0) throw new Error('Install failed');

  // Start server
  await wc.spawn('npm', ['run', 'start']);
  wc.on('server-ready', (port, url) => {
    document.querySelector('iframe').src = url;
  });
});

// Live file updates
textarea.addEventListener('input', (e) => {
  wc.fs.writeFile('/index.js', e.currentTarget.value);
});
```

---

## Relevance to Bridges

WebContainer could be an alternative to E2B for the sandbox runtime. Key trade-offs vs E2B:

| Factor | WebContainer | E2B |
|--------|-------------|-----|
| Runtime location | Client-side (browser) | Server-side (cloud VM) |
| Cost | Free for OSS, paid for commercial | Per-sandbox-minute pricing |
| Latency | Zero network latency | Network round-trip for each operation |
| Node.js support | Full (in-browser WASM) | Full (real Linux container) |
| Native binaries | No | Yes |
| Browser requirements | COEP/COOP headers, SharedArrayBuffer | None (server-side) |
| Mobile support | Desktop only | Any client (server does the work) |
| Persistence | Client-side only (export/import) | Server-side storage |
| Template system | Mount FileSystemTree | Docker-based templates |
| Singleton limit | One per page | Unlimited concurrent sandboxes |

For Bridges, E2B remains the better choice because:
1. Mobile/tablet users (therapists, parents) need it to work everywhere
2. No COEP/COOP header complexity on Vercel
3. Generated tools need server-side persistence and sharing
4. E2B custom templates (vite-therapy) are already working

WebContainer would be interesting for a "local preview" mode or offline capability in the future.
