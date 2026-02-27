"use client";

import { Category, Source, type Article, type RefreshRun } from "@prisma/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArticleCard } from "@/app/components/article-card";

type DashboardView = "today" | "brief" | "archive";
type DateRange = "today" | "3d" | "7d" | "custom";

type StatusResponse = {
  last: RefreshRun | null;
};

type ArticleResponse = {
  rows: Article[];
};

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
  Category.TRADE,
  Category.TRANSPORT_LOGISTICS,
  Category.ECONOMICS_BUSINESS_MARKETS,
  Category.GEOPOLITICS_SECURITY_ENERGY,
  Category.MAJOR_DAILY_GREEK_NEWS
];

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
  const [rows, setRows] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<RefreshRun | null>(null);
  const prevRefreshStatus = useRef<string | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const row of rows) {
      const itemTags = Array.isArray(row.tags) ? row.tags.map(String) : [];
      itemTags.forEach((tag) => tags.add(tag));
    }
    return Array.from(tags).slice(0, 20);
  }, [rows]);

  const grouped = useMemo(() => {
    const map = new Map<Category, Article[]>();
    rows.forEach((row) => {
      const list = map.get(row.category) ?? [];
      list.push(row);
      map.set(row.category, list);
    });
    return map;
  }, [rows]);

  async function fetchArticles() {
    setLoading(true);
    const params = new URLSearchParams({
      view,
      range: view === "archive" ? "archive" : range,
      q: search,
      minImpact: String(minImpact)
    });

    if (category) params.set("category", category);
    if (source) params.set("source", source);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (range === "custom") {
      if (fromDate) params.set("from", new Date(fromDate).toISOString());
      if (toDate) params.set("to", new Date(toDate).toISOString());
    }

    const res = await fetch(`/api/articles?${params.toString()}`, { cache: "no-store" });
    const data: ArticleResponse = await res.json();
    setRows(data.rows ?? []);
    setLoading(false);
  }

  async function fetchRefreshStatus() {
    const res = await fetch("/api/refresh/status", { cache: "no-store" });
    const data: StatusResponse = await res.json();
    setLastRefresh(data.last);
    const currentStatus = data.last?.status ?? null;
    setRefreshing(currentStatus === "RUNNING");

    if (prevRefreshStatus.current === "RUNNING" && currentStatus !== "RUNNING") {
      fetchArticles().catch(() => undefined);
    }

    prevRefreshStatus.current = currentStatus;
  }

  async function triggerRefresh() {
    setRefreshing(true);
    await fetch("/api/refresh", { method: "POST" });
    fetchRefreshStatus().catch(() => undefined);
  }

  useEffect(() => {
    fetchArticles().catch(() => setLoading(false));
  }, [view, range, search, category, source, minImpact, selectedTags.join(","), fromDate, toDate]);

  useEffect(() => {
    fetchRefreshStatus().catch(() => undefined);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      fetchRefreshStatus().catch(() => undefined);
    }, refreshing ? 4500 : 20_000);
    return () => clearInterval(id);
  }, [refreshing]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#E8F1F5_0%,#F8FAFB_45%,#EEF5F8_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <header className="mb-6 rounded-2xl border border-white/40 bg-white/80 p-4 shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-radar-ink">Greek News Radar</h1>
              <p className="text-sm text-slate-600">Καθημερινή χαρτογράφηση ελληνικών ειδήσεων με impact scoring</p>
            </div>
            <button
              onClick={triggerRefresh}
              disabled={refreshing}
              className="rounded-lg bg-radar-signal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {refreshing ? "Refreshing…" : "Refresh now"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <select
              className="rounded-lg border p-2"
              value={view}
              onChange={(e) => setView(e.target.value as DashboardView)}
            >
              <option value="today">Today digest</option>
              <option value="brief">Daily Brief</option>
              <option value="archive">Archive</option>
            </select>

            <select
              className="rounded-lg border p-2"
              value={range}
              onChange={(e) => setRange(e.target.value as DateRange)}
            >
              <option value="today">Today</option>
              <option value="3d">Last 3 days</option>
              <option value="7d">Last 7 days</option>
              <option value="custom">Custom</option>
            </select>

            <input
              className="rounded-lg border p-2"
              value={search}
              placeholder="Search"
              onChange={(e) => setSearch(e.target.value)}
            />

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
            Last refresh: {lastRefresh ? new Date(lastRefresh.startedAt).toLocaleString("el-GR") : "-"}
            {lastRefresh?.status ? ` (${lastRefresh.status})` : ""}
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-white/40 bg-white/85 p-4 shadow">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Filters</h2>

            <label className="mb-2 block text-sm font-medium">Category</label>
            <select
              className="mb-4 w-full rounded-lg border p-2"
              value={category}
              onChange={(e) => setCategory(e.target.value as "" | Category)}
            >
              <option value="">All</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <label className="mb-2 block text-sm font-medium">Source</label>
            <select
              className="mb-4 w-full rounded-lg border p-2"
              value={source}
              onChange={(e) => setSource(e.target.value as "" | Source)}
            >
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
            ) : rows.length === 0 ? (
              <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">No items found.</div>
            ) : view === "brief" ? (
              <section className="rounded-2xl border border-white/40 bg-white/85 p-4 shadow">
                <h2 className="mb-3 text-lg font-semibold">Daily Brief (Top 5)</h2>
                <div className="space-y-3">
                  {rows.slice(0, 5).map((row) => (
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
            ) : view === "archive" ? (
              <section className="rounded-2xl border border-white/40 bg-white/85 p-4 shadow">
                <h2 className="mb-3 text-lg font-semibold">Archive (30 days)</h2>
                <div className="space-y-2">
                  {rows.map((row) => (
                    <div key={row.id} className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_auto]">
                      <div>
                        <a href={row.url} target="_blank" rel="noreferrer" className="font-medium text-radar-sea">
                          {row.title}
                        </a>
                        <p className="text-xs text-slate-500">
                          {SOURCE_LABELS[row.source]} | {new Date(row.publishedAt).toLocaleString("el-GR")} | {CATEGORY_LABELS[row.category]}
                        </p>
                      </div>
                      <div className="text-right text-sm font-semibold">{row.impactScore}</div>
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
