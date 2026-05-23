import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureProductSeeds } from "@/lib/seed";
import { clamp } from "@/lib/utils";
import { computeProductImpact } from "@/lib/scoring";

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

  const articles = await prisma.article.findMany({
    include: { factors: true }
  });
  for (const productId of productIds) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { sensitivities: true }
    });
    if (!product) continue;
    const sensitivityByFactor = Object.fromEntries(
      product.sensitivities.map((sensitivity) => [sensitivity.factorName, sensitivity.sensitivityScore])
    );
    for (const article of articles) {
      const factors = article.factors.map((factor) => ({
        factor_name: factor.factorName,
        direction: factor.direction as 1 | -1,
        impact: factor.impact,
        likelihood: factor.likelihood,
        duration: factor.duration,
        reliability: factor.reliability,
        factor_score: factor.manualFactorScore ?? factor.factorScore,
        evidence: factor.evidence || ""
      }));
      const impact = computeProductImpact(factors, sensitivityByFactor);
      await prisma.productImpact.upsert({
        where: {
          productId_articleId: {
            productId,
            articleId: article.id
          }
        },
        update: {
          marketImpactScore: article.marketImpactScore,
          sensitivityScore: impact.sensitivityScore,
          productImpactScore: impact.productImpactScore
        },
        create: {
          productId,
          articleId: article.id,
          marketImpactScore: article.marketImpactScore,
          sensitivityScore: impact.sensitivityScore,
          productImpactScore: impact.productImpactScore
        }
      });
    }
  }

  return NextResponse.json({ updated: results.length, recalculatedProducts: productIds.size });
}
