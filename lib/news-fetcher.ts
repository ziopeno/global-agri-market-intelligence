import { Prisma } from "@prisma/client";
import { createDailyReport } from "@/lib/pipeline";
import { prisma } from "@/lib/db";
import { createArticleDuplicateKey, normalizeArticleUrl } from "@/lib/dedupe";
import { collectFarmhannongWeeklyArticles, isFarmhannongWeeklySource } from "@/lib/farmhannong-weekly";
import { ensureCountryWeightSeeds, ensureProductSeeds } from "@/lib/seed";
import { analyzeAndStoreArticle } from "@/lib/pipeline";
import type { ArticleInput, NewsFetchJobResult, NewsFetchSourceResult } from "@/lib/types";

async function logSourceFetch(input: {
  sourceId?: string;
  sourceName?: string;
  status: "success" | "failed";
  message?: string;
  fetchedCount?: number;
  newCount?: number;
  duplicateCount?: number;
  analyzedCount?: number;
}) {
  await prisma.newsFetchLog.create({
    data: {
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      status: input.status,
      message: input.message,
      fetchedCount: input.fetchedCount || 0,
      newCount: input.newCount || 0,
      duplicateCount: input.duplicateCount || 0,
      analyzedCount: input.analyzedCount || 0
    }
  });
}

