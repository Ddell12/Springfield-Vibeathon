// Node.js LiveKit Agents entrypoint MUST use defineAgent({ entry }) as the
// default export — this is the hook LiveKit Cloud uses to dispatch jobs.
// A named export or plain function will not be registered as a worker.
import { defineAgent, type JobContext } from "@livekit/agents";

export default defineAgent({
  entry: async (_ctx: JobContext) => {
    // Full session wired in Task 6. Stub satisfies the module boundary.
  },
});
