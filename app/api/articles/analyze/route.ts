import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeAndStoreArticle } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (Array.isArray(body.articleIds)) {
    const articleIds = body.articleIds.map(String).filter(Boolean);
    const articles: Array<Awaited<ReturnType<typeof analyzeAndStoreArticle>>> = [];
    const errors: Array<{ articleId: string; message: string }> = [];

    for (const articleId of articleIds) {
      try {
        articles.push(await analyzeAndStoreArticle(articleId));
      } catch (error) {
        errors.push({
          articleId,
          message: error instanceof Error ? error.message : "Unknown analysis error"
        });
      }
    }

    return NextResponse.json({ articles, count: articles.length, errors });
  }

  if (body.articleId) {
    const article = await analyzeAndStoreArticle(String(body.articleId));
    return NextResponse.json({ article });
  }

  const candidates = await prisma.article.findMany({
    where: {
      OR: [{ summary: null }, { factors: { none: {} } }]
    },
    orderBy: { publishedAt: "desc" },
    take: Number(body.limit || 10)
  });

  const articles: Array<Awaited<ReturnType<typeof analyzeAndStoreArticle>>> = [];
  for (const candidate of candidates) {
    articles.push(await analyzeAndStoreArticle(candidate.id));
  }

  return NextResponse.json({ articles, count: articles.length });
}
