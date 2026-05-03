import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const CRON_DEFAULT = "*/15 * * * *";
const cronEnv = process.env.CALENDAR_SYNC_CRON ?? CRON_DEFAULT;

// A valid cron expression has exactly 5 whitespace-separated fields.
const isValidCron = (expr: string) => /^\S+(\s+\S+){4}$/.test(expr.trim());

const effectiveCron = isValidCron(cronEnv) ? cronEnv : CRON_DEFAULT;

if (!isValidCron(cronEnv)) {
  console.warn(
    `CALENDAR_SYNC_CRON "${cronEnv}" is not a valid cron expression — falling back to "${CRON_DEFAULT}"`,
  );
}

const crons = cronJobs();

// Fan out a sync job per non-native calendar connection.
// Native (on-device) connections are pushed by the client and skipped here.
crons.cron(
  "sync external calendars",
  effectiveCron,
  internal.calendars.scheduler.syncAllConnections,
  {},
);

export default crons;
