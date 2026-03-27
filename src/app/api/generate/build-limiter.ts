/**
 * Module-level semaphore that limits concurrent esbuild child processes.
 * Prevents OOM when multiple users generate simultaneously. Requests that
 * can't acquire a slot within QUEUE_TIMEOUT_MS get a "server busy" error.
 */

const MAX_CONCURRENT = 2;
const QUEUE_TIMEOUT_MS = 30_000;

let active = 0;

interface QueueEntry {
  resolve: (release: () => void) => void;
  reject: (err: Error) => void;
}

const queue: QueueEntry[] = [];

function createRelease(): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    active--;
    const next = queue.shift();
    if (next) {
      active++;
      next.resolve(createRelease());
    }
  };
}

export async function acquireBuildSlot(): Promise<() => void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return createRelease();
  }

  return new Promise<() => void>((resolve, reject) => {
    const entry: QueueEntry = { resolve, reject };

    const timer = setTimeout(() => {
      const idx = queue.indexOf(entry);
      if (idx >= 0) queue.splice(idx, 1);
      reject(new Error("Server busy — too many concurrent builds. Please try again in a moment."));
    }, QUEUE_TIMEOUT_MS);

    entry.resolve = (release) => {
      clearTimeout(timer);
      resolve(release);
    };

    queue.push(entry);
  });
}
