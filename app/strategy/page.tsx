import { AlertTriangle, CheckCircle2, Flag, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { getFallbackProducts } from "@/lib/fallback-data";
import { ensureProductSeeds } from "@/lib/seed";
import { formatScore } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StrategyPage() {
  const dashboard = await getDashboardData();
  let products: any[] = getFallbackProducts();

  try {
    await ensureProductSeeds();
    products = await prisma.product.findMany({
      include: {
        productImpacts: {
          include: { article: true },
          orderBy: { createdAt: "desc" },
          take: 20
        }
      },
      orderBy: { name: "asc" }
    });
  } catch (error) {
    console.warn("Strategy page fallback: database is not available.", error);
  }

  const productStrategies = dashboard.productRanking.slice(0, 8).map((item) => ({
    ...item,
    strategy:
      item.score >= 0
        ? "수요 확대 신호가 있는 국가·작물 고객을 우선 접촉하고 가격/재고 가용성을 확인"
        : "규제·원가·수급 리스크를 점검하고 대체 제품 또는 공급 조건을 준비"
  }));
  const countryPriorities = dashboard.countryRisk
    .map((item) => ({
      ...item,
      priority: item.opportunity >= item.risk ? "공략" : "관리"
    }))
    .slice(0, 8);
  const riskWarnings = dashboard.keyNews
    .filter((article) => (article.adjustedMarketScore ?? article.marketImpactScore) < 0)
    .slice(0, 5);
  const opportunityNews = dashboard.keyNews
    .filter((article) => (article.adjustedMarketScore ?? article.marketImpactScore) > 0)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>제품별 추천 전략</CardTitle>
            <CardDescription>제품 영향 점수와 민감도 근거 기반</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {productStrategies.length ? (
              productStrategies.map((item) => (
                <div key={item.name} className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-950">{item.name}</div>
                    <Badge tone={item.score >= 0 ? "green" : "rose"}>{formatScore(item.score)}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.strategy}</p>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">제품별 영향 데이터가 없습니다.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>국가별 우선순위</CardTitle>
            <CardDescription>기회와 위험을 함께 본 영업·전략 우선순위</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {countryPriorities.length ? (
              countryPriorities.map((item) => (
                <div key={item.country} className="grid grid-cols-[1fr_auto] gap-3 rounded-md border p-4">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-950">
                      <Flag className="h-4 w-4 text-sky-700" />
                      {item.country}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      기회 {item.opportunity.toFixed(1)} / 위험 {item.risk.toFixed(1)} / 기사 {item.count}건
                    </div>
                  </div>
                  <Badge tone={item.priority === "공략" ? "green" : "amber"}>{item.priority}</Badge>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">국가별 우선순위 데이터가 없습니다.</div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              리스크 경고
            </CardTitle>
            <CardDescription>음수 시장 영향 기사</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {riskWarnings.length ? (
              riskWarnings.map((article) => (
                <div key={article.id} className="rounded-md border p-3">
                  <Badge tone="rose">{formatScore(article.adjustedMarketScore ?? article.marketImpactScore)}</Badge>
                  <p className="mt-2 text-sm font-medium text-slate-800">{article.title}</p>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">현재 강한 리스크 경고가 없습니다.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
              기회 요인
            </CardTitle>
            <CardDescription>양수 시장 영향 기사</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunityNews.length ? (
              opportunityNews.map((article) => (
                <div key={article.id} className="rounded-md border p-3">
                  <Badge tone="green">{formatScore(article.adjustedMarketScore ?? article.marketImpactScore)}</Badge>
                  <p className="mt-2 text-sm font-medium text-slate-800">{article.title}</p>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">현재 강한 기회 신호가 없습니다.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-sky-700" />
              영업 액션 아이템
            </CardTitle>
            <CardDescription>제품·국가 우선순위 기반</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {productStrategies.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-start gap-3 rounded-md border p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                <div className="text-sm text-slate-700">
                  <span className="font-semibold">{item.name}</span> 담당 영업팀에 {item.score >= 0 ? "기회" : "리스크"} 신호와 근거 기사를 공유
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>제품별 최근 근거 기사</CardTitle>
          <CardDescription>추천 전략이 어떤 기사와 연결되는지 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-md border bg-white p-4">
              <div className="font-semibold text-slate-950">{product.name}</div>
              <div className="mt-3 space-y-2">
                {product.productImpacts.slice(0, 3).map((impact: any) => (
                  <div key={impact.id} className="text-sm text-slate-600">
                    <Badge tone={impact.productImpactScore >= 0 ? "green" : "rose"}>
                      {formatScore(impact.productImpactScore)}
                    </Badge>
                    <div className="mt-1 line-clamp-2">{impact.article.title}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
