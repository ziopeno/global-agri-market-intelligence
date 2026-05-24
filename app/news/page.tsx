import Link from "next/link";
import { ArticleForm } from "@/components/article-form";
import { CollapsiblePanel } from "@/components/collapsible-panel";
import { NewsFetchButton } from "@/components/news-fetch-button";
import { NewsPeriodWorkspace } from "@/components/news-period-workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getFallbackArticles } from "@/lib/fallback-data";
import { ensureProductSeeds } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  let articles: any[] = getFallbackArticles();
  let activeSourceCount = 0;

  try {
    await ensureProductSeeds();
    [articles, activeSourceCount] = await Promise.all([
      prisma.article.findMany({
        where: {
          OR: [
            { newsSource: { name: { contains: "Farmhannong Agro Weekly" } } },
            { rawContent: { contains: "카드뉴스 요약:" } }
          ]
        },
        include: {
          newsSource: true,
          factors: true,
          productImpacts: {
            include: { product: true },
            orderBy: { productImpactScore: "desc" }
          }
        },
        orderBy: { publishedAt: "desc" },
        take: 120
      }),
      prisma.newsSource.count({
        where: {
          isActive: true,
          name: { contains: "Farmhannong Agro Weekly" }
        }
      })
    ]);
  } catch (error) {
    console.warn("News page fallback: database is not available.", error);
  }

  const serializedArticles = JSON.parse(JSON.stringify(articles));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>자동 뉴스 수집</CardTitle>
            <CardDescription>Farmhannong Agro Weekly DB를 기준으로 신규 카드뉴스만 저장하고 AI 분석까지 실행합니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Link
              href="/sources"
              className="inline-flex h-10 items-center rounded-md border bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              News Sources 관리
            </Link>
            <span className="text-sm text-slate-500">
              현재 활성 연계 소스 {activeSourceCount}개입니다. 별도 자체 검색 RSS는 사용하지 않습니다.
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Run News Fetch Now</CardTitle>
            <CardDescription>카드뉴스 연계, 중복 제거, 분석, Daily Report 업데이트</CardDescription>
          </CardHeader>
          <CardContent>
            <NewsFetchButton />
          </CardContent>
        </Card>
      </section>

      <CollapsiblePanel title="Manual Add" description="수동 입력은 자동 수집에서 누락된 기사 보완용입니다.">
        <ArticleForm />
      </CollapsiblePanel>

      <NewsPeriodWorkspace articles={serializedArticles} />
    </div>
  );
}
