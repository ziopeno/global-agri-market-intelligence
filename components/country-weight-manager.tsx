"use client";

import { useState, useTransition } from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CountryWeightRow = {
  id?: string;
  country: string;
  marketSizeWeight: number;
  businessImportanceWeight: number;
  notes?: string | null;
};

export function CountryWeightManager({ initialWeights }: { initialWeights: CountryWeightRow[] }) {
  const [rows, setRows] = useState<CountryWeightRow[]>(initialWeights);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateRow(index: number, patch: Partial<CountryWeightRow>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  async function save() {
    const response = await fetch("/api/country-weights", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weights: rows })
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? `${data.updated || 0}개 국가 가중치를 저장했습니다.` : data.error || "저장에 실패했습니다.");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">국가별 사업 중요도</h2>
          <p className="text-sm text-slate-500">시장 규모 가중치와 사업 중요도를 조정하면 국가 점수와 대시보드 우선순위에 반영됩니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setRows((current) => [
                ...current,
                { country: "", marketSizeWeight: 1, businessImportanceWeight: 1, notes: "" }
              ])
            }
          >
            <Plus className="h-4 w-4" />
            국가 추가
          </Button>
          <Button type="button" onClick={() => startTransition(save)} disabled={isPending}>
            <Save className="h-4 w-4" />
            저장
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">국가</th>
              <th className="px-3 py-2">시장 규모</th>
              <th className="px-3 py-2">사업 중요도</th>
              <th className="px-3 py-2">관리 메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row.id || index}>
                <td className="w-44 px-3 py-2">
                  <Input value={row.country} onChange={(event) => updateRow(index, { country: event.target.value })} />
                </td>
                <td className="w-32 px-3 py-2">
                  <Input
                    type="number"
                    step={0.1}
                    min={0.2}
                    max={3}
                    value={row.marketSizeWeight}
                    onChange={(event) => updateRow(index, { marketSizeWeight: Number(event.target.value) })}
                  />
                </td>
                <td className="w-32 px-3 py-2">
                  <Input
                    type="number"
                    step={0.1}
                    min={0.2}
                    max={3}
                    value={row.businessImportanceWeight}
                    onChange={(event) => updateRow(index, { businessImportanceWeight: Number(event.target.value) })}
                  />
                </td>
                <td className="min-w-72 px-3 py-2">
                  <Textarea
                    className="min-h-10"
                    value={row.notes || ""}
                    onChange={(event) => updateRow(index, { notes: event.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}
