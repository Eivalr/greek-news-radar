import { Category, Source } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getArticles } from "@/app/lib/articles";
import { daysAgo } from "@/app/lib/utils/time";

export const dynamic = "force-dynamic";

function parseCategory(input: string | null): Category | undefined {
  if (!input) return undefined;
  const values = Object.values(Category);
  return values.includes(input as Category) ? (input as Category) : undefined;
}

function parseSource(input: string | null): Source | undefined {
  if (!input) return undefined;
  const values = Object.values(Source);
  return values.includes(input as Source) ? (input as Source) : undefined;
}

function parseView(input: string | null): "today" | "brief" | "archive" {
  if (input === "brief") return "brief";
  if (input === "archive") return "archive";
  return "today";
}

function safeDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const view = parseView(params.get("view"));

  const range = params.get("range") ?? "today";
  const now = new Date();

  const from =
    safeDate(params.get("from")) ??
    (range === "3d"
      ? daysAgo(3)
      : range === "7d"
        ? daysAgo(7)
        : range === "archive"
          ? daysAgo(30)
          : daysAgo(1));

  const to = safeDate(params.get("to")) ?? now;

  const minImpactRaw = params.get("minImpact");
  const minImpact = minImpactRaw ? Math.max(0, Math.min(100, Number(minImpactRaw) || 0)) : undefined;

  const rows = await getArticles({
    from,
    to,
    search: params.get("q") ?? undefined,
    category: parseCategory(params.get("category")),
    source: parseSource(params.get("source")),
    minImpact,
    tags: params.get("tags") ? params.get("tags")!.split(",").filter(Boolean) : undefined,
    view
  });

  return NextResponse.json({
    view,
    count: rows.length,
    rows
  });
}
