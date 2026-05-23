import { NextResponse } from "next/server";
import { runNewsFetchJob } from "@/lib/news-fetcher";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  return authHeader === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

async function handler(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runNewsFetchJob();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return handler(request);
}

export async function GET(request: Request) {
  return handler(request);
}
