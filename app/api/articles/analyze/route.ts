import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeAndStoreArticle } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

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
