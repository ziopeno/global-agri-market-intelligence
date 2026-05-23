import type { ArticleInput } from "@/lib/types";

function tagValue(xml: string, tag: string) {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "i"));
  return decodeXml(stripCdata(match?.[1] || "").trim());
}

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function stripCdata(value: string) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function stripHtml(value: string) {
  return decodeXml(stripCdata(value))
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
}

function firstValue(item: string, tags: string[]) {
  for (const tag of tags) {
    const value = tagValue(item, tag);
    if (value) return value;
  }
  return "";
}

function atomLink(item: string) {
  return (
    item.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i)?.[1] ||
    item.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)?.[1] ||
    ""
  );
}

function normalizeLink(link: string, baseUrl: string) {
  try {
    return new URL(link, baseUrl).toString();
  } catch {
    return link;
  }
}

function parsePublishedAt(value: string) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function collectRssArticles(
  rssUrl: string,
  options?: {
    sourceName?: string;
    sourceId?: string;
    category?: string | null;
    country?: string | null;
  }
): Promise<ArticleInput[]> {
  const timeoutMs = Math.max(1000, Number(process.env.RSS_FETCH_TIMEOUT_MS || 5000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(rssUrl, {
    headers: {
      "User-Agent": "AgriMarketIntelligence/0.1"
    },
    signal: controller.signal,
    next: { revalidate: 0 }
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`RSS 수집 실패: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const itemMatches = Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi));
  const entries = itemMatches.length
    ? itemMatches.map((match) => match[0])
    : Array.from(xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)).map((match) => match[0]);

  const maxItems = Math.max(1, Math.min(30, Number(process.env.RSS_MAX_ITEMS_PER_SOURCE || 10)));

  return entries.slice(0, maxItems).map((item) => {
    const title = tagValue(item, "title") || "Untitled article";
    const link =
      tagValue(item, "link") ||
      atomLink(item) ||
      `rss:${rssUrl}:${title}`;
    const publishedAt = firstValue(item, ["pubDate", "published", "updated", "dc:date"]);
    const description = firstValue(item, ["description", "summary", "content:encoded", "content"]);
    const cleanContent = stripHtml(description || title);

    return {
      title,
      source: options?.sourceName || new URL(rssUrl).hostname.replace(/^www\./, ""),
      sourceId: options?.sourceId || null,
      url: normalizeLink(link, rssUrl),
      publishedAt: parsePublishedAt(publishedAt),
      country: options?.country || null,
      category: options?.category || null,
      originalText: cleanContent || title,
      rawContent: cleanContent || title,
      fetchedAt: new Date().toISOString()
    };
  });
}
