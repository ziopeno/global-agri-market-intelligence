import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeFactorScore, computeProductImpact } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const existing = await prisma.articleFactor.findUnique({
    where: { id }
  });

  if (!existing) {
    return NextResponse.json({ error: "Factor not found" }, { status: 404 });
  }

  const direction = body.direction === undefined ? existing.direction : Number(body.direction);
  const impact = body.impact === undefined ? existing.impact : Number(body.impact);
  const likelihood = body.likelihood === undefined ? existing.likelihood : Number(body.likelihood);
  const duration = body.duration === undefined ? existing.duration : Number(body.duration);
  const reliability = body.reliability === undefined ? existing.reliability : Number(body.reliability);
  const factorScore = computeFactorScore({ direction, impact, likelihood, duration, reliability });

  const factor = await prisma.articleFactor.update({
    where: { id },
    data: {
      direction,
      impact,
      likelihood,
      duration,
      reliability,
      factorScore,
      manualFactorScore:
        body.manualFactorScore === undefined
          ? existing.manualFactorScore
          : body.manualFactorScore === null
            ? null
            : Number(body.manualFactorScore),
      evidence: body.evidence === undefined ? existing.evidence : String(body.evidence)
    }
  });

  const factors = await prisma.articleFactor.findMany({
    where: { articleId: factor.articleId }
  });
  const marketImpactScore = Number(
    factors.reduce((total, item) => total + Number(item.manualFactorScore ?? item.factorScore), 0).toFixed(2)
  );
  await prisma.article.update({
    where: { id: factor.articleId },
    data: {
      marketImpactScore,
      reviewStatus: "human_reviewed"
    }
  });
  await prisma.articleAnalysis.update({
    where: { articleId: factor.articleId },
    data: { marketImpactScore }
  }).catch(() => undefined);

  const products = await prisma.product.findMany({
    include: { sensitivities: true }
  });
  for (const product of products) {
    const sensitivityByFactor = Object.fromEntries(
      product.sensitivities.map((sensitivity) => [sensitivity.factorName, sensitivity.sensitivityScore])
    );
    const impact = computeProductImpact(
      factors.map((item) => ({
        factor_name: item.factorName,
        direction: item.direction as 1 | -1,
        impact: item.impact,
        likelihood: item.likelihood,
        duration: item.duration,
        reliability: item.reliability,
        factor_score: item.manualFactorScore ?? item.factorScore,
        evidence: item.evidence || ""
      })),
      sensitivityByFactor
    );

    await prisma.productImpact.upsert({
      where: {
        productId_articleId: {
          productId: product.id,
          articleId: factor.articleId
        }
      },
      update: {
        marketImpactScore,
        sensitivityScore: impact.sensitivityScore,
        productImpactScore: impact.productImpactScore
      },
      create: {
        productId: product.id,
        articleId: factor.articleId,
        marketImpactScore,
        sensitivityScore: impact.sensitivityScore,
        productImpactScore: impact.productImpactScore
      }
    });
  }

  return NextResponse.json({ factor, marketImpactScore });
}
