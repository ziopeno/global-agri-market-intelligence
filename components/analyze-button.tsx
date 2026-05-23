"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AnalyzeButton({ articleId }: { articleId?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function analyze() {
    setMessage("");
    const response = await fetch("/api/articles/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(articleId ? { articleId } : { limit: 10 })
    });
    if (!response.ok) {
      setMessage("분석 실패");
      return;
    }
    setMessage("완료");
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={() => startTransition(analyze)} disabled={isPending}>
        {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
        분석
      </Button>
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </span>
  );
}
