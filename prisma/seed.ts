import { runRefreshJob } from "../app/lib/ingestion/job";

async function main() {
  const result = await runRefreshJob("seed");
  // eslint-disable-next-line no-console
  console.log("Seed completed", result);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
