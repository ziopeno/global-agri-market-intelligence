"use client";

import { useMemo, useState, useTransition } from "react";
import { Save, SlidersHorizontal, X } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { MARKET_FACTORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatScore, scoreTone } from "@/lib/utils";

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
    id?: string;
    marketImpactScore?: number;
    sensitivityScore?: number;
    productImpactScore: number;
    rationale?: string | null;
    article?: {
      title: string;
      country: string | null;
      crop: string | null;
      category: string | null;
      publishedAt: string | Date;
      marketImpactScore: number;
      adjustedMarketScore: number;
    };
  }>;
};

const RADAR_GROUPS = [
  { name: "면적", factors: ["벼 재배면적", "대두 재배면적", "옥수수 재배면적"] },
  { name: "가격/소득", factors: ["작물 가격", "농가 소득"] },
  { name: "병해충", factors: ["병해충 압력", "잡초 압력"] },
  { name: "기상", factors: ["홍수", "가뭄"] },
  { name: "정책/규제", factors: ["정부 보조금", "수입 규제", "등록 규제"] },
  { name: "비용/환율", factors: ["환율", "원제 가격"] },
  { name: "경쟁", factors: ["경쟁 제품 출시"] }
] as const;

function productRadarData(product: Product, values: Record<string, number>) {
  return RADAR_GROUPS.map((group) => {
    const groupValues = group.factors.map((factorName) => Number(values[`${product.id}:${factorName}`] ?? 0));
    const average = groupValues.reduce((total, value) => total + value, 0) / groupValues.length;
    return {
      group: group.name,
      opportunity: Number(Math.max(average, 0).toFixed(2)),
      risk: Number(Math.abs(Math.min(average, 0)).toFixed(2)),
      net: Number(average.toFixed(2))
    };
  });
}

