import { NewsFetchButton } from "@/components/news-fetch-button";
import { NewsSourceManager } from "@/components/news-source-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getFallbackSources } from "@/lib/fallback-data";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  let sources: any[] = getFallbackSources();
  let logs: any[] = [];

  try {
    [sources, logs] = await Promise.all([
      prisma.newsSource.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { articles: true }
          }
        }
      }),
      prisma.newsFetchLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20
      })
    ]);
  } catch (error) {
    console.warn("Sources page fallback: database is not available.", error);
  }

  const activeCount = sources.filter((source) => source.isActive).length;
  const sourceRows = sources.map((source) => ({
    ...source,
    lastFetchedAt: source.lastFetchedAt ? new Date(source.lastFetchedAt).toISOString() : null,
    createdAt: new Date(source.createdAt).toISOString(),
    updatedAt: new Date(source.updatedAt).toISOString()
  }));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>News Sources</CardTitle>
            <CardDescription>등록된 active Weekly DB/RSS source가 매주 월요일 자동 수집의 기준입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border bg-white p-3">
                <div className="text-2xl font-semibold">{sources.length}</div>
                <div className="text-sm text-slate-500">등록 Source</div>
              </div>
              <div className="rounded-md border bg-white p-3">
                <div className="text-2xl font-semibold">{activeCount}</div>
                <div className="text-sm text-slate-500">Active Source</div>
              </div>
              <div className="rounded-md border bg-white p-3">
                <div className="text-2xl font-semibold">{sources.reduce((total, source) => total + source._count.articles, 0)}</div>
                <div className="text-sm text-slate-500">수집 기사</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automatic Fetch</CardTitle>
            <CardDescription>Weekly DB/RSS 수집, 중복 제거, AI 분석, Daily Report 업데이트를 한 번에 실행합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewsFetchButton />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>RSS Source 관리</CardTitle>
          <CardDescription>name, url, category, country, is_active, last_fetched_at을 관리합니다. Farmhannong Agro Weekly DB도 Source로 관리됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewsSourceManager sources={sourceRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 Fetch 로그</CardTitle>
          <CardDescription>Source별 성공·실패 로그와 신규/중복/분석 건수입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.length ? (
            logs.map((log) => (
              <div key={log.id} className="rounded-md border bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={log.status === "success" ? "green" : "rose"}>{log.status}</Badge>
                    <span className="font-medium text-slate-950">{log.sourceName || "Job"}</span>
                    <span className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    fetched {log.fetchedCount} / new {log.newCount} / duplicate {log.duplicateCount} / analyzed {log.analyzedCount}
                  </div>
                </div>
                {log.message && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">{log.message}</p>}
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed p-5 text-sm text-slate-500">아직 fetch 로그가 없습니다.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
