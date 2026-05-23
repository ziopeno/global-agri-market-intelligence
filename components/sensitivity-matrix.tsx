"use client";

import { useMemo, useState, useTransition } from "react";
import { Save, SlidersHorizontal } from "lucide-react";
import { MARKET_FACTORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Product = {
  id: string;
  name: string;
  category: string;
  targetCrop: string | null;
  sensitivities: Array<{
    id: string;
    factorName: string;
    sensitivityScore: number;
  }>;
  productImpacts: Array<{
    productImpactScore: number;
  }>;
};

export function SensitivityMatrix({ products }: { products: Product[] }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const initialValues = useMemo(() => {
    const values: Record<string, number> = {};
    for (const product of products) {
      for (const factor of MARKET_FACTORS) {
        const sensitivity = product.sensitivities.find((item) => item.factorName === factor);
        values[`${product.id}:${factor}`] = sensitivity?.sensitivityScore ?? 0;
      }
    }
    return values;
  }, [products]);
  const [values, setValues] = useState(initialValues);

  function update(productId: string, factorName: string, value: string) {
    const parsed = Number(value);
    setValues((current) => ({
      ...current,
      [`${productId}:${factorName}`]: Number.isFinite(parsed) ? Math.max(-1, Math.min(1, parsed)) : 0
    }));
  }

  async function save() {
    const updates = Object.entries(values).map(([key, sensitivityScore]) => {
      const [productId, factorName] = key.split(":");
      return { productId, factorName, sensitivityScore };
    });

    const response = await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates })
    });

    if (!response.ok) {
      setMessage("저장 실패");
      return;
    }
    setMessage("저장 및 기존 제품 영향 재계산 완료");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <SlidersHorizontal className="h-4 w-4" />
          민감도 범위 -1.0 ~ +1.0
        </div>
        <div className="flex items-center gap-3">
          {message && <span className="text-sm text-slate-600">{message}</span>}
          <Button onClick={() => startTransition(save)} disabled={isPending}>
            <Save className="h-4 w-4" />
            저장
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1280px] border-collapse bg-white text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 w-56 border-b bg-slate-50 px-3 py-3 text-left font-semibold">제품</th>
              {MARKET_FACTORS.map((factor) => (
                <th key={factor} className="w-28 border-b px-2 py-3 text-center font-semibold">
                  {factor}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const recentScore = product.productImpacts.reduce((total, impact) => total + impact.productImpactScore, 0);
              return (
                <tr key={product.id} className="border-b last:border-b-0">
                  <td className="sticky left-0 z-10 bg-white px-3 py-3">
                    <div className="font-semibold text-slate-950">{product.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge tone="blue">{product.category}</Badge>
                      {product.targetCrop && <Badge tone="green">{product.targetCrop}</Badge>}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">최근 영향 합계 {recentScore.toFixed(1)}</div>
                  </td>
                  {MARKET_FACTORS.map((factor) => {
                    const key = `${product.id}:${factor}`;
                    return (
                      <td key={factor} className="px-2 py-3">
                        <input
                          type="number"
                          min={-1}
                          max={1}
                          step={0.05}
                          value={values[key] ?? 0}
                          onChange={(event) => update(product.id, factor, event.target.value)}
                          className="h-9 w-full rounded-md border bg-white px-2 text-center text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
