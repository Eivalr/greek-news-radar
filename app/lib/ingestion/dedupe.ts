import { EnrichedArticle } from "@/app/lib/types";
import { titleSimilarity } from "@/app/lib/utils/text";

export function dedupeEnrichedArticles(rows: EnrichedArticle[]): { rows: EnrichedArticle[]; deduped: number } {
  const accepted: EnrichedArticle[] = [];
  const byUrl = new Set<string>();
  let deduped = 0;

  const sorted = [...rows].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  for (const item of sorted) {
    if (byUrl.has(item.url)) {
      deduped += 1;
      continue;
    }

    const hasNearDuplicate = accepted.some((existing) => {
      const within48h =
        Math.abs(existing.publishedAt.getTime() - item.publishedAt.getTime()) <= 48 * 60 * 60 * 1000;
      if (!within48h) return false;
      if (existing.contentHash === item.contentHash) return true;
      return titleSimilarity(existing.title, item.title) >= 0.82;
    });

    if (hasNearDuplicate) {
      deduped += 1;
      continue;
    }

    byUrl.add(item.url);
    accepted.push(item);
  }

  return { rows: accepted, deduped };
}
