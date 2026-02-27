import { NextResponse } from "next/server";
import { ensureSnapshot } from "@/app/lib/ingestion/job";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await ensureSnapshot();
  return NextResponse.json({ rows: snapshot.rows, count: snapshot.rows.length });
}
