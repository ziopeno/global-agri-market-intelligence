import { ReportGenerator } from "@/components/report-generator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { REPORT_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function reportContent(content: unknown) {
  const item = content as Record<string, unknown>;
  return {
    headlines: list(item.today_headlines),
    risks: list(item.risks),
    opportunities: list(item.opportunities),
    actions: list(item.sales_action_items),
    summary: typeof item.market_impact_summary === "string" ? item.market_impact_summary : ""
  };
}

export default async function ReportsPage() {
  let reports: any[] = [];

  try {
    reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 40
    });
  } catch (error) {
    console.warn("Reports page fallback: database is not available.", error);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>리포트</CardTitle>
            <CardDescription>Daily / Weekly / Monthly / Quarterly / Half-year / Annual 리포트를 생성하고 저장합니다.</CardDescription>
          </div>
          <ReportGenerator />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>저장된 리포트</CardTitle>
          <CardDescription>하위 기사와 점수 근거는 content.evidence와 sourceArticleIds에 연결됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reports.length ? (
            reports.map((report) => {
              const content = reportContent(report.content);
              return (
                <section key={report.id} className="rounded-lg border bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="blue">{REPORT_LABELS[report.reportType as keyof typeof REPORT_LABELS]}</Badge>
                        <span className="text-xs text-slate-500">{formatDateTime(report.createdAt)}</span>
                      </div>
                      <h2 className="mt-2 text-lg font-semibold text-slate-950">{report.title}</h2>
                    </div>
                    <div className="text-sm text-slate-500">Source articles {report.sourceArticleIds.length}</div>
                  </div>
                  {content.summary && <p className="mt-3 text-sm leading-6 text-slate-700">{content.summary}</p>}
                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <div>
                      <div className="mb-2 text-sm font-semibold">핵심 뉴스</div>
                      <ul className="space-y-2 text-sm text-slate-600">
                        {content.headlines.slice(0, 4).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-semibold">리스크</div>
                      <ul className="space-y-2 text-sm text-slate-600">
                        {content.risks.slice(0, 4).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-semibold">기회</div>
                      <ul className="space-y-2 text-sm text-slate-600">
                        {content.opportunities.slice(0, 4).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-semibold">영업 액션</div>
                      <ul className="space-y-2 text-sm text-slate-600">
                        {content.actions.slice(0, 4).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              );
            })
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-slate-500">아직 생성된 리포트가 없습니다.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
