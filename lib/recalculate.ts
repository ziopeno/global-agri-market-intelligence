import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateAdjustedFactor } from "@/lib/score-adjustments";
import { computeProductImpact, effectiveFactorScore } from "@/lib/scoring";

export async function recalculateArticleScores(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { factors: true }
  });
  if (!article) throw new Error("Article not found");

  const [products, countryWeight] = await Promise.all([
    prisma.product.findMany({ include: { sensitivities: true } }),
    prisma.countryBusinessWeight.findUnique({
      where: { country: article.country || "Global" }
    })
  ]);

  const updatedFactors = [];
  for (const factor of article.factors) {
    const supportingArticleFilters = [
      article.country ? { country: article.country } : null,
      article.crop ? { crop: article.crop } : null
    ].filter(Boolean) as Array<{ country?: string; crop?: string }>;
    const supportingArticleCount = await prisma.articleFactor.count({
      where: {
        factorName: factor.factorName,
        ...(supportingArticleFilters.length
          ? { article: { OR: supportingArticleFilters } }
          : {})
      }
    });
    const adjusted = calculateAdjustedFactor({
      article,
      factor,
      countryWeight,
      products,
      supportingArticleCount
    });
    updatedFactors.push(
      await prisma.articleFactor.update({
        where: { id: factor.id },
        data: {
          marketSizeWeight: adjusted.marketSizeWeight,
          productRelevanceWeight: adjusted.productRelevanceWeight,
          recencyWeight: adjusted.recencyWeight,
          evidenceStrength: adjusted.evidenceStrength,
          adjustedFactorScore: adjusted.adjustedFactorScore
        }
      })
    );
  }

  const rawMarketImpactScore = Number(
    updatedFactors.reduce((total, factor) => total + effectiveFactorScore(factor), 0).toFixed(2)
  );
  const adjustedMarketScore = Number(
    updatedFactors.reduce((total, factor) => total + Number(factor.adjustedFactorScore || 0), 0).toFixed(2)
  );

  await prisma.article.update({
    where: { id: articleId },
    data: {
      marketImpactScore: rawMarketImpactScore,
      adjustedMarketScore
    }
  });

  await prisma.articleAnalysis.update({
    where: { articleId },
    data: {
      marketImpactScore: rawMarketImpactScore,
      adjustedMarketScore
    }
  }).catch(() => undefined);

  await prisma.productImpact.deleteMany({ where: { articleId } });
  for (const product of products) {
    const sensitivityByFactor = Object.fromEntries(
      product.sensitivities.map((sensitivity) => [sensitivity.factorName, sensitivity.sensitivityScore])
    );
    const adjustedFactors = updatedFactors.map((factor) => ({
      factor_name: factor.factorName,
      direction: factor.direction as 1 | -1,
      impact: factor.impact,
      likelihood: factor.likelihood,
      duration: factor.duration,
      reliability: factor.reliability,
      factor_score: factor.adjustedFactorScore || effectiveFactorScore(factor),
      evidence: factor.evidence || ""
    }));
    const productImpact = computeProductImpact(adjustedFactors, sensitivityByFactor);
    const rationale = adjustedFactors
      .filter((factor) => Number(sensitivityByFactor[factor.factor_name] ?? 0) !== 0)
      .slice(0, 3)
      .map((factor) => {
        const sensitivity = Number(sensitivityByFactor[factor.factor_name] ?? 0).toFixed(2);
        return `${factor.factor_name}: adjusted ${factor.factor_score.toFixed(1)} x sensitivity ${sensitivity}`;
      })
      .join("; ");

    await prisma.productImpact.create({
      data: {
        productId: product.id,
        articleId,
        marketImpactScore: adjustedMarketScore || rawMarketImpactScore,
        sensitivityScore: productImpact.sensitivityScore,
        productImpactScore: productImpact.productImpactScore,
        rationale: rationale || "해당 기사 요인과 직접 연결된 민감도가 낮습니다."
      }
    });
  }

  return {
    rawMarketImpactScore,
    adjustedMarketScore,
    factors: updatedFactors
  };
}

export function revisionValues(input: {
  direction: number;
  impact: number;
  likelihood: number;
  duration: number;
  reliability: number;
  factorScore: number;
  manualFactorScore?: number | null;
  evidence?: string | null;
}) {
  return {
    direction: input.direction,
    impact: input.impact,
    likelihood: input.likelihood,
    duration: input.duration,
    reliability: input.reliability,
    factorScore: input.factorScore,
    manualFactorScore: input.manualFactorScore ?? null,
    evidence: input.evidence ?? null
  } satisfies Prisma.InputJsonObject;
}
