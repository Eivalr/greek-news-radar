import { Category, Confidence } from "@prisma/client";
import { EnrichedArticle, ExtractedArticle } from "@/app/lib/types";
import {
  buildImpacts,
  buildSummaryEl,
  classifyCategory,
  deriveTags,
  impactScoreFromContent
} from "@/app/lib/utils/analysis";
import { compact, computeHash } from "@/app/lib/utils/text";

function confidenceFromContent(current: Confidence, accessibleText: string): Confidence {
  if (accessibleText.length > 1300) return Confidence.HIGH;
  if (current === Confidence.LOW && accessibleText.length > 300) return Confidence.MED;
  return current;
}

function trimBullets(input: string): string {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join("\n");
}

export function toEnrichedArticle(item: ExtractedArticle): EnrichedArticle {
  const category: Category = classifyCategory(item.title, `${item.accessibleText} ${item.snippet}`);
  const summaryEl = buildSummaryEl(item.title, item.accessibleText, item.snippet);
  const confidence = confidenceFromContent(item.confidence, item.accessibleText);
  const impacts = buildImpacts(summaryEl, item.snippet, category, confidence);
  const score = impactScoreFromContent(category, item.publishedAt, `${item.title} ${summaryEl} ${item.accessibleText}`);
  const tags = deriveTags(item.title, summaryEl, category);

  return {
    source: item.source,
    url: item.url,
    title: compact(item.title, 220),
    publishedAt: item.publishedAt,
    category,
    summaryEl: compact(summaryEl, 430),
    impactGreece: trimBullets(impacts.impactGreece),
    impactBusiness: trimBullets(impacts.impactBusiness),
    impactPersonal: trimBullets(impacts.impactPersonal),
    impactScore: score.score,
    scoreRationale: compact(score.rationale, 160),
    tags,
    confidence,
    fetchedAt: new Date(),
    contentHash: computeHash([item.title, item.accessibleText || item.snippet])
  };
}
