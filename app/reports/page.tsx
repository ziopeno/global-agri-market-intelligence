import { ExternalLink } from "lucide-react";
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

type ReportSourceArticle = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: Date;
};

function isReportSourceArticle(article: ReportSourceArticle | undefined): article is ReportSourceArticle {
  return Boolean(article);
}

export default async function ReportsPage() {
  let reports: any[] = [];
  let sourceArticlesById = new Map<string, ReportSourceArticle>();

  try {
    reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 40
    });
    const sourceArticleIds = [...new Set(reports.flatMap((report) => report.sourceArticleIds || []))];
    const sourceArticles = sourceArticleIds.length
      ? await prisma.article.findMany({
          where: { id: { in: sourceArticleIds } },
          select: {
            id: true,
            title: true,
            source: true,
            url: true,
            publishedAt: true
          }
        })
      : [];
    sourceArticlesById = new Map(sourceArticles.map((article) => [article.id, article]));
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
              const sourceArticles = (report.sourceArticleIds || [])
                .map((articleId: string) => sourceArticlesById.get(articleId))
                .filter(isReportSourceArticle);
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
                  <div className="mt-4 rounded-md border bg-slate-50 p-3">
                    <div className="mb-2 text-sm font-semibold text-slate-950">사용 기사 원문 링크</div>
                    {sourceArticles.length ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {sourceArticles.slice(0, 12).map((article: ReportSourceArticle) => (
                          <a
                            key={article.id}
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group rounded-md border bg-white p-2 text-xs leading-5 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-slate-900 group-hover:text-emerald-900">{article.title}</span>
                              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-emerald-700" />
                            </div>
                            <div className="mt-1 text-slate-500">
                              {article.source} · {formatDateTime(article.publishedAt)}
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">연결된 원문 링크가 없습니다.</p>
                    )}
                    {sourceArticles.length > 12 && (
                      <p className="mt-2 text-xs text-slate-500">총 {sourceArticles.length}건 중 상위 12건을 표시합니다.</p>
                    )}
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
