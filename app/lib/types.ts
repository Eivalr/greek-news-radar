import { Category, Confidence, RadarArticle, Source } from "@/app/lib/domain";

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

export type EnrichedArticle = Omit<RadarArticle, "publishedAt" | "fetchedAt"> & {
  publishedAt: Date;
  fetchedAt: Date;
};
