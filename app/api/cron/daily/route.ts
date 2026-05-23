import { NextResponse } from "next/server";
import { runNewsFetchJob } from "@/lib/news-fetcher";
import { createRollupReport } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  return authHeader === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

async function handler(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runNewsFetchJob();
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const rollups: Array<{ type: string; id: string }> = [];

  if (kst.getDay() === 1) {
    const weekly = await createRollupReport("weekly", now);
    rollups.push({ type: "weekly", id: weekly.id });
  }
  if (kst.getDate() === 1) {
    const monthly = await createRollupReport("monthly", now);
    rollups.push({ type: "monthly", id: monthly.id });
  }
  if (kst.getDate() === 1 && [0, 3, 6, 9].includes(kst.getMonth())) {
    const quarterly = await createRollupReport("quarterly", now);
    rollups.push({ type: "quarterly", id: quarterly.id });
  }
  if (kst.getDate() === 1 && [0, 6].includes(kst.getMonth())) {
    const halfYear = await createRollupReport("half_year", now);
    rollups.push({ type: "half_year", id: halfYear.id });
  }
  if (kst.getDate() === 1 && kst.getMonth() === 0) {
    const annual = await createRollupReport("annual", now);
    rollups.push({ type: "annual", id: annual.id });
  }

  return NextResponse.json({ ...result, rollups });
}

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
