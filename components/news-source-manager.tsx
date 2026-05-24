"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { ISSUE_CATEGORIES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NewsSourceRow = {
  id: string;
  name: string;
  url: string;
  category: string | null;
  country: string | null;
  isActive: boolean;
  lastFetchedAt: Date | string | null;
  _count?: { articles: number };
};

export function NewsSourceManager({ sources }: { sources: NewsSourceRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<Record<string, NewsSourceRow>>(
    Object.fromEntries(sources.map((source) => [source.id, source]))
  );

  function updateDraft(id: string, patch: Partial<NewsSourceRow>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch }
    }));
  }

  async function saveSource(id: string) {
    setMessage("");
    const draft = drafts[id];
    const response = await fetch("/api/news-sources", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    setMessage(response.ok ? "Source 저장 완료" : "Source 저장 실패");
    if (response.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
        자동 수집 Source는 Farmhannong Agro Weekly DB 하나로 고정되어 있습니다.
        별도 자체 검색용 RSS Source는 추가하지 않습니다.
      </div>

      {message && <div className="text-sm text-slate-600">{message}</div>}

      <div className="space-y-3">
        {sources.map((source) => {
          const draft = drafts[source.id] || source;
          return (
            <div key={source.id} className="rounded-lg border bg-white p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_1.6fr_1fr_1fr_auto_auto]">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={draft.name} onChange={(event) => updateDraft(source.id, { name: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Source URL</Label>
                  <Input value={draft.url} onChange={(event) => updateDraft(source.id, { url: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    value={draft.category || ""}
                    onChange={(event) => updateDraft(source.id, { category: event.target.value || null })}
                    className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">자동 분류</option>
                    {ISSUE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={draft.country || ""} onChange={(event) => updateDraft(source.id, { country: event.target.value || null })} />
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(event) => updateDraft(source.id, { isActive: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Active
                </label>
                <div className="flex items-end gap-2">
                  <Button type="button" size="icon" variant="secondary" onClick={() => startTransition(() => saveSource(source.id))}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge tone={source.isActive ? "green" : "slate"}>{source.isActive ? "Active" : "Paused"}</Badge>
                <span>Articles {source._count?.articles || 0}</span>
                <span>Last fetched {source.lastFetchedAt ? formatDateTime(source.lastFetchedAt) : "never"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
