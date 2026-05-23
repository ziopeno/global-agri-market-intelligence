"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NewsFetchJobResult } from "@/lib/types";

export function NewsFetchButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<NewsFetchJobResult | null>(null);
  const [error, setError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [secret, setSecret] = useState("");

  async function runFetch() {
    setError("");
    setResult(null);
    const endpoint = secret.trim()
      ? `/api/jobs/fetch-news?secret=${encodeURIComponent(secret.trim())}`
      : "/api/jobs/fetch-news";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      if (response.status === 401) {
        setShowSecret(true);
        setError("관리자 실행 키가 필요합니다.");
        return;
      }
      setError("뉴스 수집 작업을 실행하지 못했습니다.");
      return;
    }

    const data = (await response.json()) as NewsFetchJobResult;
    setResult(data);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {showSecret && (
        <input
          type="password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          placeholder="관리자 실행 키"
          className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      )}
      <Button onClick={() => startTransition(runFetch)} disabled={isPending}>
        {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Run News Fetch Now
      </Button>
      {error && <div className="text-sm text-rose-700">{error}</div>}
      {result && (
        <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
          신규 기사 {result.created}개 수집, 중복 {result.duplicates}개 제외, 분석 완료 {result.analyzed}개
          {result.failedSources > 0 && `, 실패 소스 ${result.failedSources}개`}
          {result.reportId && <span>, Daily Report 업데이트 완료</span>}
        </div>
      )}
    </div>
  );
}
