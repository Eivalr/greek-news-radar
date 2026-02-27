import { NextResponse } from "next/server";
import { ensureSnapshot, runRefreshJob } from "@/app/lib/ingestion/job";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await ensureSnapshot();
  return NextResponse.json(snapshot);
}

export async function POST() {
  const snapshot = await runRefreshJob("manual");
  return NextResponse.json(snapshot);
}
