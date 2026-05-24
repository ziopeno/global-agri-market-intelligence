import { NextResponse } from "next/server";
import { generatePeriodStrategyFromAi } from "@/lib/ai";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PeriodStrategyResult = {
  headline: string;
  score_interpretation: string;
  dominant_signals: string[];
  product_strategy: string[];
  risks: string[];
  opportunities: string[];
  action_items: string[];
};

function factorScore(factor: { manualFactorScore: number | null; factorScore: number }) {
  return Number(factor.manualFactorScore ?? factor.factorScore ?? 0);
}

function fallbackStrategy(input: {
  periodLabel: string;
  totalMarketScore: number;
  topSignals: Array<{ name: string; score: number }>;
  topProducts: Array<{ name: string; score: number }>;
}): PeriodStrategyResult {
  const direction = input.totalMarketScore >= 0 ? "기회 우위" : "리스크 우위";
  const topSignal = input.topSignals[0]?.name || "주요 시장 신호";
  const topProduct = input.topProducts[0]?.name || "주요 제품";

  return {
    headline: `${input.periodLabel} 종합 판단: ${direction}`,
    score_interpretation: `선택 기간의 시장 영향 점수 합계는 ${input.totalMarketScore.toFixed(1)}점입니다. 가장 큰 신호는 ${topSignal}입니다.`,
    dominant_signals: input.topSignals.slice(0, 4).map((signal) => `${signal.name}: ${signal.score.toFixed(1)}점`),
    product_strategy: input.topProducts.slice(0, 4).map((product) => `${product.name}: ${product.score >= 0 ? "기회 확대" : "리스크 점검"} (${product.score.toFixed(1)}점)`),
    risks: input.totalMarketScore < 0 ? [`${topProduct} 관련 리스크 대응 우선순위를 점검하세요.`] : ["강한 하방 리스크는 제한적이나 규제·경쟁사 후속 뉴스를 확인하세요."],
    opportunities: input.totalMarketScore >= 0 ? [`${topProduct} 중심의 영업 메시지와 고객 타깃을 정리하세요.`] : ["단기 기회보다 방어 전략과 모니터링이 우선입니다."],
    action_items: [
      `${topSignal} 관련 기사 원문과 점수 근거를 검토합니다.`,
      `${topProduct} 담당자에게 선택 기간의 제품 영향 점수 합계를 공유합니다.`,
      "다음 Agro Weekly 업데이트 때 같은 신호가 반복되는지 확인합니다."
    ]
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const articleIds = Array.isArray(body.articleIds) ? body.articleIds.map(String).filter(Boolean) : [];
  if (!articleIds.length) {
    return NextResponse.json({ error: "articleIds are required" }, { status: 400 });
  }

  const articles = await prisma.article.findMany({
    where: { id: { in: articleIds } },
    include: {
      factors: true,
      productImpacts: {
        include: { product: true }
      }
    },
    orderBy: { publishedAt: "desc" }
  });

  const totalMarketScore = articles.reduce((total, article) => {
    const factorTotal = article.factors.reduce((sum, factor) => sum + factorScore(factor), 0);
    return total + (article.factors.length ? factorTotal : article.marketImpactScore);
  }, 0);

  const signalScores = new Map<string, number>();
  const productScores = new Map<string, number>();

  for (const article of articles) {
    for (const factor of article.factors) {
      signalScores.set(factor.factorName, Number(((signalScores.get(factor.factorName) || 0) + factorScore(factor)).toFixed(2)));
    }
    for (const impact of article.productImpacts) {
      productScores.set(
        impact.product.name,
        Number(((productScores.get(impact.product.name) || 0) + impact.productImpactScore).toFixed(2))
      );
    }
  }

  const topSignals = [...signalScores.entries()]
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 6);
  const topProducts = [...productScores.entries()]
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 6);

  const periodLabel = String(body.periodLabel || "선택 기간");
  const input = {
    periodType: body.periodType || "week",
    periodLabel,
    articleCount: articles.length,
    totalMarketScore,
    topSignals,
    topProducts,
    articles: articles.map((article) => ({
      id: article.id,
      title: article.title,
      source: article.source,
      country: article.country,
      category: article.category,
      summary: article.summary,
      marketImpactScore: article.marketImpactScore,
      factors: article.factors.map((factor) => ({
        factorName: factor.factorName,
        score: factorScore(factor),
        evidence: factor.evidence
      })),
      productImpacts: article.productImpacts.map((impact) => ({
        product: impact.product.name,
        score: impact.productImpactScore,
        rationale: impact.rationale
      }))
    }))
  };

  const aiStrategy = await generatePeriodStrategyFromAi<PeriodStrategyResult>(JSON.stringify(input, null, 2));
  const strategy = aiStrategy || fallbackStrategy({ periodLabel, totalMarketScore, topSignals, topProducts });

  return NextResponse.json({
    periodLabel,
    articleCount: articles.length,
    totalMarketScore,
    topSignals,
    topProducts,
    strategy
  });
}
