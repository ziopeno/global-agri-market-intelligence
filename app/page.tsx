import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Rss } from "lucide-react";
import { DashboardSignalCards } from "@/components/dashboard-signal-cards";
import { DailyScoresChart, ProductImpactChart } from "@/components/impact-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/dashboard";
import { formatDateTime, formatScore, scoreTone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>오늘의 시장 영향 점수</CardTitle>
            <CardDescription>오늘 수집·분석된 기사 기준 보정 점수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-5xl font-semibold text-slate-950">{formatScore(data.todayMarketImpact)}</div>
                <div className="mt-2 text-sm text-slate-500">분석 기사 {data.analyzedCount}건 / 전체 {data.articleCount}건</div>
              </div>
              <Link
                href="/sources"
                className="hidden h-10 items-center gap-2 rounded-md border bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50 sm:inline-flex"
              >
                <Rss className="h-4 w-4" />
                소스 관리
              </Link>
            </div>
          </CardContent>
        </Card>
        <DashboardSignalCards
          riskCount={data.countryRisk.filter((item) => item.risk > 0).length}
          riskArticles={data.riskSignalArticles}
          repeatedCount={data.repeatedSignals.length}
          repeatedSignals={data.repeatedSignals}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>제품별 영향 점수 랭킹</CardTitle>
            <CardDescription>최근 30일 기사와 민감도 매트릭스 기준</CardDescription>
          </CardHeader>
          <CardContent>
            <ProductImpactChart data={data.productRanking} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>최근 7일 시장 점수</CardTitle>
            <CardDescription>기사 단위 시장 영향 합산</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyScoresChart data={data.dailyScores} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>국가별 리스크 지도</CardTitle>
            <CardDescription>기사 수 편향을 줄인 정규화·사업중요도 반영 우선순위</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.countryRisk.length ? (
              data.countryRisk.map((item) => (
                <div key={item.country} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{item.country}</div>
                    <Badge tone={(item.weightedCountryScore ?? item.score) >= 0 ? "green" : "rose"}>
                      {formatScore(item.weightedCountryScore ?? item.score)}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span>Normalized {formatScore(item.normalizedScore ?? item.score)}</span>
                    <span>BI x{(item.businessImportanceWeight ?? 1).toFixed(1)}</span>
                    <span>Risk {item.risk.toFixed(1)}</span>
                    <span>Opportunity {item.opportunity.toFixed(1)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">분석된 국가 리스크가 없습니다.</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>핵심 뉴스 리스트</CardTitle>
            <CardDescription>요약, 분류, 시장 영향 점수 연결</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.keyNews.length ? (
              data.keyNews.map((article) => (
                <div key={article.id} className="rounded-md border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{article.source}</Badge>
                    {article.country && <Badge>{article.country}</Badge>}
                    {article.crop && <Badge tone="green">{article.crop}</Badge>}
                    {article.category && <Badge tone="amber">{article.category}</Badge>}
                    <span className={`rounded-sm border px-2 py-1 text-xs font-medium ${scoreTone(article.adjustedMarketScore ?? article.marketImpactScore)}`}>
                      {formatScore(article.adjustedMarketScore ?? article.marketImpactScore)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <Link href={`/news#article-${article.id}`} className="font-semibold text-slate-950 hover:text-primary">
                        {article.title}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{article.summary || "아직 AI 분석 전입니다."}</p>
                      <div className="mt-2 text-xs text-slate-500">{formatDateTime(article.publishedAt)}</div>
                    </div>
                    <a href={article.url} target="_blank" rel="noreferrer" className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-dashed p-5 text-sm text-slate-500">
                <AlertTriangle className="h-4 w-4" />
                뉴스 화면에서 기사나 RSS를 먼저 입력하세요.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>이번 주 주요 인사이트</CardTitle>
            <CardDescription>반복적으로 등장한 시장 신호</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-5">
              {data.weeklyInsights.length ? (
                data.weeklyInsights.map((insight) => (
                  <div key={insight} className="rounded-md border bg-white p-3 text-sm font-medium text-slate-700">
                    {insight}
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">이번 주 반복 신호가 아직 없습니다.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
