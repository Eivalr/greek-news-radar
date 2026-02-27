import { z } from "zod";

const envSchema = z.object({
  INGESTION_LOOKBACK_HOURS: z.coerce.number().int().positive().default(36)
});

export const env = envSchema.parse(process.env);
