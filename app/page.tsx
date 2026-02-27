import { Dashboard } from "@/app/components/dashboard";
import { seedIfEmpty } from "@/app/lib/ingestion/job";
import { startScheduler } from "@/app/lib/ingestion/scheduler";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  startScheduler();
  await seedIfEmpty();
  return <Dashboard />;
}
