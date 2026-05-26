import { Prisma, type ReportType } from "@prisma/client";
import { analyzeArticle, generateDailyReportFromAi } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { createArticleDuplicateKey, normalizeArticleUrl } from "@/lib/dedupe";
import { recalculateArticleScores } from "@/lib/recalculate";
import { collectRssArticles } from "@/lib/rss";
import { scoreForArticle } from "@/lib/score-adjustments";
import { ensureCountryWeightSeeds, ensureProductSeeds } from "@/lib/seed";
import type { ArticleInput, DailyReportContent } from "@/lib/types";
import { endOfKstDay, startOfKstDay, toTitleDate } from "@/lib/utils";

export async function upsertArticle(input: ArticleInput) {
  const normalizedUrl = normalizeArticleUrl(input.url || `manual:${crypto.randomUUID()}`);
  const duplicateKey = createArticleDuplicateKey({
    title: input.title,
    source: input.source
  });
  const effectiveDuplicateKey = input.duplicateKey || duplicateKey;

  return prisma.article.upsert({
    where: { url: normalizedUrl },
    update: {
      title: input.title,
      source: input.source,
      sourceId: input.sourceId || undefined,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : new Date(),
      country: input.country || undefined,
      crop: input.crop || undefined,
      category: input.category || undefined,
      originalText: input.originalText,
      rawContent: input.rawContent || input.originalText,
      fetchedAt: input.fetchedAt ? new Date(input.fetchedAt) : undefined
    },
    create: {
      title: input.title,
      source: input.source,
      url: normalizedUrl,
      sourceId: input.sourceId || undefined,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : new Date(),
      country: input.country || undefined,
      crop: input.crop || undefined,
      category: input.category || undefined,
      originalText: input.originalText,
      rawContent: input.rawContent || input.originalText,
      fetchStatus: "manual",
      analysisStatus: "pending",
      duplicateKey: effectiveDuplicateKey,
      fetchedAt: input.fetchedAt ? new Date(input.fetchedAt) : undefined
    }
  });
}

export async function collectAndStoreRss(rssUrl: string) {
  const inputs = await collectRssArticles(rssUrl);
  const articles: Array<Awaited<ReturnType<typeof upsertArticle>>> = [];

  for (const input of inputs) {
    articles.push(await upsertArticle(input));
  }

  return articles;
}

export async function analyzeAndStoreArticle(articleId: string) {
  await ensureProductSeeds();
  await ensureCountryWeightSeeds();
  const article = await prisma.article.findUnique({
    where: { id: articleId }
  });

  if (!article) {
    throw new Error("기사 ID를 찾을 수 없습니다.");
  }

  await prisma.article.update({
    where: { id: articleId },
    data: { analysisStatus: "analyzing" }
  });

  const analysis = await analyzeArticle({
    title: article.title,
    source: article.source,
    url: article.url,
    publishedAt: article.publishedAt.toISOString(),
    country: article.country,
    crop: article.crop,
    category: article.category,
    originalText: article.rawContent || article.originalText
  });

  await prisma.factorEvidence.deleteMany({ where: { articleId } });
  await prisma.articleFactor.deleteMany({ where: { articleId } });
  await prisma.productImpact.deleteMany({ where: { articleId } });

  const updatedArticle = await prisma.article.update({
    where: { id: articleId },
    data: {
      summary: analysis.summary,
      country: analysis.country,
      crop: analysis.crop,
      category: analysis.category,
      marketImpactScore: analysis.market_impact_score,
      adjustedMarketScore: analysis.market_impact_score,
      analysisStatus: "completed"
    }
  });

  await prisma.articleAnalysis.upsert({
    where: { articleId },
    update: {
      summary: analysis.summary,
      country: analysis.country,
      crop: analysis.crop,
      category: analysis.category,
      marketImpactScore: analysis.market_impact_score,
      adjustedMarketScore: analysis.market_impact_score,
      rawResponse: analysis as unknown as Prisma.InputJsonValue
    },
    create: {
      articleId,
      summary: analysis.summary,
      country: analysis.country,
      crop: analysis.crop,
      category: analysis.category,
      marketImpactScore: analysis.market_impact_score,
      adjustedMarketScore: analysis.market_impact_score,
      rawResponse: analysis as unknown as Prisma.InputJsonValue
    }
  });

  for (const factor of analysis.factors) {
    const createdFactor = await prisma.articleFactor.create({
      data: {
        articleId,
        factorName: factor.factor_name,
        direction: factor.direction,
        impact: factor.impact,
        likelihood: factor.likelihood,
        duration: factor.duration,
        reliability: factor.reliability,
        factorScore: factor.factor_score,
        evidence: factor.evidence
      }
    });

    await prisma.factorEvidence.create({
      data: {
        articleId,
        factorId: createdFactor.id,
        factorName: factor.factor_name,
        evidenceSentence: factor.evidence || "AI가 기사 본문에서 추출한 근거 문장입니다.",
        extractedByAi: true,
        confidence: Number(factor.confidence ?? 0.7)
      }
    });
  }

  for (const factor of analysis.factors) {
    await prisma.marketSignal.create({
      data: {
        country: analysis.country,
        crop: analysis.crop,
        category: analysis.category || "농산물 수급",
        signalName: factor.factor_name,
        marketImpactScore: factor.factor_score,
        period: toTitleDate(new Date())
      }
    });
  }

  await recalculateArticleScores(articleId);

  return prisma.article.findUniqueOrThrow({
    where: { id: updatedArticle.id },
    include: {
      factors: true,
      productImpacts: {
        include: { product: true },
        orderBy: { productImpactScore: "desc" }
      }
    }
  });
}

