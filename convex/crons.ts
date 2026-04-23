import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

// Every 15 minutes, fan out a sync job per Google / iCal calendar connection.
// Apple calendars are skipped (events live on-device; the client pushes them).
crons.interval(
  "sync external calendars",
  { minutes: 15 },
  internal.calendars.scheduler.syncAllConnections,
  {},
);

export default crons;
