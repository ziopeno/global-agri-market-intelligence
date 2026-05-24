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
    evidence: raw.evidence || "기사 본문에서 직접 또는 간접적으로 추출된 시장 신호입니다."
  };
}

export function sumMarketImpact(factors: Array<{ factor_score: number }>) {
  return Number(factors.reduce((total, factor) => total + Number(factor.factor_score || 0), 0).toFixed(2));
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
