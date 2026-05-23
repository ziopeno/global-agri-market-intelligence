import { DEFAULT_SENSITIVITY, MARKET_FACTORS, NEWS_SOURCE_SEEDS, PRODUCT_SEEDS, SAMPLE_ARTICLES } from "@/lib/constants";

export function getFallbackDashboardData() {
  return {
    todayMarketImpact: 0,
    articleCount: SAMPLE_ARTICLES.length,
    analyzedCount: SAMPLE_ARTICLES.length,
    productRanking: PRODUCT_SEEDS.slice(0, 6).map((product, index) => ({
      name: product.name,
      score: Number((2.8 - index * 0.6).toFixed(1))
    })),
    countryRisk: SAMPLE_ARTICLES.map((article, index) => ({
      country: article.country || "Global",
      score: index === 0 ? -4.8 : index === 1 ? 3.6 : -2.4,
      count: 1,
      risk: index === 1 ? 0 : index === 0 ? 4.8 : 2.4,
      opportunity: index === 1 ? 3.6 : 0
    })),
    keyNews: SAMPLE_ARTICLES.map((article, index) => ({
      id: `sample-${index + 1}`,
      title: article.title,
      source: article.source,
      country: article.country,
      crop: article.crop,
      category: article.category,
      url: article.url,
      summary: article.summary,
      marketImpactScore: index === 0 ? -4.8 : index === 1 ? 3.6 : -2.4,
      publishedAt: article.publishedAt
    })),
    weeklyInsights: ["기상재해 신호 1건 반복", "재배면적 신호 1건 반복", "등록/규제 이슈 신호 1건 반복"],
    dailyScores: SAMPLE_ARTICLES.map((article, index) => ({
      date: article.publishedAt.toISOString().slice(0, 10),
      score: index === 0 ? -4.8 : index === 1 ? 3.6 : -2.4
    }))
  };
}

export function getFallbackProducts() {
  return PRODUCT_SEEDS.map((product, productIndex) => ({
    id: `sample-product-${productIndex + 1}`,
    name: product.name,
    category: product.category,
    targetCrop: product.targetCrop,
    targetCountry: product.targetCountry,
    description: product.description,
    sensitivities: MARKET_FACTORS.map((factorName, factorIndex) => ({
      id: `sample-sensitivity-${productIndex + 1}-${factorIndex + 1}`,
      factorName,
      sensitivityScore: DEFAULT_SENSITIVITY[product.name][factorName]
    })),
    productImpacts: []
  }));
}

export function getFallbackSources() {
  return NEWS_SOURCE_SEEDS.map((source, index) => ({
    id: `sample-source-${index + 1}`,
    name: source.name,
    url: source.url,
    category: source.category,
    country: source.country,
    isActive: source.isActive,
    lastFetchedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { articles: 0 }
  }));
}

export function getFallbackArticles() {
  return SAMPLE_ARTICLES.map((article, index) => ({
    id: `sample-article-${index + 1}`,
    title: article.title,
    source: article.source,
    url: article.url,
    publishedAt: article.publishedAt,
    country: article.country,
    crop: article.crop,
    category: article.category,
    summary: article.summary,
    marketImpactScore: index === 0 ? -4.8 : index === 1 ? 3.6 : -2.4,
    fetchStatus: "manual",
    analysisStatus: "completed",
    newsSource: null,
    factors: [],
    productImpacts: []
  }));
}