function ProductContributionModal({
  product,
  values,
  onClose
}: {
  product: Product;
  values: Record<string, number>;
  onClose: () => void;
}) {
  const radarData = productRadarData(product, values);
  const sensitivityRows = RADAR_GROUPS.map((group) => {
    const factorRows = group.factors.map((factorName) => ({
      factorName,
      value: Number(values[`${product.id}:${factorName}`] ?? 0)
    }));
    const average = factorRows.reduce((sum, item) => sum + item.value, 0) / factorRows.length;
    return { group: group.name, factorRows, average };
  });
  const impactRows = [...product.productImpacts]
    .filter((impact) => Number(impact.productImpactScore || 0) !== 0)
    .sort((a, b) => Math.abs(Number(b.productImpactScore || 0)) - Math.abs(Number(a.productImpactScore || 0)))
    .slice(0, 12);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-lg border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">{product.category}</Badge>
              {product.targetCrop && <Badge tone="green">{product.targetCrop}</Badge>}
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">{product.name} 점수 구성</h2>
            <p className="mt-1 text-sm text-slate-500">다각형 민감도와 최근 기사별 제품 영향 점수를 함께 봅니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-slate-600 hover:bg-slate-50"
            aria-label="제품 점수 팝업 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <div className="rounded-md border bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-950">민감도 다각형</div>
              <div className="mt-2 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="group" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 1]} tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(value: number) => Number(value).toFixed(2)} />
                    <Radar dataKey="opportunity" stroke="#059669" fill="#10b981" fillOpacity={0.28} />
                    <Radar dataKey="risk" stroke="#e11d48" fill="#fb7185" fillOpacity={0.22} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[620px] border-collapse bg-white text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="border-b px-3 py-2 font-semibold">그룹</th>
                    <th className="border-b px-3 py-2 font-semibold">일조한 변수</th>
                    <th className="border-b px-3 py-2 text-right font-semibold">그룹 평균</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivityRows.map((row) => (
                    <tr key={row.group} className="border-b last:border-b-0">
                      <td className="px-3 py-2 font-medium text-slate-900">{row.group}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {row.factorRows.map((factor) => (
                            <span
                              key={factor.factorName}
                              className={`rounded-sm border px-2 py-1 text-xs ${factor.value >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
                            >
                              {factor.factorName} {factor.value.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${row.average >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {row.average.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-md border">
            <table className="w-full min-w-[860px] border-collapse bg-white text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="border-b px-3 py-2 font-semibold">기사</th>
                  <th className="border-b px-3 py-2 font-semibold">시장</th>
                  <th className="border-b px-3 py-2 text-right font-semibold">Market</th>
                  <th className="border-b px-3 py-2 text-right font-semibold">Sensitivity</th>
                  <th className="border-b px-3 py-2 text-right font-semibold">Product</th>
                  <th className="border-b px-3 py-2 font-semibold">근거</th>
                </tr>
              </thead>
              <tbody>
                {impactRows.length ? (
                  impactRows.map((impact, index) => (
                    <tr key={impact.id || `${product.id}-${index}`} className="border-b last:border-b-0 align-top">
                      <td className="max-w-[260px] px-3 py-2">
                        <div className="font-medium leading-5 text-slate-900">{impact.article?.title || "기사 정보 없음"}</div>
                        {impact.article?.publishedAt && <div className="mt-1 text-xs text-slate-500">{formatDateTime(impact.article.publishedAt)}</div>}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {[impact.article?.country, impact.article?.crop, impact.article?.category].filter(Boolean).join(" · ") || "-"}
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${scoreTone(Number(impact.marketImpactScore || impact.article?.adjustedMarketScore || 0))}`}>
                        {formatScore(Number(impact.marketImpactScore || impact.article?.adjustedMarketScore || 0))}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-700">
                        {Number(impact.sensitivityScore || 0).toFixed(2)}
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${scoreTone(Number(impact.productImpactScore || 0))}`}>
                        {formatScore(Number(impact.productImpactScore || 0))}
                      </td>
                      <td className="max-w-[280px] px-3 py-2 text-xs leading-5 text-slate-600">
                        {impact.rationale || "시장 점수와 제품 민감도를 곱해 산출했습니다."}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                      아직 이 제품에 연결된 기사별 영향 점수가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SensitivityMatrix({ products }: { products: Product[] }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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

      <div className="rounded-lg border bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-950">품목별 민감도 다각형</div>
            <p className="mt-1 text-xs text-slate-500">숫자 표를 보기 전에 제품별 민감도 형태를 한눈에 비교합니다. 초록은 양의 민감도, 붉은색은 음의 민감도입니다.</p>
          </div>
          <Badge tone="slate">그룹 평균 기준</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const recentScore = product.productImpacts.reduce((total, impact) => total + impact.productImpactScore, 0);
            const chartData = productRadarData(product, values);
            return (
              <div key={product.id} className="rounded-md border bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button
                      type="button"
                      className="text-left text-sm font-semibold text-slate-950 underline-offset-2 hover:underline"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {product.name}
                    </button>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge tone="blue">{product.category}</Badge>
                      {product.targetCrop && <Badge tone="green">{product.targetCrop}</Badge>}
                    </div>
                  </div>
                  <span className="rounded-sm border bg-slate-50 px-2 py-1 text-xs text-slate-600">
                    {recentScore.toFixed(1)}
                  </span>
                </div>
                <div className="mt-2 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={chartData} outerRadius="72%">
                      <PolarGrid />
                      <PolarAngleAxis dataKey="group" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 1]} tick={{ fontSize: 9 }} />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          Number(value).toFixed(2),
                          name === "opportunity" ? "양의 민감도" : "음의 민감도"
                        ]}
                        labelFormatter={(label) => `${label}`}
                      />
                      <Radar dataKey="opportunity" stroke="#059669" fill="#10b981" fillOpacity={0.28} />
                      <Radar dataKey="risk" stroke="#e11d48" fill="#fb7185" fillOpacity={0.22} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
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
      {selectedProduct && (
        <ProductContributionModal
          product={selectedProduct}
          values={values}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
