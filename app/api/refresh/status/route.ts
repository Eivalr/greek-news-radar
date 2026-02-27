import { NextResponse } from "next/server";
import { getLastRefresh } from "@/app/lib/articles";

export const dynamic = "force-dynamic";

export async function GET() {
  const last = await getLastRefresh();
  return NextResponse.json({ last });
}
