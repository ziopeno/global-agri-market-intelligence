import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "slate" | "green" | "blue" | "amber" | "rose";
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-1 text-xs font-medium",
        tone === "slate" && "border-slate-200 bg-slate-50 text-slate-700",
        tone === "green" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "blue" && "border-sky-200 bg-sky-50 text-sky-700",
        tone === "amber" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "rose" && "border-rose-200 bg-rose-50 text-rose-700",
        className
      )}
      {...props}
    />
  );
}
