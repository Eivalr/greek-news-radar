export const SOURCES = ["KATHIMERINI", "NAFTEMPORIKI", "OT"] as const;
export type Source = (typeof SOURCES)[number];

export const CATEGORIES = [
  "TRADE",
  "TRANSPORT_LOGISTICS",
  "ECONOMICS_BUSINESS_MARKETS",
  "GEOPOLITICS_SECURITY_ENERGY",
  "MAJOR_DAILY_GREEK_NEWS"
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CONFIDENCE_LEVELS = ["HIGH", "MED", "LOW"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export type RadarArticle = {
  id: string;
  title: string;
  source: Source;
  url: string;
  publishedAt: string;
  category: Category;
  summaryEl: string;
  impactGreece: string;
  impactBusiness: string;
  impactPersonal: string;
  impactScore: number;
  scoreRationale: string;
  tags: string[];
  confidence: Confidence;
  fetchedAt: string;
  contentHash: string;
};

export type RefreshStats = {
  scanned: number;
  accepted: number;
  deduped: number;
};

export type RefreshSnapshot = {
  status: "IDLE" | "RUNNING" | "COMPLETED" | "FAILED";
  mode: string;
  startedAt: string | null;
  finishedAt: string | null;
  message: string;
  error?: string;
  stats: RefreshStats;
  rows: RadarArticle[];
};
