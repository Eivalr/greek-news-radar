import { Category, Confidence, Source } from "@prisma/client";

export type SourceConfig = {
  source: Source;
  baseUrl: string;
  domain: string;
  feeds: string[];
  sections: string[];
};

export type RawArticleCandidate = {
  source: Source;
  url: string;
  title?: string;
  publishedAt?: Date;
};

export type ExtractedArticle = {
  source: Source;
  url: string;
  title: string;
  publishedAt: Date;
  accessibleText: string;
  snippet: string;
  confidence: Confidence;
};

export type EnrichedArticle = {
  source: Source;
  url: string;
  title: string;
  publishedAt: Date;
  category: Category;
  summaryEl: string;
  impactGreece: string;
  impactBusiness: string;
  impactPersonal: string;
  impactScore: number;
  scoreRationale: string;
  tags: string[];
  confidence: Confidence;
  fetchedAt: Date;
  contentHash: string;
};

export type RefreshStats = {
  scanned: number;
  inserted: number;
  updated: number;
  deduped: number;
};
