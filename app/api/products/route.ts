import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recalculateArticleScores } from "@/lib/recalculate";
import { ensureCountryWeightSeeds, ensureProductSeeds } from "@/lib/seed";
import { clamp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureProductSeeds();
  const products = await prisma.product.findMany({
    include: {
      sensitivities: {
        orderBy: { factorName: "asc" }
      },
      productImpacts: {
        orderBy: { createdAt: "desc" },
        take: 10
      }
    },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ products });
}

export async function PUT(request: Request) {
  await ensureProductSeeds();
  await ensureCountryWeightSeeds();
  const body = await request.json();
  const updates = Array.isArray(body.updates)
    ? body.updates
    : [
        {
          productId: body.productId,
          factorName: body.factorName,
          sensitivityScore: body.sensitivityScore
        }
      ];

  const results: unknown[] = [];
  const productIds = new Set<string>();
  for (const update of updates) {
    if (!update.productId || !update.factorName) continue;
    productIds.add(String(update.productId));
    results.push(
      await prisma.productSensitivity.upsert({
        where: {
          productId_factorName: {
            productId: String(update.productId),
            factorName: String(update.factorName)
          }
        },
        update: {
          sensitivityScore: clamp(Number(update.sensitivityScore), -1, 1)
        },
        create: {
          productId: String(update.productId),
          factorName: String(update.factorName),
          sensitivityScore: clamp(Number(update.sensitivityScore), -1, 1)
        }
      })
    );
  }

  const articles = productIds.size
    ? await prisma.article.findMany({
        select: { id: true },
        where: { factors: { some: {} } }
      })
    : [];
  for (const article of articles) {
    await recalculateArticleScores(article.id);
  }

  return NextResponse.json({
    updated: results.length,
    recalculatedProducts: productIds.size,
    recalculatedArticles: articles.length
  });
}
