import { Category, Confidence } from "@/app/lib/domain";
import { compact, normalizeText, splitSentences } from "@/app/lib/utils/text";

const CATEGORY_RULES: Array<{ category: Category; keywords: string[] }> = [
  {
    category: "TRANSPORT_LOGISTICS",
    keywords: [
      "λιμάνι",
      "ναυτιλία",
      "μεταφορ",
      "φορτί",
      "logistics",
      "shipping",
      "aviation",
      "cargo",
      "airline",
      "πλοίο",
      "τελων",
      "supply chain"
    ]
  },
  {
    category: "TRADE",
    keywords: ["εξαγωγ", "εισαγωγ", "trade", "δασμ", "tariff", "εμπόριο", "τελωνεια", "ανταγωνισ"]
  },
  {
    category: "ECONOMICS_BUSINESS_MARKETS",
    keywords: [
      "οικονομ",
      "αγορά",
      "πληθωρισ",
      "επιτόκ",
      "χρηματιστήρι",
      "επενδύ",
      "gdp",
      "business",
      "market"
    ]
  },
  {
    category: "GEOPOLITICS_SECURITY_ENERGY",
    keywords: [
      "ενέργ",
      "γεωπολιτ",
      "ασφάλει",
      "άμυνα",
      "στρατηγ",
      "κρίση",
      "φυσικό αέριο",
      "πετρέλαιο",
      "ρεύμα",
      "eu",
      "nato"
    ]
  }
];

export function classifyCategory(title: string, body: string): Category {
  const text = normalizeText(`${title} ${body}`);
  let best: { category: Category; score: number } | null = null;

  for (const rule of CATEGORY_RULES) {
    const score = rule.keywords.reduce(
      (sum, keyword) => (text.includes(normalizeText(keyword)) ? sum + 1 : sum),
      0
    );

    if (!best || score > best.score) {
      best = { category: rule.category, score };
    }
  }

  if (!best || best.score === 0) return "MAJOR_DAILY_GREEK_NEWS";
  return best.category;
}

export function buildSummaryEl(title: string, accessibleText: string, snippet: string): string {
  const sourceText = accessibleText.trim().length > 140 ? accessibleText : `${title}. ${snippet}`;
  const sentences = splitSentences(sourceText);

  if (sentences.length === 0) {
    return compact(`${title}. ${snippet}`.trim(), 420);
  }

  return compact(sentences.slice(0, 3).join(" "), 420);
}

function buildGroundedBullet(prefix: string, text: string): string {
  return compact(`${prefix}${text}`, 180);
}

export function buildImpacts(
  summaryEl: string,
  snippet: string,
  category: Category,
  confidence: Confidence
): {
  impactGreece: string;
  impactBusiness: string;
  impactPersonal: string;
} {
  const fact = splitSentences(`${summaryEl} ${snippet}`)[0] ?? compact(summaryEl || snippet, 130);
  const confidenceNote = confidence === "LOW" ? " Περιορισμένη πρόσβαση σε πλήρες κείμενο." : "";

  const greece = [
    buildGroundedBullet("- Το δημοσίευμα επισημαίνει: ", fact),
    buildGroundedBullet("- Πιθανή επίπτωση για την ελληνική αγορά: ", fact)
  ];

  const business = [
    buildGroundedBullet("- Επιχειρηματικό σήμα: ", fact),
    category === "TRANSPORT_LOGISTICS"
      ? "- Αυξημένη ανάγκη για αναπροσαρμογή SLA, δρομολογίων ή χωρητικότητας."
      : "- Απαιτείται παρακολούθηση κόστους, ρίσκου και συμμόρφωσης."
  ];

  const personal = [
    "- Ελέγξτε άμεσα επίδραση σε χρόνους transit, λιμενική συμφόρηση και διαθέσιμη χωρητικότητα.",
    "- Ενημερώστε πελάτες για πιθανές καθυστερήσεις/ανατιμήσεις με βάση τα τρέχοντα δεδομένα."
  ];

  if (confidenceNote) {
    greece.push(`- Εμπιστοσύνη: χαμηλή.${confidenceNote}`);
    business.push(`- Εμπιστοσύνη: χαμηλή.${confidenceNote}`);
    personal.push(`- Εμπιστοσύνη: χαμηλή.${confidenceNote}`);
  }

  return {
    impactGreece: greece.slice(0, 3).join("\n"),
    impactBusiness: business.slice(0, 3).join("\n"),
    impactPersonal: personal.slice(0, 3).join("\n")
  };
}

export function deriveTags(title: string, summaryEl: string, category: Category): string[] {
  const normalized = normalizeText(`${title} ${summaryEl}`);
  const tags = new Set<string>();

  if (normalized.includes("λιμ") || normalized.includes("port")) tags.add("λιμάνια");
  if (normalized.includes("ναυτ") || normalized.includes("shipping")) tags.add("ναυτιλία");
  if (normalized.includes("ενεργ") || normalized.includes("gas") || normalized.includes("πετρέλ"))
    tags.add("ενέργεια");
  if (normalized.includes("πληθωρ") || normalized.includes("inflation")) tags.add("πληθωρισμός");
  if (normalized.includes("trade") || normalized.includes("εξαγωγ") || normalized.includes("εισαγωγ"))
    tags.add("εμπόριο");
  if (normalized.includes("air") || normalized.includes("αερο")) tags.add("αερομεταφορές");
  if (normalized.includes("τελων")) tags.add("τελωνεία");

  switch (category) {
    case "TRADE":
      tags.add("trade");
      break;
    case "TRANSPORT_LOGISTICS":
      tags.add("logistics");
      break;
    case "ECONOMICS_BUSINESS_MARKETS":
      tags.add("markets");
      break;
    case "GEOPOLITICS_SECURITY_ENERGY":
      tags.add("geopolitics");
      break;
    default:
      tags.add("greece");
  }

  return Array.from(tags).slice(0, 6);
}

export function impactScoreFromContent(
  category: Category,
  publishedAt: Date,
  text: string
): { score: number; rationale: string } {
  const normalized = normalizeText(text);
  let score = 35;

  const ageHours = Math.max(0, (Date.now() - publishedAt.getTime()) / 3_600_000);
  score += ageHours <= 12 ? 20 : ageHours <= 24 ? 14 : ageHours <= 48 ? 8 : 0;

  if (category === "TRANSPORT_LOGISTICS") score += 20;
  if (category === "TRADE") score += 16;
  if (category === "ECONOMICS_BUSINESS_MARKETS") score += 12;
  if (category === "GEOPOLITICS_SECURITY_ENERGY") score += 12;

  const magnitudeSignals = ["κόστος", "ρίσκο", "δασμ", "κυρώσ", "τιμή", "καθυστέρη", "compliance"];
  const magnitudeHits = magnitudeSignals.reduce(
    (sum, signal) => (normalized.includes(signal) ? sum + 1 : sum),
    0
  );
  score += Math.min(18, magnitudeHits * 4);

  const bounded = Math.max(0, Math.min(100, score));

  return {
    score: bounded,
    rationale:
      ageHours <= 24
        ? "Υψηλή προτεραιότητα λόγω άμεσης επικαιρότητας και επιχειρησιακής συνάφειας."
        : "Η βαθμολογία αντανακλά τη θεματική συνάφεια και το πιθανό λειτουργικό αποτύπωμα."
  };
}
