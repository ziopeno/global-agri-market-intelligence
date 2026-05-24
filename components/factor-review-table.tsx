"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatScore, scoreTone } from "@/lib/utils";

type ReviewFactor = {
  id: string;
  articleId: string;
  factorName: string;
  direction: number;
  impact: number;
  likelihood: number;
  duration: number;
  reliability: number;
  factorScore: number;
  manualFactorScore: number | null;
  marketSizeWeight: number;
  productRelevanceWeight: number;
  recencyWeight: number;
  evidenceStrength: number;
  adjustedFactorScore: number;
  evidence: string | null;
  article: {
    title: string;
    source: string;
    url: string;
    country: string | null;
    crop: string | null;
    publishedAt: string;
    marketImpactScore: number;
    adjustedMarketScore: number;
  };
  factorEvidence: Array<{
    evidenceSentence: string;
    confidence: number;
    reviewerComment: string | null;
    extractedByAi: boolean;
  }>;
  revisions: Array<{
    id: string;
    createdAt: string;
    reviewerComment: string | null;
  }>;
};

type Draft = {
  direction: number;
  impact: number;
  likelihood: number;
  duration: number;
  reliability: number;
  manualFactorScore: string;
  evidence: string;
  confidence: number;
  reviewerComment: string;
};

function initialDraft(factor: ReviewFactor): Draft {
  const evidence = factor.factorEvidence[0];
  return {
    direction: factor.direction,
    impact: factor.impact,
    likelihood: factor.likelihood,
    duration: factor.duration,
    reliability: factor.reliability,
    manualFactorScore: factor.manualFactorScore === null ? "" : String(factor.manualFactorScore),
    evidence: evidence?.evidenceSentence || factor.evidence || "",
    confidence: Number(evidence?.confidence ?? 0.7),
    reviewerComment: evidence?.reviewerComment || ""
  };
}

export function FactorReviewTable({ factors }: { factors: ReviewFactor[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(
    Object.fromEntries(factors.map((factor) => [factor.id, initialDraft(factor)]))
  );
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  async function save(factor: ReviewFactor) {
    const draft = drafts[factor.id];
    setError("");
    const response = await fetch(`/api/factors/${factor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        direction: draft.direction,
        impact: draft.impact,
        likelihood: draft.likelihood,
        duration: draft.duration,
        reliability: draft.reliability,
        manualFactorScore: draft.manualFactorScore === "" ? null : Number(draft.manualFactorScore),
        evidence: draft.evidence,
        confidence: draft.confidence,
        reviewerComment: draft.reviewerComment
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "저장에 실패했습니다.");
      return;
    }
    setSavedId(factor.id);
    router.refresh();
  }

  if (!factors.length) {
    return <div className="rounded-md border border-dashed bg-white p-6 text-sm text-slate-500">검토할 점수 근거가 아직 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {factors.map((factor) => {
        const draft = drafts[factor.id] || initialDraft(factor);
        const latestEvidence = factor.factorEvidence[0];
        const finalScore = factor.manualFactorScore ?? factor.factorScore;

        return (
          <article key={factor.id} className="rounded-md border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={factor.direction >= 0 ? "green" : "rose"}>{factor.factorName}</Badge>
                  <Badge>{factor.article.source}</Badge>
                  {factor.article.country && <Badge tone="blue">{factor.article.country}</Badge>}
                  {factor.article.crop && <Badge tone="green">{factor.article.crop}</Badge>}
                  <span className={`rounded-sm border px-2 py-1 text-xs font-medium ${scoreTone(factor.adjustedFactorScore || finalScore)}`}>
                    보정 {formatScore(factor.adjustedFactorScore || finalScore)}
                  </span>
                </div>
                <h3 className="mt-2 line-clamp-2 font-semibold text-slate-950">{factor.article.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(factor.article.publishedAt)}</p>
              </div>
              <a
                href={factor.article.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                원문
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">근거 문장</label>
                <Textarea
                  value={draft.evidence}
                  onChange={(event) => updateDraft(factor.id, { evidence: event.target.value })}
                  className="min-h-24"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-500">
                    AI Confidence
                    <Input
                      className="mt-1"
                      type="number"
                      step={0.05}
                      min={0}
                      max={1}
                      value={draft.confidence}
                      onChange={(event) => updateDraft(factor.id, { confidence: Number(event.target.value) })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-500">
                    검토 의견
                    <Input
                      className="mt-1"
                      value={draft.reviewerComment}
                      onChange={(event) => updateDraft(factor.id, { reviewerComment: event.target.value })}
                      placeholder="수정 사유나 확인 의견"
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  근거 출처: {latestEvidence?.extractedByAi === false ? "관리자 수정" : "AI 추출"} · 수정 이력 {factor.revisions.length}건
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-500">
                  Direction
                  <select
                    className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    value={draft.direction}
                    onChange={(event) => updateDraft(factor.id, { direction: Number(event.target.value) })}
                  >
                    <option value={1}>+1 기회</option>
                    <option value={-1}>-1 위험</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-500">
                  Impact
                  <Input
                    className="mt-1"
                    type="number"
                    min={1}
                    max={5}
                    value={draft.impact}
                    onChange={(event) => updateDraft(factor.id, { impact: Number(event.target.value) })}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-500">
                  Likelihood
                  <Input
                    className="mt-1"
                    type="number"
                    min={1}
                    max={5}
                    value={draft.likelihood}
                    onChange={(event) => updateDraft(factor.id, { likelihood: Number(event.target.value) })}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-500">
                  Duration
                  <select
                    className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    value={draft.duration}
                    onChange={(event) => updateDraft(factor.id, { duration: Number(event.target.value) })}
                  >
                    <option value={1}>1.0 단기</option>
                    <option value={1.3}>1.3 중기</option>
                    <option value={1.6}>1.6 장기</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-500">
                  Reliability
                  <select
                    className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    value={draft.reliability}
                    onChange={(event) => updateDraft(factor.id, { reliability: Number(event.target.value) })}
                  >
                    <option value={1}>1.0 공식</option>
                    <option value={0.8}>0.8 검증 매체</option>
                    <option value={0.6}>0.6 업계·기업</option>
                    <option value={0.4}>0.4 불명확</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-500">
                  최종 수동 점수
                  <Input
                    className="mt-1"
                    type="number"
                    step={0.1}
                    value={draft.manualFactorScore}
                    onChange={(event) => updateDraft(factor.id, { manualFactorScore: event.target.value })}
                    placeholder={formatScore(factor.factorScore)}
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 grid gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-5">
              <span>Raw {formatScore(finalScore)}</span>
              <span>Market Size x{factor.marketSizeWeight.toFixed(2)}</span>
              <span>Product Relevance x{factor.productRelevanceWeight.toFixed(2)}</span>
              <span>Recency x{factor.recencyWeight.toFixed(2)}</span>
              <span>Evidence x{factor.evidenceStrength.toFixed(2)}</span>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              {savedId === factor.id && <span className="text-sm text-emerald-700">저장되었습니다.</span>}
              <Button type="button" onClick={() => startTransition(() => save(factor))} disabled={isPending}>
                <Save className="h-4 w-4" />
                검토 저장
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
