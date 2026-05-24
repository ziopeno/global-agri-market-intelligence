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

function factorScoreValue(factor: any) {
  return Number(factor.manualFactorScore ?? factor.factorScore ?? 0);
}

function signedFormula(factor: any) {
  const direction = Number(factor.direction || 0);
  const sign = direction > 0 ? "+1" : "-1";
  return `${sign} x ${factor.impact} x ${factor.likelihood} x ${factor.duration} x ${factor.reliability}`;
}

function levelLabel(value: number) {
  if (value >= 5) return "매우 높음";
  if (value >= 4) return "높음";
  if (value >= 3) return "보통";
  if (value >= 2) return "낮음";
  return "매우 낮음";
}

function impactLogic(value: number) {
  if (value >= 5) return "여러 국가·작물·제품군에 동시에 영향을 줄 수 있어 매우 높게 봤습니다.";
  if (value >= 4) return "가격, 공급, 규제, 생산능력처럼 시장을 직접 움직이는 변수라 높게 봤습니다.";
  if (value >= 3) return "시장 변수와 연결되지만 영향 범위가 특정 지역·제품에 머물러 보통으로 봤습니다.";
  if (value >= 2) return "시장과 관련은 있으나 직접적인 판매·수요 영향은 제한적으로 봤습니다.";
  return "시장 영향이 아직 간접적이거나 기사 근거가 제한적이라 낮게 봤습니다.";
}

function likelihoodLogic(value: number) {
  if (value >= 5) return "이미 발생했거나 공식 발표·확정 정보에 가까워 매우 높게 봤습니다.";
  if (value >= 4) return "구체적 발표, 수치, 실행 일정이 있어 발생 가능성을 높게 봤습니다.";
  if (value >= 3) return "가능성은 확인되지만 전망·관측 성격이 있어 보통으로 봤습니다.";
  if (value >= 2) return "초기 신호 수준이라 실제 시장 변화로 이어질지는 낮게 봤습니다.";
  return "추정 또는 불확실한 언급에 가까워 가능성을 매우 낮게 봤습니다.";
}

function directionLogic(value: number) {
  return value >= 0
    ? "수요 확대, 공급 안정, 가격 개선 등 기회 방향으로 해석했습니다."
    : "수요 위축, 공급 차질, 비용 증가, 규제 강화 등 리스크 방향으로 해석했습니다.";
}

function durationLogic(value: number) {
  if (value >= 1.6) return "구조 변화나 규제·설비·재배면적처럼 장기 영향 가능성이 있어 장기로 봤습니다.";
  if (value >= 1.3) return "한 시즌 또는 몇 달 이상 이어질 수 있어 중기로 봤습니다.";
  return "단기 뉴스 또는 즉시성 이슈라 단기로 봤습니다.";
}

function reliabilityLogic(value: number) {
  if (value >= 1) return "정부·공식기관·국제기구급 출처라 신뢰도를 가장 높게 반영했습니다.";
  if (value >= 0.8) return "주요 언론·전문지 출처라 비교적 높은 신뢰도로 반영했습니다.";
  if (value >= 0.6) return "업계지·기업 발표 성격이라 중간 신뢰도로 반영했습니다.";
  return "출처 검증이 제한적이라 낮은 신뢰도로 반영했습니다.";
}

function factorLogicLines(factor: any) {
  return [
    `방향: ${directionLogic(Number(factor.direction || 0))}`,
    `Impact ${factor.impact}/5 (${levelLabel(Number(factor.impact || 0))}): ${impactLogic(Number(factor.impact || 0))}`,
    `Likelihood ${factor.likelihood}/5 (${levelLabel(Number(factor.likelihood || 0))}): ${likelihoodLogic(Number(factor.likelihood || 0))}`,
    `기간 보정 ${factor.duration}: ${durationLogic(Number(factor.duration || 0))}`,
    `출처 신뢰도 ${factor.reliability}: ${reliabilityLogic(Number(factor.reliability || 0))}`
  ];
}

function buildMarketImpactReason(article: any) {
  const factors = article.factors || [];
  if (!factors.length) {
    return {
      total: Number(article.marketImpactScore || 0),
      formula: "아직 추출된 시장 요인이 없어 점수 산식 근거가 없습니다.",
      topFactors: []
    };
  }

  const total = factors.reduce((sum: number, factor: any) => sum + factorScoreValue(factor), 0);
  const topFactors = [...factors]
    .sort((a: any, b: any) => Math.abs(factorScoreValue(b)) - Math.abs(factorScoreValue(a)))
    .slice(0, 4);

  return {
    total,
    formula: "아래 점수는 기사 근거를 기준으로 영향 범위(Impact)와 발생 확실성(Likelihood)을 먼저 판단하고, 기간과 출처 신뢰도로 보정한 결과입니다.",
    topFactors
  };
}

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
            <CardDescription>등록된 active Weekly DB/RSS source {activeSourceCount}개를 순회해 신규 기사만 저장하고 AI 분석까지 실행합니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Link
              href="/sources"
              className="inline-flex h-10 items-center rounded-md border bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              News Sources 관리
            </Link>
            <span className="text-sm text-slate-500">기본 흐름은 Farmhannong Weekly DB와 RSS 자동 수집입니다.</span>
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
              const marketImpactReason = buildMarketImpactReason(article);
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
                  <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-emerald-950">시장 영향 점수 책정 이유</div>
                      <span className={`rounded-sm border px-2 py-1 text-xs font-medium ${scoreTone(marketImpactReason.total)}`}>
                        합산 {formatScore(marketImpactReason.total)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-emerald-900">{marketImpactReason.formula}</p>
                    {marketImpactReason.topFactors.length ? (
                      <div className="mt-3 space-y-2">
                        {marketImpactReason.topFactors.map((factor: any) => (
                          <div key={factor.id} className="rounded-md bg-white/75 p-2 text-xs leading-5 text-slate-700">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900">{factor.factorName}</span>
                              <span className="font-mono text-slate-600">
                                {signedFormula(factor)} = {formatScore(factorScoreValue(factor))}
                              </span>
                            </div>
                            <p className="mt-1 text-slate-600">근거: {factor.evidence || "AI가 기사 제목/본문에서 해당 시장 요인을 추출했습니다."}</p>
                            <div className="mt-2 space-y-1 text-slate-600">
                              {factorLogicLines(factor).map((line) => (
                                <p key={line}>{line}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
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
