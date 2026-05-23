import { prisma } from "@/lib/db";
import { getFallbackDashboardData } from "@/lib/fallback-data";
import { ensureProductSeeds } from "@/lib/seed";
import { endOfKstDay, startOfKstDay } from "@/lib/utils";

export async function getDashboardData() {
  try {
    await ensureProductSeeds();
  } catch (error) {
    console.warn("Dashboard fallback: database is not available.", error);
    return getFallbackDashboardData();
  }

  const todayStart = startOfKstDay(new Date());
  const todayEnd = endOfKstDay(new Date());
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [articles, todayArticles] = await Promise.all([
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
    })
  ]);

  const todayMarketImpact = todayArticles.reduce((total, article) => total + article.marketImpactScore, 0);
  const productScores = new Map<string, number>();
  const countryScores = new Map<string, { score: number; count: number; risk: number; opportunity: number }>();
  const categoryCounts = new Map<string, number>();
  const dailyScores = new Map<string, number>();

  for (const article of articles) {
    const country = article.country || "Global";
    const countryCurrent = countryScores.get(country) || { score: 0, count: 0, risk: 0, opportunity: 0 };
    countryCurrent.score += article.marketImpactScore;
    countryCurrent.count += 1;
    if (article.marketImpactScore < 0) countryCurrent.risk += Math.abs(article.marketImpactScore);
    if (article.marketImpactScore > 0) countryCurrent.opportunity += article.marketImpactScore;
    countryScores.set(country, countryCurrent);

    if (article.category) {
      categoryCounts.set(article.category, (categoryCounts.get(article.category) || 0) + 1);
    }

    if (article.publishedAt >= sevenDaysAgo || article.createdAt >= sevenDaysAgo) {
      const key = article.publishedAt.toISOString().slice(0, 10);
      dailyScores.set(key, Number(((dailyScores.get(key) || 0) + article.marketImpactScore).toFixed(2)));
    }

    for (const impact of article.productImpacts) {
      productScores.set(
        impact.product.name,
        Number(((productScores.get(impact.product.name) || 0) + impact.productImpactScore).toFixed(2))
      );
    }
  }

  const productRanking = [...productScores.entries()]
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 10);

  const countryRisk = [...countryScores.entries()]
    .map(([country, item]) => ({
      country,
      score: Number(item.score.toFixed(2)),
      count: item.count,
      risk: Number(item.risk.toFixed(2)),
      opportunity: Number(item.opportunity.toFixed(2))
    }))
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 12);

  const weeklyInsights = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => `${category} 신호 ${count}건 반복`);

  return {
    todayMarketImpact: Number(todayMarketImpact.toFixed(2)),
    articleCount: articles.length,
    analyzedCount: articles.filter((article) => article.summary).length,
    productRanking,
    countryRisk,
    keyNews: articles.slice(0, 8).map((article) => ({
      id: article.id,
      title: article.title,
      source: article.source,
      country: article.country,
      crop: article.crop,
      category: article.category,
      url: article.url,
      summary: article.summary,
      marketImpactScore: article.marketImpactScore,
      publishedAt: article.publishedAt
    })),
    weeklyInsights,
    dailyScores: [...dailyScores.entries()].map(([date, score]) => ({ date, score }))
  };
}
