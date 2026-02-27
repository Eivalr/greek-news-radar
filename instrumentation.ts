import { startScheduler } from "@/app/lib/ingestion/scheduler";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    startScheduler();
  }
}
