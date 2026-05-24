import { clamp } from "@/lib/utils";
import type { ExtractedFactor } from "@/lib/types";

export function computeFactorScore(input: {
  direction: number;
  impact: number;
  likelihood: number;
  duration: number;
  reliability: number;
}) {
  const direction = input.direction >= 0 ? 1 : -1;
  const impact = clamp(Math.round(input.impact), 1, 5);
  const likelihood = clamp(Math.round(input.likelihood), 1, 5);
  const duration = [1, 1.3, 1.6].includes(input.duration) ? input.duration : 1;
  const reliability = [1, 0.8, 0.6, 0.4].includes(input.reliability) ? input.reliability : 0.8;
  return Number((direction * impact * likelihood * duration * reliability).toFixed(2));
}

export function computeAdjustedFactorScore(input: {
  factorScore: number;
  marketSizeWeight: number;
  productRelevanceWeight: number;
  recencyWeight: number;
  evidenceStrength: number;
}) {
  return Number((
    input.factorScore *
    input.marketSizeWeight *
    input.productRelevanceWeight *
    input.recencyWeight *
    input.evidenceStrength
  ).toFixed(2));
}

export function computeRecencyWeight(publishedAt: Date | string) {
  const ageDays = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / (24 * 60 * 60 * 1000));
  if (ageDays <= 7) return 1.2;
  if (ageDays <= 30) return 1;
  if (ageDays <= 90) return 0.85;
  return 0.7;
}

export function computeEvidenceStrength(input: { supportingArticleCount: number; reliability: number }) {
  const supportBonus = Math.min(Math.max(input.supportingArticleCount - 1, 0), 5) * 0.05;
  const officialBonus = input.reliability >= 1 ? 0.1 : 0;
  return Number(clamp(1 + supportBonus + officialBonus, 0.8, 1.35).toFixed(2));
}

export function effectiveFactorScore(factor: { manualFactorScore?: number | null; factorScore: number }) {
  return Number(factor.manualFactorScore ?? factor.factorScore ?? 0);
}

export function normalizeFactor(raw: Partial<ExtractedFactor>): ExtractedFactor {
  const direction = raw.direction === -1 ? -1 : 1;
  const impact = clamp(Math.round(Number(raw.impact ?? 3)), 1, 5);
  const likelihood = clamp(Math.round(Number(raw.likelihood ?? 3)), 1, 5);
  const duration = [1, 1.3, 1.6].includes(Number(raw.duration)) ? Number(raw.duration) : 1;
  const reliability = [1, 0.8, 0.6, 0.4].includes(Number(raw.reliability))
    ? Number(raw.reliability)
    : 0.8;
  const factorScore = computeFactorScore({ direction, impact, likelihood, duration, reliability });

  return {
    factor_name: raw.factor_name || "작물 가격",
    direction,
    impact,
    likelihood,
    duration,
    reliability,
    factor_score: factorScore,
    evidence: raw.evidence || "기사 본문에서 직접 또는 간접적으로 추출된 시장 신호입니다.",
    confidence: clamp(Number(raw.confidence ?? 0.7), 0, 1)
  };
}

export function sumMarketImpact(factors: Array<{ factor_score: number }>) {
  return Number(factors.reduce((total, factor) => total + Number(factor.factor_score || 0), 0).toFixed(2));
}

export function sumAdjustedMarketImpact(factors: Array<{ adjusted_factor_score?: number; factor_score: number }>) {
  return Number(
    factors.reduce((total, factor) => {
      const score = Number(factor.adjusted_factor_score ?? factor.factor_score ?? 0);
      return total + score;
    }, 0).toFixed(2)
  );
}

export function computeProductImpact(
  factors: ExtractedFactor[],
  sensitivityByFactor: Record<string, number>
) {
  const weightedScore = factors.reduce((total, factor) => {
    const sensitivity = Number(sensitivityByFactor[factor.factor_name] ?? 0);
    return total + factor.factor_score * sensitivity;
  }, 0);

  const activeSensitivities = factors
    .map((factor) => Number(sensitivityByFactor[factor.factor_name] ?? 0))
    .filter((value) => value !== 0);

  const sensitivityScore =
    activeSensitivities.length === 0
      ? 0
      : activeSensitivities.reduce((total, value) => total + value, 0) / activeSensitivities.length;

  return {
    sensitivityScore: Number(sensitivityScore.toFixed(2)),
    productImpactScore: Number(weightedScore.toFixed(2))
  };
}
