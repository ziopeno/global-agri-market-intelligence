import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeAndStoreArticle, collectAndStoreRss, upsertArticle } from "@/lib/pipeline";
import { ensureProductSeeds } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureProductSeeds();
  const articles = await prisma.article.findMany({
    include: {
      newsSource: true,
      analysis: true,
      factors: true,
      productImpacts: {
        include: { product: true },
        orderBy: { productImpactScore: "desc" }
      }
    },
    orderBy: { publishedAt: "desc" },
    take: 100
  });

  return NextResponse.json({ articles });
}

export async function POST(request: Request) {
  await ensureProductSeeds();
  const body = await request.json();

  if (body.rssUrl) {
    const articles = await collectAndStoreRss(String(body.rssUrl));
    return NextResponse.json({ articles, count: articles.length });
  }

  const article = await upsertArticle({
    title: body.title,
    source: body.source || "Manual",
    url: body.url || `manual:${crypto.randomUUID()}`,
    publishedAt: body.publishedAt || new Date().toISOString(),
    country: body.country || null,
    crop: body.crop || null,
    category: body.category || null,
    originalText: body.originalText || body.summary || body.title,
    rawContent: body.rawContent || body.originalText || body.summary || body.title
  });

  if (body.analyze) {
    const analyzed = await analyzeAndStoreArticle(article.id);
    return NextResponse.json({ article: analyzed });
  }

  return NextResponse.json({ article });
}
