import type { ReportType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createDailyReport, createRollupReport } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

const reportTypeMap: Record<string, ReportType> = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  quarterly: "quarterly",
  "half-year": "half_year",
  half_year: "half_year",
  annual: "annual"
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = reportTypeMap[searchParams.get("type") || "daily"] || "daily";
  const reports = await prisma.report.findMany({
    where: { reportType: type },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const type = reportTypeMap[body.type || "daily"] || "daily";
  const date = body.date ? new Date(body.date) : new Date();
  const report = type === "daily" ? await createDailyReport(date) : await createRollupReport(type, date);

  return NextResponse.json({ report });
}
