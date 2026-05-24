import { Prisma } from "@prisma/client";
import { createDailyReport } from "@/lib/pipeline";
import { prisma } from "@/lib/db";
import { createArticleDuplicateKey, normalizeArticleUrl } from "@/lib/dedupe";
import { collectFarmhannongWeeklyArticles, isFarmhannongWeeklySource } from "@/lib/farmhannong-weekly";
import { collectRssArticles } from "@/lib/rss";
import { ensureProductSeeds } from "@/lib/seed";
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

async function saveFetchedArticle(source: {
  id: string;
  name: string;
  category: string | null;
  country: string | null;
}, article: ArticleInput) {
  const url = normalizeArticleUrl(article.url);
  const duplicateKey = createArticleDuplicateKey({
    title: article.title,
    source: source.name
  });

  const existing = await prisma.article.findFirst({
    where: {
      OR: [{ url }, { duplicateKey }]
    },
    select: { id: true }
  });

  if (existing) {
    await prisma.article.update({
      where: { id: existing.id },
      data: { fetchedAt: new Date() }
    }).catch(() => undefined);
    return { status: "duplicate" as const, articleId: existing.id };
  }

  try {
    const created = await prisma.article.create({
      data: {
        title: article.title,
        source: source.name,
        sourceId: source.id,
        url,
        publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
        country: article.country || source.country,
        crop: article.crop,
        category: article.category || source.category,
        originalText: article.originalText,
        rawContent: article.rawContent || article.originalText,
        fetchStatus: "fetched",
        analysisStatus: "pending",
        duplicateKey,
        fetchedAt: new Date()
      }
    });
    return { status: "created" as const, articleId: created.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "duplicate" as const, articleId: null };
    }
    throw error;
  }
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
  await ensureProductSeeds();

  const sources = await prisma.newsSource.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });

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
      const articles = isFarmhannongWeeklySource(source.url, source.name)
        ? await collectFarmhannongWeeklyArticles(source.url, { sourceId: source.id })
        : await collectRssArticles(source.url, {
            sourceId: source.id,
            sourceName: source.name,
            category: source.category,
            country: source.country
          });
      sourceResult.fetched = articles.length;

      for (const article of articles) {
        try {
          const saved = await saveFetchedArticle(source, article);
          if (saved.status === "created" && saved.articleId) {
            sourceResult.created += 1;
            createdArticleIds.push(saved.articleId);
          } else {
            sourceResult.duplicates += 1;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown article save error";
          sourceResult.errors.push(`save: ${message}`);
        }
      }

      const analysisResult = await analyzeNewArticles(createdArticleIds);
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