async function saveFetchedArticles(source: {
  id: string;
  name: string;
  category: string | null;
  country: string | null;
}, articles: ArticleInput[]) {
  const preparedArticles = articles.map((article) => {
    const publishedAt = article.publishedAt ? new Date(article.publishedAt) : new Date();
    const duplicateKey = article.duplicateKey || createArticleDuplicateKey({
      title: article.title,
      source: source.name
    });

    return {
      article,
      url: normalizeArticleUrl(article.url),
      duplicateKey,
      publishedAt,
      titleDateKey: `${article.title}::${publishedAt.toISOString()}`
    };
  });

  const urls = [...new Set(preparedArticles.map((article) => article.url))];
  const duplicateKeys = [...new Set(preparedArticles.map((article) => article.duplicateKey))];
  const publishedDates = [...new Set(preparedArticles.map((article) => article.publishedAt.toISOString()))]
    .map((date) => new Date(date));
  const existingArticles = await prisma.article.findMany({
    where: {
      OR: [
        { url: { in: urls } },
        { duplicateKey: { in: duplicateKeys } },
        { source: source.name, publishedAt: { in: publishedDates } }
      ]
    },
    select: {
      id: true,
      title: true,
      url: true,
      duplicateKey: true,
      publishedAt: true
    }
  });

  const byUrl = new Map(existingArticles.map((article) => [article.url, article]));
  const byDuplicateKey = new Map(existingArticles.map((article) => [article.duplicateKey, article]));
  const byTitleDate = new Map(existingArticles.map((article) => [`${article.title}::${article.publishedAt.toISOString()}`, article]));
  const createData: Prisma.ArticleCreateManyInput[] = [];
  const createDuplicateKeys: string[] = [];
  const errors: string[] = [];
  let duplicates = 0;

  for (const prepared of preparedArticles) {
    const existing =
      byUrl.get(prepared.url) ||
      byDuplicateKey.get(prepared.duplicateKey) ||
      byTitleDate.get(prepared.titleDateKey);

    if (existing) {
      duplicates += 1;
      const needsCardIdentityUpdate = existing.url !== prepared.url || existing.duplicateKey !== prepared.duplicateKey;
      if (needsCardIdentityUpdate) {
        try {
          await prisma.article.update({
            where: { id: existing.id },
            data: {
              title: prepared.article.title,
              source: source.name,
              sourceId: source.id,
              url: prepared.url,
              duplicateKey: prepared.duplicateKey,
              publishedAt: prepared.publishedAt,
              country: prepared.article.country || source.country,
              crop: prepared.article.crop,
              category: prepared.article.category || source.category,
              originalText: prepared.article.originalText,
              rawContent: prepared.article.rawContent || prepared.article.originalText,
              fetchedAt: new Date()
            }
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown article update error";
          errors.push(`update: ${message}`);
        }
      }
      continue;
    }

    createDuplicateKeys.push(prepared.duplicateKey);
    createData.push({
      title: prepared.article.title,
      source: source.name,
      sourceId: source.id,
      url: prepared.url,
      publishedAt: prepared.publishedAt,
      country: prepared.article.country || source.country,
      crop: prepared.article.crop,
      category: prepared.article.category || source.category,
      originalText: prepared.article.originalText,
      rawContent: prepared.article.rawContent || prepared.article.originalText,
      fetchStatus: "fetched",
      analysisStatus: "pending",
      duplicateKey: prepared.duplicateKey,
      fetchedAt: new Date()
    });
  }

  const createResult = createData.length
    ? await prisma.article.createMany({ data: createData, skipDuplicates: true })
    : { count: 0 };
  const createdArticles = createDuplicateKeys.length
    ? await prisma.article.findMany({
        where: {
          duplicateKey: { in: createDuplicateKeys },
          analysisStatus: "pending"
        },
        select: { id: true },
        orderBy: { publishedAt: "desc" }
      })
    : [];

  duplicates += createData.length - createResult.count;

  return {
    created: createResult.count,
    duplicates,
    createdArticleIds: createdArticles.map((article) => article.id),
    errors
  };
}

async function analyzeNewArticles(articleIds: string[]) {
  let analyzed = 0;
  const errors: string[] = [];

  for (const articleId of articleIds) {
    try {
      await analyzeAndStoreArticle(articleId);
      analyzed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown analysis error";
      errors.push(`${articleId}: ${message}`);
      await prisma.article.update({
        where: { id: articleId },
        data: { analysisStatus: "failed" }
      }).catch(() => undefined);
    }
  }

  return { analyzed, errors };
}

export async function runNewsFetchJob(): Promise<NewsFetchJobResult> {
  const startedAt = new Date();
  await Promise.all([ensureProductSeeds(), ensureCountryWeightSeeds()]);

  const sources = (await prisma.newsSource.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  })).filter((source) => isFarmhannongWeeklySource(source.url, source.name));

  const results: NewsFetchSourceResult[] = [];
  let totalFetched = 0;
  let totalCreated = 0;
  let totalDuplicates = 0;
  let totalAnalyzed = 0;

  for (const source of sources) {
    const sourceResult: NewsFetchSourceResult = {
      sourceId: source.id,
      sourceName: source.name,
      fetched: 0,
      created: 0,
      duplicates: 0,
      analyzed: 0,
      errors: []
    };
    const createdArticleIds: string[] = [];

    try {
      const articles = await collectFarmhannongWeeklyArticles(source.url, { sourceId: source.id });
      sourceResult.fetched = articles.length;

      const saveResult = await saveFetchedArticles(source, articles);
      sourceResult.created += saveResult.created;
      sourceResult.duplicates += saveResult.duplicates;
      sourceResult.errors.push(...saveResult.errors);
      createdArticleIds.push(...saveResult.createdArticleIds);

      const analysisLimit = Math.max(0, Math.min(300, Number(process.env.NEWS_FETCH_ANALYSIS_LIMIT_PER_RUN || 120)));
      const analysisTargetIds = createdArticleIds.slice(0, analysisLimit);
      const analysisResult = await analyzeNewArticles(analysisTargetIds);
      sourceResult.analyzed = analysisResult.analyzed;
      sourceResult.errors.push(...analysisResult.errors);

      await prisma.newsSource.update({
        where: { id: source.id },
        data: { lastFetchedAt: new Date() }
      });

      await logSourceFetch({
        sourceId: source.id,
        sourceName: source.name,
        status: sourceResult.errors.length ? "failed" : "success",
        message: sourceResult.errors.join("\n") || "Fetched successfully",
        fetchedCount: sourceResult.fetched,
        newCount: sourceResult.created,
        duplicateCount: sourceResult.duplicates,
        analyzedCount: sourceResult.analyzed
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown source fetch error";
      sourceResult.errors.push(message);
      await logSourceFetch({
        sourceId: source.id,
        sourceName: source.name,
        status: "failed",
        message,
        fetchedCount: sourceResult.fetched,
        newCount: sourceResult.created,
        duplicateCount: sourceResult.duplicates,
        analyzedCount: sourceResult.analyzed
      });
    }

    totalFetched += sourceResult.fetched;
    totalCreated += sourceResult.created;
    totalDuplicates += sourceResult.duplicates;
    totalAnalyzed += sourceResult.analyzed;
    results.push(sourceResult);
  }

  const shouldUpdateReport = totalCreated > 0 || totalAnalyzed > 0;
  const report = shouldUpdateReport
    ? await createDailyReport(new Date(), { useAi: false }).catch(async (error) => {
        await prisma.newsFetchLog.create({
          data: {
            status: "failed",
            sourceName: "Daily Report",
            message: error instanceof Error ? error.message : "Daily report update failed"
          }
        });
        return null;
      })
    : null;

  const finishedAt = new Date();
  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    fetched: totalFetched,
    created: totalCreated,
    duplicates: totalDuplicates,
    analyzed: totalAnalyzed,
    failedSources: results.filter((result) => result.errors.length > 0).length,
    reportId: report?.id || null,
    sources: results
  };
}
