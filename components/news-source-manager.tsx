"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
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

  async function deleteSource(id: string) {
    setMessage("");
    const response = await fetch("/api/news-sources", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    setMessage(response.ok ? "Source 삭제 완료" : "Source 삭제 실패");
    if (response.ok) router.refresh();
  }

  async function addSource(formData: FormData) {
    setMessage("");
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/news-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        isActive: payload.isActive === "on"
      })
    });
    setMessage(response.ok ? "Source 추가 완료" : "Source 추가 실패");
    if (response.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => addSource(formData));
          event.currentTarget.reset();
        }}
        className="grid gap-3 rounded-lg border bg-slate-50 p-4 lg:grid-cols-[1fr_1.4fr_1fr_1fr_auto_auto]"
      >
        <div className="space-y-2">
          <Label htmlFor="new-source-name">Name</Label>
          <Input id="new-source-name" name="name" required placeholder="Source name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-source-url">RSS URL</Label>
          <Input id="new-source-url" name="url" type="url" required placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-source-category">Category</Label>
          <select
            id="new-source-category"
            name="category"
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
          <Label htmlFor="new-source-country">Country</Label>
          <Input id="new-source-country" name="country" placeholder="Global" />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
          <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" />
          Active
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={isPending}>Add</Button>
        </div>
      </form>

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
                  <Label>RSS URL</Label>
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
                  <Button type="button" size="icon" variant="ghost" onClick={() => startTransition(() => deleteSource(source.id))}>
                    <Trash2 className="h-4 w-4" />
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
