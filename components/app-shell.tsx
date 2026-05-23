"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpenText, FileText, Grid3X3, Newspaper, Radar, Rss } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "대시보드", icon: BarChart3 },
  { href: "/guide", label: "사용법", icon: BookOpenText },
  { href: "/sources", label: "소스", icon: Rss },
  { href: "/news", label: "뉴스", icon: Newspaper },
  { href: "/matrix", label: "매트릭스", icon: Grid3X3 },
  { href: "/reports", label: "리포트", icon: FileText },
  { href: "/strategy", label: "전략", icon: Radar }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-sm font-semibold text-white">
              MI
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-950">Market Intelligence System</div>
              <div className="text-xs text-slate-500">News → Signal → Trend → Insight → Strategy</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                    active && "bg-slate-950 text-white hover:bg-slate-900 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
