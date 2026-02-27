"use client";

import { useEffect, useMemo, useState } from "react";
import { ArticleCard } from "@/app/components/article-card";
import { Category, RadarArticle, RefreshSnapshot, Source } from "@/app/lib/domain";

type DashboardView = "today" | "brief";
type DateRange = "today" | "3d" | "7d" | "custom";

const CATEGORY_LABELS: Record<Category, string> = {
  TRADE: "Trade",
  TRANSPORT_LOGISTICS: "Transportation / Logistics / Shipping / Aviation",
  ECONOMICS_BUSINESS_MARKETS: "Economics / Business / Markets",
  GEOPOLITICS_SECURITY_ENERGY: "Geopolitical / Security / Energy",
  MAJOR_DAILY_GREEK_NEWS: "Major daily Greek news"
};

const SOURCE_LABELS: Record<Source, string> = {
  KATHIMERINI: "Kathimerini",
  NAFTEMPORIKI: "Naftemporiki",
  OT: "OT"
};

const CATEGORY_ORDER: Category[] = [
  "TRADE",
  "TRANSPORT_LOGISTICS",
  "ECONOMICS_BUSINESS_MARKETS",
  "GEOPOLITICS_SECURITY_ENERGY",
  "MAJOR_DAILY_GREEK_NEWS"
];

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function applyFilters(
  rows: RadarArticle[],
  options: {
    range: DateRange;
    fromDate: string;
    toDate: string;
    search: string;
    category: "" | Category;
    source: "" | Source;
    minImpact: number;
    tags: string[];
  }
): RadarArticle[] {
  const now = Date.now();

  return rows.filter((row) => {
    const publishedAt = parseDate(row.publishedAt)?.getTime() ?? 0;

    if (options.range === "today" && publishedAt < now - 24 * 60 * 60 * 1000) return false;
    if (options.range === "3d" && publishedAt < now - 3 * 24 * 60 * 60 * 1000) return false;
    if (options.range === "7d" && publishedAt < now - 7 * 24 * 60 * 60 * 1000) return false;

    if (options.range === "custom") {
      const from = options.fromDate ? new Date(`${options.fromDate}T00:00:00`).getTime() : null;
      const to = options.toDate ? new Date(`${options.toDate}T23:59:59`).getTime() : null;
      if (from && publishedAt < from) return false;
      if (to && publishedAt > to) return false;
    }

    if (options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      const haystack = `${row.title} ${row.summaryEl} ${row.scoreRationale}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (options.category && row.category !== options.category) return false;
    if (options.source && row.source !== options.source) return false;
    if (row.impactScore < options.minImpact) return false;
    if (options.tags.length > 0 && !options.tags.every((tag) => row.tags.includes(tag))) return false;

    return true;
  });
}

function todayDigest(rows: RadarArticle[]): RadarArticle[] {
  const grouped = new Map<Category, RadarArticle[]>();

  for (const row of rows) {
    const list = grouped.get(row.category) ?? [];
    list.push(row);
    grouped.set(row.category, list);
  }

  return CATEGORY_ORDER.flatMap((category) => {
    const list = grouped.get(category) ?? [];
    return list
      .sort((a, b) => b.impactScore - a.impactScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .slice(0, 3);
  }).slice(0, 15);
}

export function Dashboard() {
  const [view, setView] = useState<DashboardView>("today");
  const [range, setRange] = useState<DateRange>("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"" | Category>("");
  const [source, setSource] = useState<"" | Source>("");
  const [minImpact, setMinImpact] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<RadarArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRun, setLastRun] = useState<RefreshSnapshot | null>(null);

  const filteredRows = useMemo(
    () =>
      applyFilters(allRows, {
        range,
        fromDate,
        toDate,
        search,
        category,
        source,
        minImpact,
        tags: selectedTags
      }),
    [allRows, range, fromDate, toDate, search, category, source, minImpact, selectedTags]
  );

  const visibleRows = useMemo(() => {
    if (view === "brief") {
      return [...filteredRows]
        .sort((a, b) => b.impactScore - a.impactScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .slice(0, 5);
    }

    return todayDigest(filteredRows);
  }, [view, filteredRows]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    filteredRows.forEach((row) => row.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).slice(0, 20);
  }, [filteredRows]);

  const grouped = useMemo(() => {
    const map = new Map<Category, RadarArticle[]>();
    visibleRows.forEach((row) => {
      const list = map.get(row.category) ?? [];
      list.push(row);
      map.set(row.category, list);
    });
    return map;
  }, [visibleRows]);

  async function load(mode: "auto" | "manual") {
    if (mode === "manual") setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch("/api/refresh", {
        method: mode === "manual" ? "POST" : "GET",
        cache: "no-store"
      });

      const data: RefreshSnapshot = await response.json();
      setAllRows(data.rows ?? []);
      setLastRun(data);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    load("auto").catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#E8F1F5_0%,#F8FAFB_45%,#EEF5F8_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <header className="mb-6 rounded-2xl border border-white/40 bg-white/80 p-4 shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-radar-ink">Greek News Radar</h1>
              <p className="text-sm text-slate-600">On-demand refresh χωρίς αποθήκευση ιστορικού</p>
            </div>
            <button
              onClick={() => load("manual")}
              disabled={refreshing}
              className="rounded-lg bg-radar-signal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {refreshing ? "Refreshing…" : "Refresh now"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <select className="rounded-lg border p-2" value={view} onChange={(e) => setView(e.target.value as DashboardView)}>
              <option value="today">Today digest</option>
              <option value="brief">Daily Brief</option>
            </select>

            <select className="rounded-lg border p-2" value={range} onChange={(e) => setRange(e.target.value as DateRange)}>
              <option value="today">Today</option>
              <option value="3d">Last 3 days</option>
              <option value="7d">Last 7 days</option>
              <option value="custom">Custom</option>
            </select>

            <input className="rounded-lg border p-2" value={search} placeholder="Search" onChange={(e) => setSearch(e.target.value)} />

            <input
              type="date"
              className="rounded-lg border p-2"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              disabled={range !== "custom"}
            />

            <input
              type="date"
              className="rounded-lg border p-2"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              disabled={range !== "custom"}
            />
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Last refresh: {lastRun?.finishedAt ? new Date(lastRun.finishedAt).toLocaleString("el-GR") : "-"}
            {lastRun?.status ? ` (${lastRun.status})` : ""}
            {lastRun?.stats ? ` | scanned ${lastRun.stats.scanned}, kept ${lastRun.stats.accepted}` : ""}
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-white/40 bg-white/85 p-4 shadow">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Filters</h2>

            <label className="mb-2 block text-sm font-medium">Category</label>
            <select className="mb-4 w-full rounded-lg border p-2" value={category} onChange={(e) => setCategory(e.target.value as "" | Category)}>
              <option value="">All</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <label className="mb-2 block text-sm font-medium">Source</label>
            <select className="mb-4 w-full rounded-lg border p-2" value={source} onChange={(e) => setSource(e.target.value as "" | Source)}>
              <option value="">All</option>
              {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <label className="mb-2 block text-sm font-medium">Impact threshold: {minImpact}</label>
            <input
              type="range"
              min={0}
              max={100}
              value={minImpact}
              onChange={(e) => setMinImpact(Number(e.target.value))}
              className="mb-4 w-full"
            />

            <p className="mb-2 text-sm font-medium">Tags</p>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() =>
                      setSelectedTags((prev) =>
                        prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
                      )
                    }
                    className={`rounded-full px-2 py-1 text-xs ${
                      active ? "bg-radar-sea text-white" : "bg-radar-foam text-radar-ink"
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="space-y-5">
            {loading ? (
              <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">Loading…</div>
            ) : visibleRows.length === 0 ? (
              <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">No items found.</div>
            ) : view === "brief" ? (
              <section className="rounded-2xl border border-white/40 bg-white/85 p-4 shadow">
                <h2 className="mb-3 text-lg font-semibold">Daily Brief (Top 5)</h2>
                <div className="space-y-3">
                  {visibleRows.map((row) => (
                    <div key={row.id} className="rounded-lg border border-slate-200 p-3">
                      <a href={row.url} target="_blank" rel="noreferrer" className="font-semibold text-radar-sea">
                        {row.title}
                      </a>
                      <p className="mt-1 text-sm text-slate-700">{row.summaryEl}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {CATEGORY_LABELS[row.category]} | Score {row.impactScore}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              CATEGORY_ORDER.map((cat) => {
                const items = grouped.get(cat) ?? [];
                if (items.length === 0) return null;

                return (
                  <section key={cat} className="rounded-2xl border border-white/40 bg-white/85 p-4 shadow">
                    <h2 className="mb-3 text-lg font-semibold">{CATEGORY_LABELS[cat]}</h2>
                    <div className="space-y-4">
                      {items.map((item) => (
                        <ArticleCard key={item.id} article={item} />
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
