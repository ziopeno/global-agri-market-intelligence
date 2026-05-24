"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { BarChart3, ChevronDown, ExternalLink, ListChecks, Sparkles } from "lucide-react";
import { AnalyzeButton } from "@/components/analyze-button";
import { FactorScoreEditor } from "@/components/factor-score-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatScore, scoreTone } from "@/lib/utils";

const FARMHANNONG_AGRO_WEEKLY_URL = "https://ziopeno.github.io/farmhannong-agro-weekly-db/";

type PeriodType = "week" | "month" | "quarter" | "year";

type ArticleRow = any;

type PeriodOption = {
  key: string;
  label: string;
  sortValue: string;
  articleIds: string[];
};

function factorScoreValue(factor: any) {
  return Number(factor.manualFactorScore ?? factor.factorScore ?? 0);
}

function articleMarketScore(article: ArticleRow) {
  const factors = article.factors || [];
  if (!factors.length) return Number(article.marketImpactScore || 0);
  return factors.reduce((sum: number, factor: any) => sum + factorScoreValue(factor), 0);
}

function signedFormula(factor: any) {
  const direction = Number(factor.direction || 0);
  const sign = direction > 0 ? "+1" : "-1";
  const reliability = Number(factor.reliability || 0).toFixed(1);
  return `${sign} x Impact ${factor.impact} x Likelihood ${factor.likelihood} x Duration ${factor.duration} x Reliability ${reliability}x`;
}

function buildMarketImpactReason(article: ArticleRow) {
  const factors = article.factors || [];
  if (!factors.length) {
    return {
      total: Number(article.marketImpactScore || 0),
      formula: "아직 추출된 시장 요인이 없어 점수 산식 근거가 없습니다.",
      topFactors: []
    };
  }

  const total = articleMarketScore(article);
  const topFactors = [...factors]
    .sort((a: any, b: any) => Math.abs(factorScoreValue(b)) - Math.abs(factorScoreValue(a)))
    .slice(0, 4);

  return {
    total,
    formula: "기사에서 추출된 핵심 요인과 근거입니다. Impact와 Likelihood의 1~5점 기준, Reliability 보정계수 기준은 사용법 탭에서 확인할 수 있습니다.",
    topFactors
  };
}

function isWeeklyCardArticle(article: ArticleRow) {
  const sourceName = article.newsSource?.name || "";
  const rawContent = article.rawContent || article.originalText || "";
  return sourceName.includes("Farmhannong Agro Weekly") || rawContent.includes("카드뉴스 요약:");
}

function extractBetween(text: string, label: string, nextLabels: string[]) {
  const start = text.indexOf(label);
  if (start < 0) return "";
  const valueStart = start + label.length;
  const nextIndexes = nextLabels
    .map((nextLabel) => text.indexOf(nextLabel, valueStart))
    .filter((index) => index >= 0);
  const valueEnd = nextIndexes.length ? Math.min(...nextIndexes) : text.length;
  return text.slice(valueStart, valueEnd).trim();
}

function parseWeeklyCardContent(article: ArticleRow) {
  const rawContent = article.rawContent || article.originalText || "";
  const labels = ["원문 제목:", "원문 요약:", "카드뉴스 요약:", "관련 기업:", "검색 키워드:"];
  const cardSummary = extractBetween(rawContent, "카드뉴스 요약:", ["관련 기업:", "검색 키워드:"]);
  return {
    rawTitle: extractBetween(rawContent, "원문 제목:", labels.filter((label) => label !== "원문 제목:")) || article.title,
    rawSummary: extractBetween(rawContent, "원문 요약:", labels.filter((label) => label !== "원문 요약:")) || article.summary,
    cardSummary,
    company: extractBetween(rawContent, "관련 기업:", ["검색 키워드:"]),
    keywords: extractBetween(rawContent, "검색 키워드:", []),
    bullets: cardSummary
      .split(/\n|•/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4)
  };
}

function kstParts(dateValue: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(dateValue));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

