"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldAlert, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatScore, scoreTone } from "@/lib/utils";

type DashboardSignalArticle = {
  id: string;
  title: string;
  source: string;
  country?: string | null;
  crop?: string | null;
  category?: string | null;
  url?: string | null;
  summary?: string | null;
  marketImpactScore?: number | null;
  adjustedMarketScore?: number | null;
  publishedAt: string;
};

type RepeatedSignal = {
  category: string;
  count: number;
  articles: DashboardSignalArticle[];
};

type SignalMode = "risk" | "repeated" | null;

type DashboardSignalCardsProps = {
  riskCount: number;
  riskArticles: DashboardSignalArticle[];
  repeatedCount: number;
  repeatedSignals: RepeatedSignal[];
};

function articleScore(article: DashboardSignalArticle) {
  return Number(article.adjustedMarketScore ?? article.marketImpactScore ?? 0);
}

function uniqueArticleCount(signals: RepeatedSignal[]) {
  const ids = new Set<string>();
  for (const signal of signals) {
    for (const article of signal.articles) ids.add(article.id);
  }
  return ids.size;
}

function SignalArticleLink({
  article,
  contextLabel
}: {
  article: DashboardSignalArticle;
  contextLabel?: string;
}) {
  const score = articleScore(article);

  return (
    <Link
      href={`/news#article-${article.id}`}
      className="block rounded-md border bg-white p-3 transition hover:border-emerald-300 hover:bg-emerald-50/60"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">{article.source}</Badge>
        {contextLabel && <Badge tone="amber">{contextLabel}</Badge>}
        {article.country && <Badge>{article.country}</Badge>}
        {article.crop && <Badge tone="green">{article.crop}</Badge>}
        <span className={`rounded-sm border px-2 py-1 text-xs font-semibold ${scoreTone(score)}`}>
          {formatScore(score)}
        </span>
      </div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold leading-6 text-slate-950">{article.title}</div>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
            {article.summary || "아직 AI 요약이 저장되지 않았습니다."}
          </p>
          <div className="mt-2 text-xs text-slate-500">{formatDateTime(article.publishedAt)}</div>
        </div>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
      </div>
    </Link>
  );
}

function SignalModal({
  mode,
  riskArticles,
  repeatedSignals,
  onClose
}: {
  mode: Exclude<SignalMode, null>;
  riskArticles: DashboardSignalArticle[];
  repeatedSignals: RepeatedSignal[];
  onClose: () => void;
}) {
  const repeatedArticleCount = useMemo(() => uniqueArticleCount(repeatedSignals), [repeatedSignals]);
  const isRisk = mode === "risk";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[86vh] w-full max-w-4xl flex-col rounded-lg border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              {isRisk ? (
                <ShieldAlert className="h-5 w-5 text-rose-600" />
              ) : (
                <Sparkles className="h-5 w-5 text-sky-600" />
              )}
              <h2 className="text-base font-semibold text-slate-950">
                {isRisk ? "위험 신호 근거 기사" : "반복 신호 근거 기사"}
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {isRisk
                ? `리스크 점수에 반영된 음수 영향 기사 ${riskArticles.length}건입니다.`
                : `반복 카테고리 ${repeatedSignals.length}개, 연결 기사 ${repeatedArticleCount}건입니다.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-slate-600 hover:bg-slate-50"
            aria-label="신호 근거 팝업 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {isRisk ? (
            <div className="space-y-3">
              {riskArticles.length ? (
                riskArticles.map((article) => (
                  <SignalArticleLink key={article.id} article={article} />
                ))
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-slate-500">
                  현재 위험 신호에 연결된 기사가 없습니다.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {repeatedSignals.length ? (
                repeatedSignals.map((signal) => (
                  <section key={signal.category} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-slate-950">{signal.category}</div>
                      <Badge tone="amber">{signal.count}건 반복</Badge>
                    </div>
                    <div className="space-y-3">
                      {signal.articles.map((article) => (
                        <SignalArticleLink
                          key={`${signal.category}-${article.id}`}
                          article={article}
                          contextLabel={signal.category}
                        />
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-slate-500">
                  현재 반복 신호에 연결된 기사가 없습니다.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t bg-slate-50 px-5 py-3 text-xs text-slate-500">
          기사 제목을 누르면 뉴스 탭의 해당 기사 위치로 이동합니다.
        </div>
      </div>
    </div>
  );
}

export function DashboardSignalCards({
  riskCount,
  riskArticles,
  repeatedCount,
  repeatedSignals
}: DashboardSignalCardsProps) {
  const [mode, setMode] = useState<SignalMode>(null);
  const repeatedArticleCount = uniqueArticleCount(repeatedSignals);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>위험 신호</CardTitle>
          <CardDescription>국가별 음수 영향 누적</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            onClick={() => setMode("risk")}
            className="group flex w-full items-center gap-3 rounded-md p-1 text-left transition hover:bg-rose-50"
            aria-label="위험 신호 근거 기사 보기"
          >
            <ShieldAlert className="h-8 w-8 text-rose-600" />
            <span>
              <span className="block text-2xl font-semibold text-slate-950 group-hover:text-rose-700">{riskCount}</span>
              <span className="block text-sm text-slate-500">리스크 국가/권역 · 근거 기사 {riskArticles.length}건</span>
            </span>
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>반복 신호</CardTitle>
          <CardDescription>최근 카테고리 빈도</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            onClick={() => setMode("repeated")}
            className="group flex w-full items-center gap-3 rounded-md p-1 text-left transition hover:bg-sky-50"
            aria-label="반복 신호 근거 기사 보기"
          >
            <Sparkles className="h-8 w-8 text-sky-600" />
            <span>
              <span className="block text-2xl font-semibold text-slate-950 group-hover:text-sky-700">{repeatedCount}</span>
              <span className="block text-sm text-slate-500">반복 카테고리 · 연결 기사 {repeatedArticleCount}건</span>
            </span>
          </button>
        </CardContent>
      </Card>

      {mode && (
        <SignalModal
          mode={mode}
          riskArticles={riskArticles}
          repeatedSignals={repeatedSignals}
          onClose={() => setMode(null)}
        />
      )}
    </>
  );
}
