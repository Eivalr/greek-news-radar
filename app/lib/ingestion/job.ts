import { RefreshSnapshot } from "@/app/lib/domain";
import { dedupeEnrichedArticles } from "@/app/lib/ingestion/dedupe";
import { discoverCandidates, extractArticle } from "@/app/lib/ingestion/fetch";
import { toEnrichedArticle } from "@/app/lib/ingestion/transform";

let runningPromise: Promise<RefreshSnapshot> | null = null;

let lastSnapshot: RefreshSnapshot = {
  status: "IDLE",
  mode: "idle",
  startedAt: null,
  finishedAt: null,
  message: "Δεν έχει γίνει ακόμα ανανέωση.",
  stats: { scanned: 0, accepted: 0, deduped: 0 },
  rows: []
};

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];

  async function consume() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) break;
      await worker(item);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => consume()));
}

export async function runRefreshJob(mode: string = "manual"): Promise<RefreshSnapshot> {
  if (runningPromise) return runningPromise;

  const startedAt = new Date();

  lastSnapshot = {
    ...lastSnapshot,
    status: "RUNNING",
    mode,
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    message: "Σε εξέλιξη ανανέωση...",
    error: undefined
  };

  runningPromise = (async () => {
    let scanned = 0;
    const enrichedRows: ReturnType<typeof toEnrichedArticle>[] = [];

    try {
      const candidates = (await discoverCandidates()).slice(0, 180);

      await runWithConcurrency(candidates, 5, async (candidate) => {
        scanned += 1;
        const extracted = await extractArticle(candidate);
        if (!extracted) return;
        enrichedRows.push(toEnrichedArticle(extracted));
      });

      const deduped = dedupeEnrichedArticles(enrichedRows);
      const sorted = deduped.rows
        .sort((a, b) => b.impactScore - a.impactScore || b.publishedAt.getTime() - a.publishedAt.getTime())
        .slice(0, 180)
        .map((row) => ({
          ...row,
          publishedAt: row.publishedAt.toISOString(),
          fetchedAt: row.fetchedAt.toISOString()
        }));

      lastSnapshot = {
        status: "COMPLETED",
        mode,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        message: `Επεξεργασία ${scanned} υποψηφίων ειδήσεων`,
        stats: {
          scanned,
          accepted: sorted.length,
          deduped: deduped.deduped
        },
        rows: sorted
      };

      return lastSnapshot;
    } catch (error) {
      lastSnapshot = {
        ...lastSnapshot,
        status: "FAILED",
        mode,
        finishedAt: new Date().toISOString(),
        message: "Αποτυχία ανανέωσης",
        error: error instanceof Error ? error.message : "Unknown error",
        stats: {
          scanned,
          accepted: 0,
          deduped: 0
        }
      };

      return lastSnapshot;
    } finally {
      runningPromise = null;
    }
  })();

  return runningPromise;
}

export async function ensureSnapshot(): Promise<RefreshSnapshot> {
  if (lastSnapshot.rows.length > 0) return lastSnapshot;
  return runRefreshJob("auto");
}

export function getSnapshot(): RefreshSnapshot {
  return lastSnapshot;
}
