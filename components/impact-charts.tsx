"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const TREND_RANGE_OPTIONS = [
  { key: "month", label: "한달", days: 31 },
  { key: "quarter", label: "한 분기", days: 92 },
  { key: "halfYear", label: "반기", days: 183 },
  { key: "year", label: "연도", days: 366 },
  { key: "all", label: "전체", days: null }
] as const;

export function ProductImpactChart({ data }: { data: Array<{ name: string; score: number }> }) {
  if (!data.length) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-500">제품 영향 데이터가 없습니다.</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 36 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" angle={-28} textAnchor="end" interval={0} height={54} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => value.toFixed(1)} />
          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
            {data.map((item) => (
              <Cell key={item.name} fill={item.score >= 0 ? "#059669" : "#e11d48"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyScoresChart({ data }: { data: Array<{ date: string; score: number }> }) {
  if (!data.length) {
    return <div className="flex h-48 items-center justify-center text-sm text-slate-500">최근 7일 점수 데이터가 없습니다.</div>;
  }

  const orderedData = [...data].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={orderedData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => value.toFixed(1)} />
          <Line type="monotone" dataKey="score" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MarketScoreTrendChart({
  data
}: {
  data: Array<{ date: string; score: number; articleCount?: number }>;
}) {
  const [rangeKey, setRangeKey] = useState<(typeof TREND_RANGE_OPTIONS)[number]["key"]>("quarter");
  const selectedRange = TREND_RANGE_OPTIONS.find((option) => option.key === rangeKey) || TREND_RANGE_OPTIONS[1];
  const orderedData = useMemo(() => [...data].sort((a, b) => a.date.localeCompare(b.date)), [data]);
  const filteredData = useMemo(() => {
    if (!selectedRange.days) return orderedData;
    const cutoff = new Date(Date.now() - selectedRange.days * 24 * 60 * 60 * 1000);
    return orderedData.filter((item) => new Date(`${item.date}T00:00:00+09:00`) >= cutoff);
  }, [orderedData, selectedRange.days]);
  const articleCount = filteredData.reduce((sum, item) => sum + Number(item.articleCount || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {TREND_RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRangeKey(option.key)}
              className={`h-8 rounded-md border px-2.5 text-xs font-semibold transition ${
                rangeKey === option.key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500">
          {filteredData.length}주차 · 기사 {articleCount}건
        </div>
      </div>

      {filteredData.length ? (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === "articleCount" ? `${Number(value).toFixed(0)}건` : value.toFixed(1),
                  name === "articleCount" ? "기사 수" : "시장 점수"
                ]}
              />
              <Line type="monotone" dataKey="score" name="시장 점수" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="articleCount" name="기사 수" stroke="#64748b" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-slate-500">
          선택한 기간에 표시할 주차별 점수 데이터가 없습니다.
        </div>
      )}
    </div>
  );
}
