function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeArticleUrl(url: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((key) =>
      parsed.searchParams.delete(key)
    );
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function createArticleDuplicateKey(input: { title: string; source: string }) {
  return `title-source:${normalizeText(input.source)}:${normalizeText(input.title)}`;
}
