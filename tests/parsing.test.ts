import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { parseArticleHtml } from "@/app/lib/ingestion/fetch";
import { toEnrichedArticle } from "@/app/lib/ingestion/transform";
import { titleSimilarity } from "@/app/lib/utils/text";

describe("parsing and dedupe helpers", () => {
  test("parses article HTML and enriches output", () => {
    const html = fs.readFileSync(path.resolve("tests/fixtures/article-sample.html"), "utf8");

    const parsed = parseArticleHtml(
      {
        source: "KATHIMERINI",
        url: "https://www.kathimerini.gr/economy/2026/02/27/sample"
      },
      html
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.title).toContain("ελληνικά λιμάνια");

    const enriched = toEnrichedArticle(parsed!);
    expect(enriched.summaryEl.length).toBeGreaterThan(40);
    expect(enriched.impactScore).toBeGreaterThanOrEqual(0);
    expect(enriched.impactScore).toBeLessThanOrEqual(100);
    expect(enriched.tags.length).toBeGreaterThan(0);
  });

  test("detects near duplicate titles", () => {
    const a = "Σημαντικές αλλαγές στη διακίνηση φορτίων στο λιμάνι Πειραιά";
    const b = "Αλλαγές στη διακίνηση φορτίων στο λιμάνι του Πειραιά";

    expect(titleSimilarity(a, b)).toBeGreaterThan(0.7);
  });
});
