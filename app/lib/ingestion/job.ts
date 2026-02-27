import { prisma } from "@/app/lib/db/prisma";
import { findNearDuplicate } from "@/app/lib/ingestion/dedupe";
import { discoverCandidates, extractArticle } from "@/app/lib/ingestion/fetch";
import { toEnrichedArticle } from "@/app/lib/ingestion/transform";
import { RefreshStats } from "@/app/lib/types";

let runLock = false;

async function upsertArticle(item: ReturnType<typeof toEnrichedArticle>): Promise<"inserted" | "updated"> {
  const existing = await prisma.article.findUnique({ where: { url: item.url } });

  if (!existing) {
    await prisma.article.create({
      data: {
        ...item,
        tags: item.tags
      }
    });
    return "inserted";
  }

  await prisma.article.update({
    where: { id: existing.id },
    data: {
      ...item,
      tags: item.tags
    }
  });

  return "updated";
}

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

export async function runRefreshJob(mode: string = "manual") {
  if (runLock) {
    return { skipped: true, reason: "refresh already running" };
  }

  runLock = true;

  const refresh = await prisma.refreshRun.create({
    data: {
      status: "RUNNING",
      mode
    }
  });

  const stats: RefreshStats = {
    scanned: 0,
    inserted: 0,
    updated: 0,
    deduped: 0
  };

  try {
    const candidates = await discoverCandidates();
    const limited = candidates.slice(0, 180);

    await runWithConcurrency(limited, 5, async (candidate) => {
      stats.scanned += 1;

      const extracted = await extractArticle(candidate);
      if (!extracted) return;

      const enriched = toEnrichedArticle(extracted);
      const nearDuplicate = await findNearDuplicate(enriched);

      if (nearDuplicate && nearDuplicate.url !== enriched.url) {
        stats.deduped += 1;
        return;
      }

      const result = await upsertArticle(enriched);
      if (result === "inserted") stats.inserted += 1;
      if (result === "updated") stats.updated += 1;
    });

    await prisma.refreshRun.update({
      where: { id: refresh.id },
      data: {
        status: "COMPLETED",
        message: `Processed ${stats.scanned} candidates`,
        scanned: stats.scanned,
        inserted: stats.inserted,
        updated: stats.updated,
        deduped: stats.deduped,
        finishedAt: new Date()
      }
    });

    return {
      refreshId: refresh.id,
      ...stats,
      skipped: false
    };
  } catch (error) {
    await prisma.refreshRun.update({
      where: { id: refresh.id },
      data: {
        status: "FAILED",
        message: "Refresh failed",
        error: error instanceof Error ? error.message : "Unknown error",
        scanned: stats.scanned,
        inserted: stats.inserted,
        updated: stats.updated,
        deduped: stats.deduped,
        finishedAt: new Date()
      }
    });

    throw error;
  } finally {
    runLock = false;
  }
}

export async function seedIfEmpty() {
  const count = await prisma.article.count();
  if (count > 0) return { seeded: false };

  const result = await runRefreshJob("bootstrap");
  return { seeded: true, result };
}
