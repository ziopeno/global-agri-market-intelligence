import { MARKET_FACTORS } from "@/lib/constants";
import {
  computeAdjustedFactorScore,
  computeEvidenceStrength,
  computeRecencyWeight,
  effectiveFactorScore
} from "@/lib/scoring";
import { clamp } from "@/lib/utils";

type ArticleLike = {
  country?: string | null;
  crop?: string | null;
  publishedAt: Date | string;
};

type ProductLike = {
  targetCrop?: string | null;
  targetCountry?: string | null;
  category?: string | null;
};

type FactorLike = {
  factorName?: string;
  factor_name?: string;
  reliability: number;
  factorScore?: number;
  factor_score?: number;
  manualFactorScore?: number | null;
};

type CountryWeightLike = {
  marketSizeWeight: number;
};

function normalized(value?: string | null) {
  return String(value || "").toLowerCase();
}

function cropMatches(articleCrop: string | null | undefined, targetCrop: string | null | undefined) {
  const crop = normalized(articleCrop);
  const target = normalized(targetCrop);
  if (!crop || !target || target === "global") return false;
  return target
    .split(/[\/,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .some((item) => crop.includes(item) || item.includes(crop));
}

function countryMatches(articleCountry: string | null | undefined, targetCountry: string | null | undefined) {
  const country = normalized(articleCountry);
  const target = normalized(targetCountry);
  if (!target || target === "global") return true;
  if (!country) return false;
  if (target === "asia") return ["vietnam", "philippines", "thailand", "indonesia", "india", "china", "한국", "일본"].some((item) => country.includes(item));
  return country.includes(target) || target.includes(country);
}

function factorCategoryMatch(factorName: string, product: ProductLike) {
  const category = normalized(product.category);
  if (factorName.includes("잡초") || factorName.includes("재배면적")) return category.includes("herbicide");
  if (factorName.includes("병해충")) return category.includes("insecticide") || category.includes("fungicide");
  if (factorName.includes("홍수") || factorName.includes("가뭄")) return true;
  if (factorName.includes("등록") || factorName.includes("원제") || factorName.includes("경쟁")) return true;
  return MARKET_FACTORS.includes(factorName as (typeof MARKET_FACTORS)[number]);
}

export function computeProductRelevanceWeight(input: {
  article: ArticleLike;
  factorName: string;
  products: ProductLike[];
}) {
  if (!input.products.length) return 1;

  const productScores = input.products.map((product) => {
    let score = 0.8;
    if (cropMatches(input.article.crop, product.targetCrop)) score += 0.25;
    if (countryMatches(input.article.country, product.targetCountry)) score += 0.15;
    if (factorCategoryMatch(input.factorName, product)) score += 0.15;
    return score;
  });

  return Number(clamp(Math.max(...productScores), 0.7, 1.35).toFixed(2));
}

export function calculateAdjustedFactor(input: {
  article: ArticleLike;
  factor: FactorLike;
  countryWeight?: CountryWeightLike | null;
  products: ProductLike[];
  supportingArticleCount: number;
}) {
  const factorName = input.factor.factorName || input.factor.factor_name || "";
  const factorScore = effectiveFactorScore({
    factorScore: Number(input.factor.factorScore ?? input.factor.factor_score ?? 0),
    manualFactorScore: input.factor.manualFactorScore
  });
  const marketSizeWeight = Number(input.countryWeight?.marketSizeWeight ?? 1);
  const productRelevanceWeight = computeProductRelevanceWeight({
    article: input.article,
    factorName,
    products: input.products
  });
  const recencyWeight = computeRecencyWeight(input.article.publishedAt);
  const evidenceStrength = computeEvidenceStrength({
    supportingArticleCount: input.supportingArticleCount,
    reliability: Number(input.factor.reliability || 0.8)
  });
  const adjustedFactorScore = computeAdjustedFactorScore({
    factorScore,
    marketSizeWeight,
    productRelevanceWeight,
    recencyWeight,
    evidenceStrength
  });

  return {
    marketSizeWeight,
    productRelevanceWeight,
    recencyWeight,
    evidenceStrength,
    adjustedFactorScore
  };
}

export function scoreForArticle(article: { adjustedMarketScore?: number | null; marketImpactScore: number }) {
  const adjusted = Number(article.adjustedMarketScore ?? 0);
  return adjusted !== 0 ? adjusted : Number(article.marketImpactScore || 0);
}
