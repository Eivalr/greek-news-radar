import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { env } from "@/app/lib/config";
import { SOURCE_CONFIGS } from "@/app/lib/ingestion/sources";
import { ExtractedArticle, RawArticleCandidate, SourceConfig } from "@/app/lib/types";
import { toDateOrNow } from "@/app/lib/utils/time";

const parser = new Parser({
  timeout: 12_000,
  headers: {
    "User-Agent": "GreekNewsRadarBot/1.0 (+https://localhost)"
  }
});

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GreekNewsRadarBot/1.0 (+https://localhost)",
        "Accept-Language": "el-GR,el;q=0.9,en;q=0.8"
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }

    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeUrl(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return "";
  }
}

function isAllowedDomain(url: string, domain: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

async function readFeedCandidates(config: SourceConfig): Promise<RawArticleCandidate[]> {
  const candidates: RawArticleCandidate[] = [];
  const feedUrls = new Set(config.feeds);

  try {
    const homepageHtml = await fetchText(config.baseUrl);
    const $ = cheerio.load(homepageHtml);
    $("link[type*='rss'], link[type*='atom'], a[href*='feed'], a[href*='rss']")
      .toArray()
      .forEach((el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const normalized = normalizeUrl(href, config.baseUrl);
        if (!normalized || !isAllowedDomain(normalized, config.domain)) return;
        if (!/feed|rss|atom/i.test(normalized)) return;
        feedUrls.add(normalized);
      });
  } catch {
    // Keep configured feeds only.
  }

  for (const feedUrl of feedUrls) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items) {
        const url = item.link ? normalizeUrl(item.link, config.baseUrl) : "";
        if (!url || !isAllowedDomain(url, config.domain)) continue;

        candidates.push({
          source: config.source,
          url,
          title: item.title ?? undefined,
          publishedAt: item.isoDate ? toDateOrNow(item.isoDate) : item.pubDate ? toDateOrNow(item.pubDate) : undefined
        });
      }
    } catch {
      continue;
    }
  }

  return candidates;
}

async function readSectionCandidates(config: SourceConfig): Promise<RawArticleCandidate[]> {
  const candidates: RawArticleCandidate[] = [];

  for (const sectionUrl of config.sections) {
    try {
      const html = await fetchText(sectionUrl);
      const $ = cheerio.load(html);

      $("a[href]")
        .toArray()
        .slice(0, 500)
        .forEach((element) => {
          const href = $(element).attr("href");
          if (!href) return;

          const url = normalizeUrl(href, config.baseUrl);
          if (!url || !isAllowedDomain(url, config.domain)) return;

          // Keep only likely article pages to reduce noise.
          if (!/\/(20\d{2}|\d{4})\//.test(url) && !/\/article\//.test(url)) return;

          const title = $(element).text().trim() || undefined;
          candidates.push({ source: config.source, url, title });
        });
    } catch {
      continue;
    }
  }

  return candidates;
}

async function readGoogleNewsFallback(config: SourceConfig): Promise<RawArticleCandidate[]> {
  const candidates: RawArticleCandidate[] = [];
  const query = encodeURIComponent(`site:${config.domain}`);
  const fallbackFeed = `https://news.google.com/rss/search?q=${query}+when:${Math.ceil(env.INGESTION_LOOKBACK_HOURS / 24)}d&hl=el&gl=GR&ceid=GR:el`;

  function tryExtractUrl(raw: string | undefined): string {
    if (!raw) return "";

    const directMatches = raw.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
    for (const match of directMatches) {
      const cleaned = match.replace(/[),.]+$/, "");
      if (isAllowedDomain(cleaned, config.domain)) return cleaned;

      try {
        const url = new URL(cleaned);
        const nestedUrl = url.searchParams.get("url");
        if (nestedUrl && isAllowedDomain(nestedUrl, config.domain)) return nestedUrl;
      } catch {
        continue;
      }
    }

    return "";
  }

  try {
    const feed = await parser.parseURL(fallbackFeed);
    for (const item of feed.items) {
      const candidateUrlFromLink = item.link ? normalizeUrl(item.link, config.baseUrl) : "";
      const candidateUrl =
        (candidateUrlFromLink && isAllowedDomain(candidateUrlFromLink, config.domain)
          ? candidateUrlFromLink
          : "") ||
        tryExtractUrl(item.content) ||
        tryExtractUrl(item.contentSnippet) ||
        tryExtractUrl(item.guid);

      if (!candidateUrl) continue;

      candidates.push({
        source: config.source,
        url: candidateUrl,
        title: item.title ?? undefined,
        publishedAt: item.isoDate ? toDateOrNow(item.isoDate) : undefined
      });
    }
  } catch {
    return candidates;
  }

  return candidates;
}

export async function discoverCandidates(): Promise<RawArticleCandidate[]> {
  const allCandidates = await Promise.all(
    SOURCE_CONFIGS.map(async (config) => {
      const [rss, section, fallback] = await Promise.all([
        readFeedCandidates(config),
        readSectionCandidates(config),
        readGoogleNewsFallback(config)
      ]);

      return [...rss, ...section, ...fallback];
    })
  );

  const seen = new Set<string>();
  const lookbackCutoff = new Date(Date.now() - env.INGESTION_LOOKBACK_HOURS * 60 * 60 * 1000).getTime();

  return allCandidates
    .flat()
    .filter((candidate) => {
      if (!candidate.url || seen.has(candidate.url)) return false;
      if (candidate.publishedAt && candidate.publishedAt.getTime() < lookbackCutoff) return false;
      seen.add(candidate.url);
      return true;
    })
    .slice(0, 300);
}

function detectConfidence(bodyText: string, snippet: string, html: string): ExtractedArticle["confidence"] {
  const normalized = `${bodyText} ${snippet}`.toLowerCase();
  const paywallHit = /(subscribe|paywall|συνδρομ|αποκλειστικά για συνδρομητές|premium)/i.test(
    normalized + html.slice(0, 1200)
  );

  if (paywallHit || bodyText.length < 200) return "LOW";
  if (bodyText.length < 700) return "MED";
  return "HIGH";
}

export function parseArticleHtml(candidate: RawArticleCandidate, html: string): ExtractedArticle | null {
  const $ = cheerio.load(html);

  const title =
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    $("title").first().text().trim() ||
    candidate.title ||
    "";

  if (!title) return null;

  const publishedRaw =
    $("meta[property='article:published_time']").attr("content") ||
    $("meta[name='pubdate']").attr("content") ||
    $("time").first().attr("datetime") ||
    candidate.publishedAt;

  const publishedAt = toDateOrNow(publishedRaw);

  const bodyParts = [
    ...$("article p")
      .toArray()
      .map((el) => $(el).text().trim()),
    ...$("main p")
      .toArray()
      .map((el) => $(el).text().trim())
  ].filter((part) => part.length > 40);

  const uniqueParts = Array.from(new Set(bodyParts));
  const accessibleText = uniqueParts.join(" ").replace(/\s+/g, " ").trim();

  const snippet =
    $("meta[name='description']").attr("content")?.trim() ||
    $("meta[property='og:description']").attr("content")?.trim() ||
    uniqueParts[0] ||
    candidate.title ||
    "";

  const confidence = detectConfidence(accessibleText, snippet, html);

  return {
    source: candidate.source,
    url: candidate.url,
    title,
    publishedAt,
    accessibleText,
    snippet,
    confidence
  };
}

export async function extractArticle(candidate: RawArticleCandidate): Promise<ExtractedArticle | null> {
  try {
    const html = await fetchText(candidate.url);
    return parseArticleHtml(candidate, html);
  } catch {
    return null;
  }
}
