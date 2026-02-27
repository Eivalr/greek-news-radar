import cron from "node-cron";
import { env, schedulerEnabled } from "@/app/lib/config";
import { runRefreshJob } from "@/app/lib/ingestion/job";

declare global {
  // eslint-disable-next-line no-var
  var __radarSchedulerStarted: boolean | undefined;
}

export function startScheduler() {
  if (!schedulerEnabled || env.SCHEDULER_MODE !== "node-cron") return;
  if (global.__radarSchedulerStarted) return;

  global.__radarSchedulerStarted = true;

  cron.schedule(
    env.NEWS_REFRESH_CRON,
    async () => {
      try {
        await runRefreshJob("scheduled");
      } catch {
        // Ignore scheduler errors; failures are stored in RefreshRun.
      }
    },
    { timezone: env.NEWS_REFRESH_TIMEZONE }
  );
}
