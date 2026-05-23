import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AnalyzeButton } from "@/components/analyze-button";
import { ArticleForm } from "@/components/article-form";
import { FactorScoreEditor } from "@/components/factor-score-editor";
import { NewsFetchButton } from "@/components/news-fetch-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getFallbackArticles } from "@/lib/fallback-data";
import { ensureProductSeeds } from "@/lib/seed";
import { formatDateTime, formatScore, scoreTone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  let articles: any[] = getFallbackArticles();
  let activeSourceCount = 0;

  try {
    await ensureProductSeeds();
    [articles, activeSourceCount] = await Promise.all([
      prisma.article.findMany({
        include: {
          newsSource: true,
          factors: true,
          productImpacts: {
            include: { product: true },
            orderBy: { productImpactScore: "desc" }
          }
        },
        orderBy: { publishedAt: "desc" },
        take: 100
      }),
      prisma.newsSource.count({ where: { isActive: true } })
    ]);
  } catch (error) {
    console.warn("News page fallback: database is not available.", error);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>자동 뉴스 수집</CardTitle>
            <CardDescription>등록된 active RSS source {activeSourceCount}개를 순회해 신규 기사만 저장하고 AI 분석까지 실행합니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Link
              href="/sources"
              className="inline-flex h-10 items-center rounded-md border bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              News Sources 관리
            </Link>
            <span className="text-sm text-slate-500">기본 흐름은 RSS 자동 수집입니다.</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Run News Fetch Now</CardTitle>
            <CardDescription>수집, 중복 제거, 분석, Daily Report 업데이트</CardDescription>
          </CardHeader>
          <CardContent>
            <NewsFetchButton />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Manual Add</CardTitle>
          <CardDescription>수동 입력은 자동 수집에서 누락된 기사 보완용입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <ArticleForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>기사 목록</CardTitle>
            <CardDescription>출처, 국가, 작물, 이슈 유형, 영향 점수, 관련 제품, 원문 링크, AI 요약</CardDescription>
          </div>
          <AnalyzeButton />
        </CardHeader>
        <CardContent className="space-y-4">
          {articles.length ? (
            articles.map((article) => {
              const relatedProducts = article.productImpacts
                .filter((impact: any) => impact.productImpactScore !== 0)
                .slice(0, 4);
              return (
                <article key={article.id} id={article.id} className="rounded-lg border bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{article.source}</Badge>
                    <Badge tone={article.fetchStatus === "fetched" ? "green" : "slate"}>{article.fetchStatus}</Badge>
                    <Badge tone={article.analysisStatus === "completed" ? "green" : article.analysisStatus === "failed" ? "rose" : "amber"}>
                      {article.analysisStatus}
                    </Badge>
                    {article.country && <Badge>{article.country}</Badge>}
                    {article.crop && <Badge tone="green">{article.crop}</Badge>}
                    {article.category && <Badge tone="amber">{article.category}</Badge>}
                    <span className={`rounded-sm border px-2 py-1 text-xs font-medium ${scoreTone(article.marketImpactScore)}`}>
                      {formatScore(article.marketImpactScore)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-slate-950">{article.title}</h2>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDateTime(article.publishedAt)}
                        {article.newsSource && ` · ${article.newsSource.name}`}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{article.summary || "AI 분석 전입니다."}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <AnalyzeButton articleId={article.id} />
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                        원문
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-md border bg-slate-50 p-3">
                      <div className="mb-2 text-sm font-semibold">요인별 점수 근거</div>
                      <div className="space-y-2">
                        {article.factors.length ? (
                          article.factors.map((factor: any) => (
                            <div key={factor.id} className="text-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-slate-800">{factor.factorName}</span>
                                <FactorScoreEditor
                                  factorId={factor.id}
                                  value={factor.manualFactorScore ?? factor.factorScore}
                                />
                              </div>
                              <p className="mt-1 text-xs leading-5 text-slate-500">{factor.evidence}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-slate-500">추출된 요인이 없습니다.</div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-md border bg-slate-50 p-3">
                      <div className="mb-2 text-sm font-semibold">관련 제품 영향</div>
                      <div className="flex flex-wrap gap-2">
                        {relatedProducts.length ? (
                          relatedProducts.map((impact: any) => (
                            <Badge key={impact.id} tone={impact.productImpactScore >= 0 ? "green" : "rose"}>
                              {impact.product.name} {formatScore(impact.productImpactScore)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">제품 민감도와 연결된 점수가 없습니다.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-slate-500">아직 저장된 기사가 없습니다.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
