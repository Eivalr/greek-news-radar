"use client";

import type { Article } from "@prisma/client";

type Props = {
  article: Article;
};

function renderBullets(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function confidenceLabel(confidence: string): string {
  if (confidence === "HIGH") return "High";
  if (confidence === "MED") return "Med";
  return "Low";
}

export function ArticleCard({ article }: Props) {
  const tags = Array.isArray(article.tags) ? article.tags.map(String) : [];

  return (
    <article className="rounded-xl border border-radar-foam bg-white/95 p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <a
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className="text-base font-semibold text-radar-sea underline-offset-4 hover:underline"
        >
          {article.title}
        </a>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-radar-sea px-2 py-0.5 text-xs font-semibold text-white">
            {article.impactScore}
          </span>
          <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-600">
            {confidenceLabel(article.confidence)}
          </span>
        </div>
      </div>

      <p className="mb-2 text-xs text-slate-500">
        {article.source} | {new Date(article.publishedAt).toLocaleString("el-GR")}
      </p>

      <p className="mb-3 text-sm text-slate-800">{article.summaryEl}</p>

      <div className="grid gap-3 text-sm md:grid-cols-3">
        <div>
          <p className="mb-1 font-semibold text-slate-900">Impact: Greece</p>
          <ul className="space-y-1 text-slate-700">
            {renderBullets(article.impactGreece).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-semibold text-slate-900">Impact: Business</p>
          <ul className="space-y-1 text-slate-700">
            {renderBullets(article.impactBusiness).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-semibold text-slate-900">Impact: Personal</p>
          <ul className="space-y-1 text-slate-700">
            {renderBullets(article.impactPersonal).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={`${article.id}-${tag}`}
            className="rounded-full bg-radar-foam px-2 py-1 text-xs font-medium text-radar-ink"
          >
            #{tag}
          </span>
        ))}
      </div>
    </article>
  );
}
