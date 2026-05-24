import type { ArticleInput } from "@/lib/types";

type FarmhannongWeeklyItem = {
  tag?: string;
  title?: string;
  body?: string;
  source?: string;
  raw_title?: string;
  raw_body?: string;
  search_keywords?: string;
  country?: string;
  company?: string;
  link?: string;
};

type FarmhannongWeeklyDatabase = Record<string, FarmhannongWeeklyItem[]>;

const FARMHANNONG_WEEKLY_URL = "https://ziopeno.github.io/farmhannong-agro-weekly-db/";

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function extractNewsDatabase(html: string): FarmhannongWeeklyDatabase {
  const marker = "const newsDatabase = ";
  const start = html.indexOf(marker);
  if (start < 0) {
    throw new Error("Farmhannong Weekly newsDatabase를 찾을 수 없습니다.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  const jsonStart = start + marker.length;
  let jsonEnd = -1;

  for (let index = jsonStart; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        jsonEnd = index + 1;
        break;
      }
    }
  }

  if (jsonEnd < 0) {
    throw new Error("Farmhannong Weekly newsDatabase JSON 범위를 해석할 수 없습니다.");
  }

  return JSON.parse(html.slice(jsonStart, jsonEnd)) as FarmhannongWeeklyDatabase;
}

function categoryFromTag(tag?: string) {
  if (tag === "reg") return "등록/규제 이슈";
  if (tag === "dev") return "경쟁사 동향";
  if (tag === "sales") return "농약/비료 시장";
  return "농약/비료 시장";
}

function buildArticleText(item: FarmhannongWeeklyItem) {
  return [
    item.raw_title && `원문 제목: ${stripHtml(item.raw_title)}`,
    item.raw_body && `원문 요약: ${stripHtml(item.raw_body)}`,
    item.body && `카드뉴스 요약:\n${stripHtml(item.body)}`,
    item.company && `관련 기업: ${item.company}`,
    item.search_keywords && `검색 키워드: ${item.search_keywords}`
  ]
    .filter(Boolean)
    .join("\n\n");
}

function normalizeTitle(title: string) {
  return title.replace(/^\d+\.\s*/, "").trim();
}

export function isFarmhannongWeeklySource(url: string, sourceName?: string | null) {
  return (
    url.includes("ziopeno.github.io/farmhannong-agro-weekly-db") ||
    url.includes("farmhannong-agro-weekly-db") ||
    sourceName?.toLowerCase().includes("farmhannong agro weekly")
  );
}

export async function collectFarmhannongWeeklyArticles(
  url = FARMHANNONG_WEEKLY_URL,
  options?: {
    sourceId?: string;
  }
): Promise<ArticleInput[]> {
  const timeoutMs = Math.max(1000, Number(process.env.WEEKLY_CARD_NEWS_FETCH_TIMEOUT_MS || 8000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AgriMarketIntelligence/0.1"
    },
    signal: controller.signal,
    next: { revalidate: 0 }
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`Farmhannong Weekly 수집 실패: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const database = extractNewsDatabase(html);
  const latestDate = Object.keys(database).sort().reverse()[0];
  const items = latestDate ? database[latestDate] || [] : [];
  const maxItems = Math.max(1, Math.min(50, Number(process.env.WEEKLY_CARD_NEWS_MAX_ITEMS || 30)));

  return items.slice(0, maxItems).map((item, index) => {
    const title = normalizeTitle(item.title || item.raw_title || `Farmhannong Weekly item ${index + 1}`);
    const source = item.source || "Farmhannong Agro Weekly";
    const originalText = buildArticleText(item) || title;
    const urlForArticle = item.link || `${url}#${latestDate}-${index + 1}`;

    return {
      title,
      source,
      sourceId: options?.sourceId || null,
      url: urlForArticle,
      publishedAt: latestDate ? new Date(`${latestDate}T09:00:00+09:00`).toISOString() : new Date().toISOString(),
      country: item.country || null,
      category: categoryFromTag(item.tag),
      originalText,
      rawContent: originalText,
      fetchedAt: new Date().toISOString()
    };
  });
}