type ReportArticle = Awaited<ReturnType<typeof findReportArticles>>[number];

async function findReportArticles(periodStart: Date, periodEnd: Date) {
  const periodArticles = await prisma.article.findMany({
    where: {
      OR: [
        { publishedAt: { gte: periodStart, lte: periodEnd } },
        { createdAt: { gte: periodStart, lte: periodEnd } }
      ]
    },
    include: {
      factors: true,
      productImpacts: {
        include: { product: true }
      }
    },
    orderBy: [{ adjustedMarketScore: "desc" }, { marketImpactScore: "desc" }, { publishedAt: "desc" }]
  });

  if (periodArticles.length > 0) return periodArticles;

  return prisma.article.findMany({
    include: {
      factors: true,
      productImpacts: {
        include: { product: true }
      }
    },
    orderBy: { publishedAt: "desc" },
    take: 10
  });
}

function fallbackDailyReport(articles: ReportArticle[]): DailyReportContent {
  const sortedArticles = [...articles].sort(
    (a, b) => Math.abs(scoreForArticle(b)) - Math.abs(scoreForArticle(a))
  );
  const productScores = new Map<string, number>();
  for (const article of articles) {
    for (const impact of article.productImpacts) {
      productScores.set(
        impact.product.name,
        Number(((productScores.get(impact.product.name) || 0) + impact.productImpactScore).toFixed(2))
      );
    }
  }

  const topProducts = [...productScores.entries()]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5);

  const totalMarketScore = articles.reduce((total, article) => total + scoreForArticle(article), 0);
  const risks = sortedArticles
    .filter((article) => scoreForArticle(article) < 0)
    .slice(0, 4)
    .map((article) => `${article.country || "Global"} ${article.crop || "농업"}: ${article.title}`);
  const opportunities = topProducts
    .filter(([, score]) => score > 0)
    .map(([name, score]) => `${name} 기회 신호 ${score.toFixed(1)}점`);

  return {
    today_headlines: sortedArticles.slice(0, 5).map((article) => article.title),
    country_issues: sortedArticles
      .filter((article) => article.country)
      .slice(0, 5)
      .map((article) => `${article.country}: ${article.category || "시장 신호"} (${scoreForArticle(article).toFixed(1)})`),
    crop_issues: sortedArticles
      .filter((article) => article.crop)
      .slice(0, 5)
      .map((article) => `${article.crop}: ${article.factors[0]?.factorName || article.category || "시장 변수"}`),
    market_impact_summary: `분석 기사 ${articles.length}건의 시장 영향 합계는 ${totalMarketScore.toFixed(1)}점입니다.`,
    product_impact_summary: topProducts.map(([name, score]) => `${name}: ${score.toFixed(1)}점`),
    risks: risks.length ? risks : ["오늘 생성된 주요 위험 신호는 제한적입니다."],
    opportunities: opportunities.length ? opportunities : ["오늘 생성된 강한 기회 신호는 제한적입니다."],
    sales_action_items: topProducts.slice(0, 3).map(([name, score]) =>
      score >= 0
        ? `${name} 관련 국가/작물 고객에게 수요 촉진 메시지를 준비하세요.`
        : `${name} 관련 규제·원가·수급 리스크를 영업팀에 공유하세요.`
    ),
    evidence: sortedArticles.map((article) => ({
      article_id: article.id,
      title: article.title,
      source: article.source,
      url: article.url,
      market_impact_score: scoreForArticle(article),
      factor_scores: article.factors.map((factor) => ({
        factor_name: factor.factorName,
        score: factor.adjustedFactorScore || (factor.manualFactorScore ?? factor.factorScore),
        evidence: factor.evidence
      }))
    }))
  };
}

function serializeReportInput(articles: ReportArticle[]) {
  return JSON.stringify(
    articles.map((article) => ({
      id: article.id,
      title: article.title,
      source: article.source,
      url: article.url,
      country: article.country,
      crop: article.crop,
      category: article.category,
      summary: article.summary,
      marketImpactScore: scoreForArticle(article),
      factors: article.factors.map((factor) => ({
        factorName: factor.factorName,
        factorScore: factor.adjustedFactorScore || (factor.manualFactorScore ?? factor.factorScore),
        evidence: factor.evidence
      })),
      productImpacts: article.productImpacts.map((impact) => ({
        product: impact.product.name,
        score: impact.productImpactScore,
        rationale: impact.rationale
      }))
    })),
    null,
    2
  );
}