function formatYmd(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function weekStartYmd(dateValue: Date | string) {
  const { year, month, day } = kstParts(dateValue);
  const pureDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = pureDate.getUTCDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  pureDate.setUTCDate(pureDate.getUTCDate() - diffToMonday);
  return formatYmd(pureDate.getUTCFullYear(), pureDate.getUTCMonth() + 1, pureDate.getUTCDate());
}

function periodKey(article: ArticleRow, periodType: PeriodType) {
  const { year, month } = kstParts(article.publishedAt);
  if (periodType === "week") return weekStartYmd(article.publishedAt);
  if (periodType === "month") return `${year}-${String(month).padStart(2, "0")}`;
  if (periodType === "quarter") return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
  return String(year);
}

function periodLabel(key: string, periodType: PeriodType) {
  if (periodType === "week") return `${key} 주차`;
  if (periodType === "month") return `${key} 월간`;
  if (periodType === "quarter") return `${key.replace("-Q", " Q")} 분기`;
  return `${key} 연간`;
}

function periodSortValue(key: string, periodType: PeriodType) {
  if (periodType === "quarter") {
    const [year, quarter] = key.split("-Q");
    return `${year}-${String((Number(quarter) - 1) * 3 + 1).padStart(2, "0")}`;
  }
  return key;
}

function buildPeriodOptions(articles: ArticleRow[], periodType: PeriodType): PeriodOption[] {
  const groups = new Map<string, string[]>();
  for (const article of articles) {
    const key = periodKey(article, periodType);
    groups.set(key, [...(groups.get(key) || []), article.id]);
  }

  return [...groups.entries()]
    .map(([key, articleIds]) => ({
      key,
      label: `${periodLabel(key, periodType)} (${articleIds.length}건)`,
      sortValue: periodSortValue(key, periodType),
      articleIds
    }))
    .sort((a, b) => b.sortValue.localeCompare(a.sortValue));
}

function weeklyCardWeekDate(article: ArticleRow) {
  return weekStartYmd(article.publishedAt);
}

function weeklyCardUrl(weekDate: string) {
  return `${FARMHANNONG_AGRO_WEEKLY_URL}#${weekDate}`;
}

function strongestFactor(factors: any[]) {
  return [...factors].sort((a, b) => Math.abs(factorScoreValue(b)) - Math.abs(factorScoreValue(a)))[0] || null;
}

function topProductImpact(productImpacts: any[]) {
  return [...productImpacts]
    .filter((impact) => impact.productImpactScore !== 0)
    .sort((a, b) => Math.abs(b.productImpactScore) - Math.abs(a.productImpactScore))[0] || null;
}

function farmhannongStrategy(article: ArticleRow) {
  const topProduct = topProductImpact(article.productImpacts || []);
  const factor = strongestFactor(article.factors || []);
  const productName = topProduct?.product?.name || "관련 제품";
  const productScore = Number(topProduct?.productImpactScore || 0);
  const factorName = factor?.factorName || article.category || "시장 신호";
  const country = article.country || "해당 시장";

  if (!topProduct) {
    return `${country}의 ${factorName} 신호는 제품 직접 영향이 아직 낮습니다. 팜한농은 추가 기사와 경쟁사 후속 발표를 모니터링하는 관찰 과제로 관리합니다.`;
  }

  if (article.category === "등록/규제 이슈" || factorName.includes("등록")) {
    return `${productName} 관련 등록·규제 리스크를 우선 점검하고, ${country} 영업·등록 담당자가 대응 자료와 대체 시나리오를 준비합니다.`;
  }

  if (article.category === "경쟁사 동향" || factorName.includes("경쟁")) {
    return productScore >= 0
      ? `${productName}의 차별화 메시지를 강화하고, ${country}에서 경쟁사 움직임에 대응할 영업 포인트를 선제 정리합니다.`
      : `${productName}에 불리한 경쟁 신호입니다. 가격, 효능, 공급 안정성 중 방어 포인트를 정하고 주요 고객 이탈 가능성을 점검합니다.`;
  }

  if (productScore >= 4) {
    return `${productName}에 강한 기회 신호입니다. ${country} 고객 대상 수요 촉진 메시지, 재고 배분, 단기 영업 액션을 우선 실행합니다.`;
  }

  if (productScore > 0) {
    return `${productName}에 긍정 신호가 있습니다. ${country} 시장에서 관련 작물·고객군 반응을 확인하고 영업팀 공유 자료에 반영합니다.`;
  }

  return `${productName}에 리스크 신호가 있습니다. 원가, 규제, 수요 둔화 가능성을 점검하고 영업 메시지를 보수적으로 조정합니다.`;
}

function SelectShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function PeriodAiPanel({
  articles,
  periodType,
  periodLabelValue,
  totalScore
}: {
  articles: ArticleRow[];
  periodType: PeriodType;
  periodLabelValue: string;
  totalScore: number;
}) {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function requestInsight() {
    setError("");
    setIsLoading(true);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/insights/period", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              periodType,
              periodLabel: periodLabelValue,
              articleIds: articles.map((article) => article.id)
            })
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "AI 전략 조회 실패");
          setResult(payload);
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "AI 전략 조회 실패");
        } finally {
          setIsLoading(false);
        }
      })();
    });
  }

  return (
    <div className="rounded-md border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-950">AI 종합 전략 조회</div>
          <div className="text-xs text-slate-500">선택 기간 총점과 전략을 요약합니다.</div>
        </div>
        <span className={`shrink-0 rounded-sm border px-2 py-1 text-xs font-semibold ${scoreTone(totalScore)}`}>
          합계 {formatScore(totalScore)}
        </span>
      </div>
      <Button
        type="button"
        data-testid="period-ai-strategy-button"
        className="mt-3 w-full gap-2"
        onClick={requestInsight}
        disabled={isLoading || isPending || !articles.length}
      >
        <Sparkles className="h-4 w-4" />
        {isLoading || isPending ? "AI 조회 중" : "선택 기간 전략 조회"}
      </Button>
      {error && <div className="mt-3 text-xs text-rose-600">{error}</div>}
      {result?.strategy && (
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-700">
          <div className="font-semibold text-slate-950">{result.strategy.headline}</div>
          <p>{result.strategy.score_interpretation}</p>
          <div>
            <div className="font-semibold text-slate-950">팜한농 전략</div>
            <ul className="mt-1 space-y-1">
              {(result.strategy.product_strategy || []).slice(0, 3).map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold text-slate-950">액션</div>
            <ul className="mt-1 space-y-1">
              {(result.strategy.action_items || []).slice(0, 3).map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklyCardAnalysis({ article, relatedProducts, marketImpactReason }: {
  article: ArticleRow;
  relatedProducts: any[];
  marketImpactReason: ReturnType<typeof buildMarketImpactReason>;
}) {
  const card = parseWeeklyCardContent(article);
  const factor = strongestFactor(article.factors || []);
  const product = topProductImpact(article.productImpacts || []);
  const strategy = farmhannongStrategy(article);
  const weekDate = weeklyCardWeekDate(article);

  return (
    <div className="mt-4 border-t border-dashed pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="green">Farmhannong Weekly DB 기반</Badge>
        <span className="text-xs text-slate-500">카드뉴스 원문 요약에서 시장 신호와 제품 전략을 추출했습니다.</span>
      </div>

      <div className="rounded-md border-2 border-emerald-700 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
          <div className="text-sm font-black text-emerald-800">Farmhannong Agro Weekly Card News</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800">
              {weekDate} 주차
            </span>
            <a
              href={weeklyCardUrl(weekDate)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              해당 주차 Agro Weekly
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {card.company && <Badge tone="slate">{card.company}</Badge>}
            {article.country && <Badge tone="blue">{article.country}</Badge>}
            {article.category && <Badge tone="amber">{article.category}</Badge>}
          </div>
        </div>
        <div className="p-4">
          <div className="text-base font-bold leading-7 text-slate-950">{card.rawTitle}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{card.rawSummary}</p>
          {card.bullets.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {card.bullets.slice(0, 3).map((bullet) => (
                <div key={bullet} className="rounded-md border bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                  {bullet}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="mx-auto w-full rounded-md border bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-500">1. 카드뉴스 출처</div>
          <div className="mt-1 text-sm font-semibold text-slate-950">{article.source}</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">{card.keywords || "카드뉴스 원문 제목과 요약을 기반으로 분석했습니다."}</p>
        </div>

        <div className="mx-auto w-[92%] rounded-md border bg-sky-50 p-3">
          <div className="text-xs font-semibold text-sky-700">2. 시장 신호 추출</div>
          <div className="mt-1 text-sm font-semibold text-slate-950">
            {factor?.factorName || article.category || "시장 신호"} {factor ? formatScore(factorScoreValue(factor)) : formatScore(article.marketImpactScore)}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">{factor?.evidence || article.summary || "기사 요약에서 핵심 시장 변수를 추출했습니다."}</p>
        </div>

        <div className="mx-auto w-[80%] rounded-md border bg-emerald-50 p-3">
          <div className="text-xs font-semibold text-emerald-700">3. 점수화</div>
          <div className="mt-1 text-sm font-semibold text-slate-950">Market Impact {formatScore(marketImpactReason.total)}</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {factor ? `${signedFormula(factor)} = ${formatScore(factorScoreValue(factor))}` : "추출된 요인을 합산해 시장 영향 점수를 계산했습니다."}
          </p>
        </div>

        <div className="mx-auto w-[68%] rounded-md border bg-amber-50 p-3">
          <div className="text-xs font-semibold text-amber-700">4. 제품 영향 연결</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {relatedProducts.length ? (
              relatedProducts.slice(0, 3).map((impact: any) => (
                <Badge key={impact.id} tone={impact.productImpactScore >= 0 ? "green" : "rose"}>
                  {impact.product.name} {formatScore(impact.productImpactScore)}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-slate-600">연결된 제품 영향이 낮습니다.</span>
            )}
          </div>
          {product?.rationale && <p className="mt-2 text-xs leading-5 text-slate-600">{product.rationale}</p>}
        </div>

        <div className="mx-auto w-[56%] min-w-[280px] rounded-md border-2 border-emerald-600 bg-emerald-700 p-4 text-white">
          <div className="text-xs font-semibold text-emerald-100">5. 팜한농 전략 결론</div>
          <p className="mt-2 text-sm font-semibold leading-6">{strategy}</p>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: ArticleRow }) {
  const factors = article.factors || [];
  const relatedProducts = (article.productImpacts || [])
    .filter((impact: any) => impact.productImpactScore !== 0)
    .slice(0, 4);
  const marketImpactReason = buildMarketImpactReason(article);
  const weeklyCardArticle = isWeeklyCardArticle(article);

  return (
    <article id={`article-${article.id}`} className="scroll-mt-64 rounded-lg border bg-white p-4">
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
            {factors.length ? (
              factors.map((factor: any) => (
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
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {weeklyCardArticle && (
        <WeeklyCardAnalysis
          article={article}
          relatedProducts={relatedProducts}
          marketImpactReason={marketImpactReason}
        />
      )}
    </article>
  );
}

export function NewsPeriodWorkspace({ articles }: { articles: ArticleRow[] }) {
  const [periodType, setPeriodType] = useState<PeriodType>("week");
  const periodOptions = useMemo(() => buildPeriodOptions(articles, periodType), [articles, periodType]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");
  const selectedPeriod = periodOptions.find((option) => option.key === selectedPeriodKey) || periodOptions[0];

  useEffect(() => {
    if (periodOptions.length && !periodOptions.some((option) => option.key === selectedPeriodKey)) {
      setSelectedPeriodKey(periodOptions[0].key);
    }
  }, [periodOptions, selectedPeriodKey]);

  const selectedArticles = useMemo(() => {
    if (!selectedPeriod) return [];
    const selectedIds = new Set(selectedPeriod.articleIds);
    return articles.filter((article) => selectedIds.has(article.id));
  }, [articles, selectedPeriod]);

  const totalScore = selectedArticles.reduce((sum, article) => sum + articleMarketScore(article), 0);

  function jumpToArticle(articleId: string) {
    document.getElementById(`article-${articleId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="space-y-4">
      <div className="sticky top-[64px] z-30 rounded-md border bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="grid gap-4 lg:grid-cols-[1.45fr_0.95fr]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <ListChecks className="h-4 w-4 text-emerald-700" />
                  기사 목록
                </div>
                <p className="mt-1 text-xs text-slate-500">주별, 월별, 분기별, 연도별로 카드뉴스 연계 기사를 선택합니다.</p>
              </div>
              <span className={`rounded-sm border px-2 py-1 text-xs font-semibold ${scoreTone(totalScore)}`}>
                선택 합계 {formatScore(totalScore)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {([
                ["week", "주별"],
                ["month", "월별"],
                ["quarter", "분기별"],
                ["year", "연도별"]
              ] as Array<[PeriodType, string]>).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  data-testid={`period-type-${value}`}
                  variant={periodType === value ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setPeriodType(value)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.4fr]">
              <SelectShell>
                <select
                  data-testid="period-select"
                  value={selectedPeriod?.key || ""}
                  onChange={(event) => setSelectedPeriodKey(event.target.value)}
                  className="h-10 w-full appearance-none rounded-md border bg-white px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {periodOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </SelectShell>
              <SelectShell>
                <select
                  data-testid="article-jump-select"
                  value=""
                  onChange={(event) => {
                    if (event.target.value) jumpToArticle(event.target.value);
                  }}
                  className="h-10 w-full appearance-none rounded-md border bg-white px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">기사 하나씩 선택해서 이동</option>
                  {selectedArticles.map((article) => (
                    <option key={article.id} value={article.id}>
                      {article.title}
                    </option>
                  ))}
                </select>
              </SelectShell>
            </div>

            <div className="mt-3 flex max-h-20 flex-wrap gap-2 overflow-y-auto">
              {selectedArticles.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => jumpToArticle(article.id)}
                  className="inline-flex max-w-[260px] items-center gap-2 truncate rounded-md border bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                >
                  <BarChart3 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span className="truncate">{article.title}</span>
                </button>
              ))}
            </div>
          </div>

          <PeriodAiPanel
            articles={selectedArticles}
            periodType={periodType}
            periodLabelValue={selectedPeriod?.label || "선택 기간"}
            totalScore={totalScore}
          />
        </div>
      </div>

      <div className="space-y-4">
        {selectedArticles.length ? (
          selectedArticles.map((article) => <ArticleCard key={article.id} article={article} />)
        ) : (
          <div className="rounded-md border border-dashed p-6 text-sm text-slate-500">선택한 기간에 저장된 기사가 없습니다.</div>
        )}
      </div>
    </section>
  );
}
