"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function CollapsiblePanel({
  title,
  description,
  children,
  defaultOpen = false
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-lg border bg-card text-card-foreground shadow-soft">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-950">{title}</div>
          {description && <div className="mt-1 truncate text-sm text-slate-500">{description}</div>}
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-500 transition", isOpen && "rotate-180")} />
      </button>
      {isOpen && <div className="border-t p-5">{children}</div>}
    </section>
  );
}
