"use client";

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

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
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