type CreateDailyReportOptions = {
  useAi?: boolean;
};

export async function createDailyReport(date = new Date(), options: CreateDailyReportOptions = {}) {
  const periodStart = startOfKstDay(date);
  const periodEnd = endOfKstDay(date);
  const articles = await findReportArticles(periodStart, periodEnd);
  const fallback = fallbackDailyReport(articles);
  const aiReport = options.useAi ?? true
    ? await generateDailyReportFromAi(serializeReportInput(articles))
    : null;
  const content: DailyReportContent = {
    ...fallback,
    ...(aiReport || {}),
    evidence: fallback.evidence
  };

  const data = {
      reportType: "daily" as ReportType,
      title: `Daily Market Intelligence - ${toTitleDate(date)}`,
      periodStart,
      periodEnd,
      content: content as unknown as Prisma.InputJsonValue,
      keyInsights: content.today_headlines as Prisma.InputJsonValue,
      strategyRecommendations: content.sales_action_items as Prisma.InputJsonValue,
      sourceArticleIds: articles.map((article) => article.id)
  };
  const existing = await prisma.report.findFirst({
    where: {
      reportType: "daily",
      periodStart,
      periodEnd
    }
  });

  if (existing) {
    return prisma.report.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.report.create({
    data
  });
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function periodForReport(reportType: Exclude<ReportType, "daily">, date: Date) {
  const end = endOfKstDay(date);
  const kst = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const year = kst.getFullYear();
  const month = kst.getMonth();

  if (reportType === "weekly") {
    return { start: startOfKstDay(addDays(date, -6)), end };
  }

  if (reportType === "monthly") {
    return { start: new Date(`${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00+09:00`), end };
  }

  if (reportType === "quarterly") {
    const quarterStartMonth = Math.floor(month / 3) * 3 + 1;
    return {
      start: new Date(`${year}-${String(quarterStartMonth).padStart(2, "0")}-01T00:00:00+09:00`),
      end
    };
  }

  if (reportType === "half_year") {
    const halfStartMonth = month < 6 ? 1 : 7;
    return {
      start: new Date(`${year}-${String(halfStartMonth).padStart(2, "0")}-01T00:00:00+09:00`),
      end
    };
  }

  return { start: new Date(`${year}-01-01T00:00:00+09:00`), end };
}

function childReportTypes(reportType: Exclude<ReportType, "daily">): ReportType[] {
  if (reportType === "weekly") return ["daily"];
  if (reportType === "monthly") return ["weekly", "daily"];
  if (reportType === "quarterly") return ["monthly", "weekly"];
  if (reportType === "half_year") return ["quarterly", "monthly"];
  return ["half_year", "quarterly", "monthly"];
}

export async function createRollupReport(reportType: Exclude<ReportType, "daily">, date = new Date()) {
  const period = periodForReport(reportType, date);
  const articles = await findReportArticles(period.start, period.end);
  const lowerReports = await prisma.report.findMany({
    where: {
      reportType: { in: childReportTypes(reportType) },
      periodStart: { gte: period.start },
      periodEnd: { lte: period.end }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  const fallback = fallbackDailyReport(articles);
  const content = {
    report_type: reportType,
    rollup_basis: lowerReports.map((report) => ({
      id: report.id,
      title: report.title,
      reportType: report.reportType,
      createdAt: report.createdAt.toISOString()
    })),
    ...fallback,
    market_impact_summary: `${reportType} 기간 기사 ${articles.length}건과 하위 리포트 ${lowerReports.length}건을 기반으로 집계했습니다. ${fallback.market_impact_summary}`
  };

  return prisma.report.create({
    data: {
      reportType,
      title: `${reportType.replace("_", " ")} Market Intelligence - ${toTitleDate(date)}`,
      periodStart: period.start,
      periodEnd: period.end,
      content: content as unknown as Prisma.InputJsonValue,
      keyInsights: fallback.today_headlines as Prisma.InputJsonValue,
      strategyRecommendations: fallback.sales_action_items as Prisma.InputJsonValue,
      sourceArticleIds: articles.map((article) => article.id)
    }
  });
}

export async function runDailyPipeline(rssUrls: string[]) {
  await ensureProductSeeds();
  await ensureCountryWeightSeeds();
  const collected: Array<Awaited<ReturnType<typeof upsertArticle>>> = [];
  for (const rssUrl of rssUrls.filter(Boolean)) {
    collected.push(...(await collectAndStoreRss(rssUrl)));
  }

  const candidates = await prisma.article.findMany({
    where: {
      OR: [{ summary: null }, { factors: { none: {} } }]
    },
    orderBy: { publishedAt: "desc" },
    take: 20
  });

  const analyzed: Array<Awaited<ReturnType<typeof analyzeAndStoreArticle>>> = [];
  for (const article of candidates) {
    analyzed.push(await analyzeAndStoreArticle(article.id));
  }

  const report = await createDailyReport(new Date());
  return {
    collected: collected.length,
    analyzed: analyzed.length,
    reportId: report.id
  };
}
