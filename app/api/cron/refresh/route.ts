import { NextRequest, NextResponse } from "next/server";
import { env } from "@/app/lib/config";
import { runRefreshJob } from "@/app/lib/ingestion/job";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  if (!env.CRON_SHARED_SECRET) return true;

  const auth = request.headers.get("authorization")?.replace("Bearer ", "");
  const querySecret = request.nextUrl.searchParams.get("secret");

  return auth === env.CRON_SHARED_SECRET || querySecret === env.CRON_SHARED_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runRefreshJob("cron");
  return NextResponse.json({ ok: true, result });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
