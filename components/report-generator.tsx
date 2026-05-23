"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, RefreshCw } from "lucide-react";
import { REPORT_LABELS, REPORT_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function ReportGenerator() {
  const router = useRouter();
  const [type, setType] = useState("daily");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function generate() {
    setMessage("");
    const response = await fetch("/api/reports/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    });
    if (!response.ok) {
      setMessage("리포트 생성 실패");
      return;
    }
    setMessage("리포트 생성 완료");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={type}
        onChange={(event) => setType(event.target.value)}
        className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {REPORT_TYPES.map((reportType) => (
          <option key={reportType} value={reportType}>
            {REPORT_LABELS[reportType]}
          </option>
        ))}
      </select>
      <Button onClick={() => startTransition(generate)} disabled={isPending}>
        {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        리포트 생성
      </Button>
      {message && <span className="text-sm text-slate-600">{message}</span>}
    </div>
  );
}
