import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  NEWS_REFRESH_CRON: z.string().default("0 9 * * *"),
  NEWS_REFRESH_TIMEZONE: z.string().default("Europe/Athens"),
  CRON_SHARED_SECRET: z.string().optional(),
  SCHEDULER_ENABLED: z.string().default("true"),
  SCHEDULER_MODE: z.enum(["node-cron", "external"]).default("node-cron"),
  INGESTION_LOOKBACK_HOURS: z.coerce.number().int().positive().default(36)
});

export const env = envSchema.parse(process.env);

export const schedulerEnabled = env.SCHEDULER_ENABLED.toLowerCase() === "true";
