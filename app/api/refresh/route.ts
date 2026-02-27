import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db/prisma";
import { runRefreshJob, seedIfEmpty } from "@/app/lib/ingestion/job";

export const dynamic = "force-dynamic";

export async function POST() {
  await seedIfEmpty();

  const running = await prisma.refreshRun.findFirst({
    where: { status: "RUNNING" },
    orderBy: { startedAt: "desc" }
  });

  if (running) {
    return NextResponse.json({ started: false, message: "Refresh already running" }, { status: 409 });
  }

  void runRefreshJob("manual").catch(() => undefined);

  return NextResponse.json({ started: true });
}
