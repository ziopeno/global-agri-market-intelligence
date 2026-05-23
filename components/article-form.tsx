"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, RefreshCw } from "lucide-react";
import { ISSUE_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ArticleForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function submitArticle(formData: FormData) {
    setMessage("");
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, analyze: true })
    });
    if (!response.ok) {
      setMessage("기사 저장 중 문제가 발생했습니다.");
      return;
    }
    setMessage("기사 저장과 분석이 완료되었습니다.");
    router.refresh();
  }

  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <div className="mb-4">
        <div className="font-semibold text-slate-950">Manual Add</div>
        <p className="mt-1 text-sm text-slate-500">자동 수집에서 빠진 기사만 보조로 입력합니다.</p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => submitArticle(formData));
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">기사 제목</Label>
            <Input id="title" name="title" required placeholder="예: Brazil soybean area expected to rise" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">출처</Label>
            <Input id="source" name="source" required placeholder="Reuters, USDA, FAO..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">원문 링크</Label>
            <Input id="url" name="url" type="url" placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="publishedAt">발행일</Label>
            <Input id="publishedAt" name="publishedAt" type="datetime-local" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">국가</Label>
            <Input id="country" name="country" placeholder="Brazil, Vietnam, EU..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="crop">작물</Label>
            <Input id="crop" name="crop" placeholder="Rice, Soybean, Corn..." />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">이슈 유형</Label>
          <select
            id="category"
            name="category"
            className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
          >
            <option value="">AI 자동 분류</option>
            {ISSUE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="originalText">기사 원문 또는 본문 요약</Label>
          <Textarea id="originalText" name="originalText" required placeholder="기사 본문을 붙여넣으세요." />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={isPending} type="submit">
            {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
            저장 후 분석
          </Button>
          {message && <span className="text-sm text-slate-600">{message}</span>}
        </div>
      </form>
    </div>
  );
}
