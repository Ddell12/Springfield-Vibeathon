/**
 * Module-level semaphore that limits concurrent esbuild child processes.
 * Prevents OOM when multiple users generate simultaneously. Requests that
 * can't acquire a slot within QUEUE_TIMEOUT_MS get a "server busy" error.
 *
 * Uses globalThis to survive HMR in development — prevents slots from leaking
 * when the module hot-reloads mid-build.
 */

const MAX_CONCURRENT = 2;
const QUEUE_TIMEOUT_MS = 30_000;
const STALE_TIMEOUT_MS = 60_000;

interface QueueEntry {
  resolve: (release: () => void) => void;
  reject: (err: Error) => void;
}

interface BuildLimiterState {
  active: number;
  queue: QueueEntry[];
  lastActivity: number;
}

// Survive HMR: store state on globalThis so hot-reloads don't leak slots
const g = globalThis as unknown as { __buildLimiter?: BuildLimiterState };
g.__buildLimiter ??= { active: 0, queue: [], lastActivity: Date.now() };
const state = g.__buildLimiter;

function createRelease(): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.active--;
    state.lastActivity = Date.now();
    const next = state.queue.shift();
    if (next) {
      state.active++;
      state.lastActivity = Date.now();
      next.resolve(createRelease());
    }
  };
}

// Periodic stale-slot recovery: if active > 0 but queue empty for > STALE_TIMEOUT_MS,
// a build likely leaked its slot (e.g., process crash or HMR during active build)
setInterval(() => {
  if (
    state.active > 0 &&
    state.queue.length === 0 &&
    Date.now() - state.lastActivity > STALE_TIMEOUT_MS
  ) {
    console.warn(`[build-limiter] Resetting ${state.active} stale slot(s)`);
    state.active = 0;
  }
}, STALE_TIMEOUT_MS);

export async function acquireBuildSlot(): Promise<() => void> {
  state.lastActivity = Date.now();

  if (state.active < MAX_CONCURRENT) {
    state.active++;
    return createRelease();
  }

  return new Promise<() => void>((resolve, reject) => {
    const entry: QueueEntry = { resolve, reject };

    const timer = setTimeout(() => {
      const idx = state.queue.indexOf(entry);
      if (idx >= 0) state.queue.splice(idx, 1);
      reject(new Error("Server busy — too many concurrent builds. Please try again in a moment."));
    }, QUEUE_TIMEOUT_MS);

    entry.resolve = (release) => {
      clearTimeout(timer);
      resolve(release);
    };

    state.queue.push(entry);
  });
}
