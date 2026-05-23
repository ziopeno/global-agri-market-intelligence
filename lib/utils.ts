export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatScore(score: number | null | undefined, digits = 1) {
  const value = Number(score ?? 0);
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

export function scoreTone(score: number | null | undefined) {
  const value = Number(score ?? 0);
  if (value >= 8) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (value >= 2) return "text-teal-700 bg-teal-50 border-teal-200";
  if (value <= -8) return "text-rose-700 bg-rose-50 border-rose-200";
  if (value <= -2) return "text-amber-800 bg-amber-50 border-amber-200";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(new Date(date));
}

export function startOfKstDay(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return new Date(`${year}-${month}-${day}T00:00:00+09:00`);
}

export function endOfKstDay(date = new Date()) {
  const start = startOfKstDay(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function toTitleDate(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
