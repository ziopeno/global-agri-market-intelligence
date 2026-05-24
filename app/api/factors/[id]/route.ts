import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recalculateArticleScores, revisionValues } from "@/lib/recalculate";
import { computeFactorScore } from "@/lib/scoring";
import { clamp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const existing = await prisma.articleFactor.findUnique({
    where: { id },
    include: {
      factorEvidence: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
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
  const manualFactorScore =
    body.manualFactorScore === undefined
      ? existing.manualFactorScore
      : body.manualFactorScore === null || body.manualFactorScore === ""
        ? null
        : Number(body.manualFactorScore);
  const evidence = body.evidence === undefined ? existing.evidence : String(body.evidence);

  const factor = await prisma.articleFactor.update({
    where: { id },
    data: {
      direction,
      impact,
      likelihood,
      duration,
      reliability,
      factorScore,
      manualFactorScore,
      evidence
    }
  });

  const reviewerComment = body.reviewerComment ? String(body.reviewerComment) : null;
  await prisma.factorScoreRevision.create({
    data: {
      articleId: factor.articleId,
      factorId: factor.id,
      factorName: factor.factorName,
      previousValues: revisionValues(existing),
      newValues: revisionValues(factor),
      reviewerComment
    }
  });

  if (body.evidence !== undefined || body.confidence !== undefined || body.reviewerComment !== undefined) {
    const latestEvidence = existing.factorEvidence[0];
    const evidenceSentence =
      body.evidence === undefined
        ? latestEvidence?.evidenceSentence || evidence || "검토자가 근거 문장을 아직 입력하지 않았습니다."
        : String(body.evidence);
    const confidence =
      body.confidence === undefined
        ? Number(latestEvidence?.confidence ?? 0.7)
        : clamp(Number(body.confidence), 0, 1);

    if (latestEvidence) {
      await prisma.factorEvidence.update({
        where: { id: latestEvidence.id },
        data: {
          evidenceSentence,
          confidence,
          extractedByAi: body.evidence === undefined ? latestEvidence.extractedByAi : false,
          reviewerComment
        }
      });
    } else {
      await prisma.factorEvidence.create({
        data: {
          articleId: factor.articleId,
          factorId: factor.id,
          factorName: factor.factorName,
          evidenceSentence,
          extractedByAi: body.evidence === undefined,
          confidence,
          reviewerComment
        }
      });
    }
  }

  const recalculated = await recalculateArticleScores(factor.articleId);
  await prisma.article.update({
    where: { id: factor.articleId },
    data: { reviewStatus: "human_reviewed" }
  });

  return NextResponse.json({
    factor,
    marketImpactScore: recalculated.rawMarketImpactScore,
    adjustedMarketScore: recalculated.adjustedMarketScore
  });
}
