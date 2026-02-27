import { Category, Prisma, Source } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { daysAgo } from "@/app/lib/utils/time";

export type ArticleFilters = {
  from?: Date;
  to?: Date;
  search?: string;
  category?: Category;
  source?: Source;
  minImpact?: number;
  tags?: string[];
  view?: "today" | "brief" | "archive";
};

export async function getArticles(filters: ArticleFilters) {
  const where: Prisma.ArticleWhereInput = {
    publishedAt: {
      gte: filters.from ?? daysAgo(30),
      lte: filters.to ?? new Date()
    },
    impactScore: {
      gte: filters.minImpact ?? 0
    }
  };

  if (filters.category) where.category = filters.category;
  if (filters.source) where.source = filters.source;
  if (filters.search?.trim()) {
    where.OR = [
      { title: { contains: filters.search.trim() } },
      { summaryEl: { contains: filters.search.trim() } },
      { scoreRationale: { contains: filters.search.trim() } }
    ];
  }

  const rows = await prisma.article.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { impactScore: "desc" }],
    take: filters.view === "brief" ? 120 : 300
  });

  const filteredByTag = (filters.tags?.length ?? 0) > 0
    ? rows.filter((row) => {
        const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
        return filters.tags!.every((tag) => tags.includes(tag));
      })
    : rows;

  if (filters.view === "brief") {
    return filteredByTag
      .sort((a, b) => b.impactScore - a.impactScore || b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, 5);
  }

  if (filters.view === "today") {
    const byCategory = new Map<Category, typeof filteredByTag>();

    for (const item of filteredByTag) {
      const list = byCategory.get(item.category) ?? [];
      list.push(item);
      byCategory.set(item.category, list);
    }

    const selected = Array.from(byCategory.values())
      .flatMap((items) =>
        items
          .sort((a, b) => {
            const scoreDelta = b.impactScore - a.impactScore;
            if (scoreDelta !== 0) return scoreDelta;
            return b.publishedAt.getTime() - a.publishedAt.getTime();
          })
          .slice(0, 3)
      )
      .sort((a, b) => b.impactScore - a.impactScore);

    return selected.slice(0, 15);
  }

  return filteredByTag;
}

export async function getLastRefresh() {
  return prisma.refreshRun.findFirst({
    orderBy: {
      startedAt: "desc"
    }
  });
}
