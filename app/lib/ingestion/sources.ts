import { SourceConfig } from "@/app/lib/types";

export const SOURCE_CONFIGS: SourceConfig[] = [
  {
    source: "KATHIMERINI",
    domain: "kathimerini.gr",
    baseUrl: "https://www.kathimerini.gr",
    feeds: [
      "https://www.kathimerini.gr/feed/",
      "https://www.kathimerini.gr/rss/",
      "https://www.kathimerini.gr/category/economy/feed/"
    ],
    sections: [
      "https://www.kathimerini.gr/economy/",
      "https://www.kathimerini.gr/world/",
      "https://www.kathimerini.gr/politics/"
    ]
  },
  {
    source: "NAFTEMPORIKI",
    domain: "naftemporiki.gr",
    baseUrl: "https://www.naftemporiki.gr",
    feeds: [
      "https://www.naftemporiki.gr/rss",
      "https://www.naftemporiki.gr/feed/",
      "https://www.naftemporiki.gr/rss/economy/"
    ],
    sections: [
      "https://www.naftemporiki.gr/economy/",
      "https://www.naftemporiki.gr/finance/",
      "https://www.naftemporiki.gr/maritime/"
    ]
  },
  {
    source: "OT",
    domain: "ot.gr",
    baseUrl: "https://www.ot.gr",
    feeds: ["https://www.ot.gr/feed/", "https://www.ot.gr/category/economy/feed/"],
    sections: [
      "https://www.ot.gr/category/epikairothta/",
      "https://www.ot.gr/category/oikonomia/",
      "https://www.ot.gr/category/diethni/"
    ]
  }
];
