import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

// Sweep expired developer test data nightly at 6 AM UTC
crons.cron(
  "sweep expired developer test data",
  "0 6 * * *",
  internal.testData.sweepExpiredRecords,
  {},
);

export default crons;
