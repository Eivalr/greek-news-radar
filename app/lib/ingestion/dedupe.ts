import { Article } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { EnrichedArticle } from "@/app/lib/types";
import { titleSimilarity } from "@/app/lib/utils/text";

export async function findNearDuplicate(item: EnrichedArticle): Promise<Article | null> {
  const from = new Date(item.publishedAt.getTime() - 48 * 60 * 60 * 1000);
  const to = new Date(item.publishedAt.getTime() + 48 * 60 * 60 * 1000);

  const candidates = await prisma.article.findMany({
    where: {
      publishedAt: {
        gte: from,
        lte: to
      },
      OR: [{ contentHash: item.contentHash }, { source: { not: item.source } }]
    },
    select: {
      id: true,
      title: true,
      contentHash: true,
      publishedAt: true,
      source: true,
      url: true,
      category: true,
      summaryEl: true,
      impactGreece: true,
      impactBusiness: true,
      impactPersonal: true,
      impactScore: true,
      scoreRationale: true,
      tags: true,
      confidence: true,
      fetchedAt: true,
      createdAt: true,
      updatedAt: true
    },
    take: 80,
    orderBy: {
      publishedAt: "desc"
    }
  });

  for (const candidate of candidates) {
    if (candidate.url === item.url) return candidate;
    if (candidate.contentHash === item.contentHash) return candidate;

    const similarity = titleSimilarity(candidate.title, item.title);
    if (similarity >= 0.82) {
      return candidate;
    }
  }

  return null;
}
