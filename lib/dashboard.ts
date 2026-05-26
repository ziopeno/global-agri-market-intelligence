import { prisma } from "@/lib/db";
import { getFallbackDashboardData } from "@/lib/fallback-data";
import { scoreForArticle } from "@/lib/score-adjustments";
import { ensureCountryWeightSeeds, ensureProductSeeds } from "@/lib/seed";
import { endOfKstDay, startOfKstDay } from "@/lib/utils";

function originalUrlFromRawContent(rawContent?: string | null) {
  const text = rawContent || "";
  const match = text.match(/원문 링크:\s*(https?:\/\/\S+)/);
  return match?.[1] || null;
}

function kstDateParts(dateValue: Date | string) {
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

function weekStartYmd(dateValue: Date | string) {
  const { year, month, day } = kstDateParts(dateValue);
  const pureDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = pureDate.getUTCDay();
  pureDate.setUTCDate(pureDate.getUTCDate() - ((dayOfWeek + 6) % 7));
  return `${pureDate.getUTCFullYear()}-${String(pureDate.getUTCMonth() + 1).padStart(2, "0")}-${String(pureDate.getUTCDate()).padStart(2, "0")}`;
}

export async function getDashboardData() {
  try {
    await Promise.all([ensureProductSeeds(), ensureCountryWeightSeeds()]);
  } catch (error) {
    console.warn("Dashboard fallback: database is not available.", error);
    return getFallbackDashboardData();
  }

  const todayStart = startOfKstDay(new Date());
  const todayEnd = endOfKstDay(new Date());
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [articles, todayArticles, countryWeights, chartArticles] = await Promise.all([
    prisma.article.findMany({
      where: {
        OR: [{ publishedAt: { gte: thirtyDaysAgo } }, { createdAt: { gte: thirtyDaysAgo } }]
      },
      include: {
        factors: true,
        productImpacts: {
          include: { product: true }
        }
      },
      orderBy: { publishedAt: "desc" },
      take: 80
    }),
    prisma.article.findMany({
      where: {
        OR: [
          { publishedAt: { gte: todayStart, lte: todayEnd } },
          { createdAt: { gte: todayStart, lte: todayEnd } }
        ]
      },
      include: {
        productImpacts: {
          include: { product: true }
        }
      },
      orderBy: { publishedAt: "desc" },
      take: 30
    }),
    prisma.countryBusinessWeight.findMany(),
    prisma.article.findMany({
      select: {
        publishedAt: true,
        createdAt: true,
        marketImpactScore: true,
        adjustedMarketScore: true
      },
      orderBy: { publishedAt: "desc" },
      take: 6000
    })
  ]);

  const countryWeightByName = new Map(countryWeights.map((weight) => [weight.country, weight]));
  const todayMarketImpact = todayArticles.reduce((total, article) => total + scoreForArticle(article), 0);
  const productScores = new Map<string, number>();
  const countryScores = new Map<
    string,
    {
      rawScore: number;
      score: number;
      count: number;
      risk: number;
      opportunity: number;
      businessImportanceWeight: number;
    }
  >();
  const categoryCounts = new Map<string, number>();
  const categoryArticles = new Map<string, typeof articles>();
  const dailyScores = new Map<string, number>();
  const weeklyScores = new Map<string, { score: number; articleCount: number }>();

  for (const article of articles) {
    const country = article.country || "Global";
    const countryWeight = countryWeightByName.get(country) || countryWeightByName.get("Global");
    const businessImportanceWeight = Number(countryWeight?.businessImportanceWeight ?? 1);
    const adjustedScore = scoreForArticle(article);
    const countryCurrent = countryScores.get(country) || {
      rawScore: 0,
      score: 0,
      count: 0,
      risk: 0,
      opportunity: 0,
      businessImportanceWeight
    };
    countryCurrent.rawScore += article.marketImpactScore;
    countryCurrent.score += adjustedScore;
    countryCurrent.count += 1;
    countryCurrent.businessImportanceWeight = businessImportanceWeight;
    if (adjustedScore < 0) countryCurrent.risk += Math.abs(adjustedScore);
    if (adjustedScore > 0) countryCurrent.opportunity += adjustedScore;
    countryScores.set(country, countryCurrent);

    if (article.category) {
      categoryCounts.set(article.category, (categoryCounts.get(article.category) || 0) + 1);
      categoryArticles.set(article.category, [...(categoryArticles.get(article.category) || []), article]);
    }

    if (article.publishedAt >= sevenDaysAgo || article.createdAt >= sevenDaysAgo) {
      const key = article.publishedAt.toISOString().slice(0, 10);
      dailyScores.set(key, Number(((dailyScores.get(key) || 0) + adjustedScore).toFixed(2)));
    }

    for (const impact of article.productImpacts) {
      productScores.set(
        impact.product.name,
        Number(((productScores.get(impact.product.name) || 0) + impact.productImpactScore).toFixed(2))
      );
    }
  }

  for (const article of chartArticles) {
    const key = weekStartYmd(article.publishedAt);
    const current = weeklyScores.get(key) || { score: 0, articleCount: 0 };
    current.score = Number((current.score + scoreForArticle(article)).toFixed(2));
    current.articleCount += 1;
    weeklyScores.set(key, current);
  }

  const productRanking = [...productScores.entries()]
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 10);

  const countryRisk = [...countryScores.entries()]
    .map(([country, item]) => {
      const normalizedScore = item.count ? item.score / item.count : 0;
      const weightedCountryScore = normalizedScore * item.businessImportanceWeight;
      return {
        country,
        rawScore: Number(item.rawScore.toFixed(2)),
        score: Number(item.score.toFixed(2)),
        count: item.count,
        normalizedScore: Number(normalizedScore.toFixed(2)),
        businessImportanceWeight: Number(item.businessImportanceWeight.toFixed(2)),
        weightedCountryScore: Number(weightedCountryScore.toFixed(2)),
        risk: Number(item.risk.toFixed(2)),
        opportunity: Number(item.opportunity.toFixed(2))
      };
    })
    .sort((a, b) => Math.abs(b.weightedCountryScore) - Math.abs(a.weightedCountryScore))
    .slice(0, 12);

  const weeklyInsights = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => `${category} 신호 ${count}건 반복`);

  const serializeArticle = (article: (typeof articles)[number]) => ({
    id: article.id,
    title: article.title,
    source: article.source,
    country: article.country,
    crop: article.crop,
    category: article.category,
    url: article.url,
    originalUrl: originalUrlFromRawContent(article.rawContent) || article.url,
    summary: article.summary,
    marketImpactScore: article.marketImpactScore,
    adjustedMarketScore: scoreForArticle(article),
    publishedAt: article.publishedAt.toISOString()
  });

  const repeatedSignals = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({
      category,
      count,
      articles: (categoryArticles.get(category) || [])
        .sort((a, b) => Math.abs(scoreForArticle(b)) - Math.abs(scoreForArticle(a)))
        .slice(0, 12)
        .map(serializeArticle)
    }));

  return {
    todayMarketImpact: Number(todayMarketImpact.toFixed(2)),
    articleCount: articles.length,
    analyzedCount: articles.filter((article) => article.summary).length,
    productRanking,
    countryRisk,
    keyNews: articles.slice(0, 8).map(serializeArticle),
    riskSignalArticles: articles
      .filter((article) => scoreForArticle(article) < 0)
      .sort((a, b) => scoreForArticle(a) - scoreForArticle(b))
      .slice(0, 20)
      .map(serializeArticle),
    repeatedSignals,
    weeklyInsights,
    dailyScores: [...dailyScores.entries()]
      .map(([date, score]) => ({ date, score }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    weeklyScores: [...weeklyScores.entries()]
      .map(([date, value]) => ({
        date,
        score: Number(value.score.toFixed(2)),
        articleCount: value.articleCount
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  };
}
