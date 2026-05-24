import { ISSUE_CATEGORIES, MARKET_FACTORS, PRODUCT_SEEDS } from "@/lib/constants";
import {
  buildArticleAnalysisPrompt,
  buildDailyReportPrompt,
  buildPeriodStrategyPrompt,
  DAILY_REPORT_SYSTEM_PROMPT,
  MARKET_ANALYSIS_SYSTEM_PROMPT,
  PERIOD_STRATEGY_SYSTEM_PROMPT
} from "@/lib/prompts";
import { normalizeFactor, sumMarketImpact } from "@/lib/scoring";
import type { ArticleAnalysis, ArticleInput, DailyReportContent, ExtractedFactor } from "@/lib/types";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

async function callOpenAIJson<T>(messages: ChatMessage[]): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 30000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages
    })
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  return JSON.parse(content) as T;
}

function inferReliability(source: string, text = "") {
  const lower = `${source} ${text}`.toLowerCase();
  if (/(fao|usda|eu|commission|government|ministry|un|world bank|worldbank|oecd|itc|epa|efsa|official|ministry)/i.test(lower)) return 1;
  if (/(reuters|bloomberg|financial times|ft\.com|agrimoney|feedstuffs|dtn|successful farming|feednavigator)/i.test(lower)) return 0.8;
  if (/(company|corp|brief|industry|agropages|association|press release|sample|farmhannong agro weekly)/i.test(lower)) return 0.6;
  if (/(blog|unknown|unclear|social|forum)/i.test(lower)) return 0.4;
  return 0.8;
}

function pushFactor(
  factors: ExtractedFactor[],
  input: Omit<Partial<ExtractedFactor>, "factor_score"> & { factor_name: string },
  source: string
) {
  factors.push(
    normalizeFactor({
      direction: input.direction,
      impact: input.impact,
      likelihood: input.likelihood,
      duration: input.duration,
      reliability: input.reliability ?? inferReliability(source),
      factor_name: MARKET_FACTORS.includes(input.factor_name as (typeof MARKET_FACTORS)[number])
        ? input.factor_name
        : "작물 가격",
      evidence: input.evidence
    })
  );
}

function inferCountry(text: string) {
  const countries = [
    "Brazil",
    "Vietnam",
    "India",
    "China",
    "United States",
    "Argentina",
    "European Union",
    "Thailand",
    "Indonesia",
    "Australia",
    "Canada",
    "Mexico"
  ];
  return countries.find((country) => text.toLowerCase().includes(country.toLowerCase())) || null;
}

function inferCrop(text: string) {
  const crops = [
    ["rice", "Rice"],
    ["paddy", "Rice"],
    ["soybean", "Soybean"],
    ["soy", "Soybean"],
    ["corn", "Corn"],
    ["maize", "Corn"],
    ["wheat", "Wheat"],
    ["cotton", "Cotton"],
    ["vegetable", "Vegetable"],
    ["fruit", "Fruit"]
  ] as const;
  return crops.find(([keyword]) => text.toLowerCase().includes(keyword))?.[1] || null;
}

function inferCategory(text: string) {
  const lower = text.toLowerCase();
  if (/(drought|flood|rain|heat|el nino|la nina|weather|storm)/.test(lower)) return "기상재해";
  if (/(pest|insect|disease|fungus|weed|armyworm|locust)/.test(lower)) return "병해충/잡초 발생";
  if (/(registration|regulatory|ban|review|approval|residue|mrl)/.test(lower)) return "등록/규제 이슈";
  if (/(export|import|tariff|quota|license|customs)/.test(lower)) return "수출입 규제";
  if (/(fertilizer|pesticide|agrochemical|active ingredient|glyphosate|technical)/.test(lower)) return "농약/비료 시장";
  if (/(price|futures|commodity|margin)/.test(lower)) return "농산물 가격";
  if (/(area|acreage|planted|planting|hectare)/.test(lower)) return "재배면적";
  if (/(subsidy|policy|support|government)/.test(lower)) return "정부 정책";
  return "농산물 수급";
}

function heuristicAnalyzeArticle(article: ArticleInput): ArticleAnalysis {
  const combined = `${article.title}\n${article.originalText}`;
  const lower = combined.toLowerCase();
  const factors: ExtractedFactor[] = [];
  const positive = /(rise|increase|expand|recover|stronger|favorable|higher|growth|boost|support)/.test(lower);
  const negative = /(fall|decline|cut|reduce|tighten|ban|risk|damage|delay|shortage|drought|flood|stricter)/.test(lower);
  const direction = negative && !positive ? -1 : 1;

  if (/(rice|paddy).*(area|acreage|planted|planting|hectare)|area.*(rice|paddy)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "벼 재배면적",
      direction,
      impact: 4,
      likelihood: 4,
      duration: 1.3,
      evidence: "벼 재배면적 또는 파종면적 변화가 언급되었습니다."
    }, article.source);
  }

  if (/(soybean|soy).*(area|acreage|planted|planting|hectare)|area.*(soybean|soy)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "대두 재배면적",
      direction,
      impact: 4,
      likelihood: 4,
      duration: 1.3,
      evidence: "대두 재배면적 확대 또는 축소 전망이 확인되었습니다."
    }, article.source);
  }

  if (/(corn|maize).*(area|acreage|planted|planting|hectare)|area.*(corn|maize)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "옥수수 재배면적",
      direction,
      impact: 4,
      likelihood: 4,
      duration: 1.3,
      evidence: "옥수수 재배면적 변화가 시장 변수로 언급되었습니다."
    }, article.source);
  }

  if (/(price|futures|commodity|grain value|crop value)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "작물 가격",
      direction,
      impact: 3,
      likelihood: 4,
      duration: 1,
      evidence: "작물 가격 또는 선물가격 변화가 기사에 포함되었습니다."
    }, article.source);
  }

  if (/(farm income|farmer income|margin|profitability|farm margins)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "농가 소득",
      direction,
      impact: 3,
      likelihood: 4,
      duration: 1.3,
      evidence: "농가 수익성 또는 마진 변화가 언급되었습니다."
    }, article.source);
  }

  if (/(pest|insect|armyworm|locust|disease|fungus|blight|rust)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "병해충 압력",
      direction: 1,
      impact: 4,
      likelihood: 4,
      duration: 1,
      evidence: "병해충 또는 병 발생 압력이 기사에 나타났습니다."
    }, article.source);
  }

  if (/(weed|herbicide resistance|resistant weed)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "잡초 압력",
      direction: 1,
      impact: 4,
      likelihood: 4,
      duration: 1.3,
      evidence: "잡초 발생 또는 저항성 잡초 문제가 언급되었습니다."
    }, article.source);
  }

  if (/(flood|heavy rain|excess rain|waterlogging)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "홍수",
      direction: -1,
      impact: 4,
      likelihood: 4,
      duration: 1,
      evidence: "홍수 또는 과다 강우로 인한 생산 차질 가능성이 언급되었습니다."
    }, article.source);
  }

  if (/(drought|dryness|el nino|heatwave|water shortage)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "가뭄",
      direction: -1,
      impact: 4,
      likelihood: 4,
      duration: 1.3,
      evidence: "가뭄 또는 고온·수분 부족 위험이 기사에 포함되었습니다."
    }, article.source);
  }

  if (/(subsidy|support program|government support)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "정부 보조금",
      direction: 1,
      impact: 3,
      likelihood: 4,
      duration: 1.3,
      evidence: "정부 보조금 또는 지원 정책이 시장 수요에 영향을 줄 수 있습니다."
    }, article.source);
  }

  if (/(import restriction|export control|tariff|quota|license|customs|export license)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "수입 규제",
      direction: -1,
      impact: 4,
      likelihood: 4,
      duration: 1.3,
      evidence: "수출입 규제 또는 허가 제한이 언급되었습니다."
    }, article.source);
  }

  if (/(currency|exchange rate|weaker currency|stronger dollar|fx)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "환율",
      direction: lower.includes("favorable") || lower.includes("weaker") ? 1 : -1,
      impact: 3,
      likelihood: 3,
      duration: 1,
      evidence: "환율 또는 통화 여건 변화가 시장 변수로 제시되었습니다."
    }, article.source);
  }

  if (/(active ingredient|technical price|raw material|intermediate|ai price)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "원제 가격",
      direction: /(fall|lower|decline|ease)/.test(lower) ? 1 : -1,
      impact: 4,
      likelihood: 3,
      duration: 1.3,
      evidence: "원제 또는 원료 가격 변화가 비용 변수로 확인되었습니다."
    }, article.source);
  }

  if (/(competitor|new product|launch|generic entry)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "경쟁 제품 출시",
      direction: -1,
      impact: 3,
      likelihood: 4,
      duration: 1.3,
      evidence: "경쟁 제품 출시 또는 경쟁사 동향이 언급되었습니다."
    }, article.source);
  }

  if (/(registration|regulatory review|ban|approval|renewal|mrl|residue)/.test(lower)) {
    pushFactor(factors, {
      factor_name: "등록 규제",
      direction: /(approval|approved|renewed)/.test(lower) ? 1 : -1,
      impact: 4,
      likelihood: 4,
      duration: 1.6,
      evidence: "등록·규제 심사 또는 갱신 리스크가 언급되었습니다."
    }, article.source);
  }

  if (factors.length === 0) {
    pushFactor(factors, {
      factor_name: "작물 가격",
      direction: direction as 1 | -1,
      impact: 2,
      likelihood: 3,
      duration: 1,
      evidence: "명시적 변수는 제한적이나 농업시장 관련 뉴스로 기본 시장 신호를 생성했습니다."
    }, article.source);
  }

  const marketImpactScore = sumMarketImpact(factors);
  const category = article.category || inferCategory(combined);
  const relatedProducts = PRODUCT_SEEDS.filter((product) => {
    const haystack = `${product.targetCrop} ${product.category} ${product.description}`.toLowerCase();
    return (
      (inferCrop(combined)?.toLowerCase() && haystack.includes(inferCrop(combined)!.toLowerCase())) ||
      (factors.some((factor) => factor.factor_name.includes("잡초")) && product.category === "Herbicide") ||
      (factors.some((factor) => factor.factor_name.includes("병해충")) && product.category === "Insecticide") ||
      (factors.some((factor) => factor.factor_name.includes("홍수")) && product.name === "Difenoconazole")
    );
  }).map((product) => product.name);

  return {
    summary:
      `${article.title} 기사에서 ${category} 관련 신호가 확인되었습니다. 시장 영향 점수는 ${marketImpactScore.toFixed(1)}점이며, 주요 요인은 ${factors
        .slice(0, 2)
        .map((factor) => factor.factor_name)
        .join(", ")}입니다.`,
    country: article.country || inferCountry(combined),
    crop: article.crop || inferCrop(combined),
    category,
    factors,
    related_products: relatedProducts,
    market_impact_score: marketImpactScore
  };
}

export async function analyzeArticle(article: ArticleInput): Promise<ArticleAnalysis> {
  try {
    const result = await callOpenAIJson<Omit<ArticleAnalysis, "market_impact_score">>([
      { role: "system", content: MARKET_ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: buildArticleAnalysisPrompt(article) }
    ]);

    if (!result) return heuristicAnalyzeArticle(article);

    const sourceReliability = inferReliability(article.source, `${article.title}\n${article.originalText}`);
    const factors = (result.factors || [])
      .map((factor) => normalizeFactor({ ...factor, reliability: sourceReliability }))
      .filter((factor) => MARKET_FACTORS.includes(factor.factor_name as (typeof MARKET_FACTORS)[number]));

    const normalizedFactors = factors.length ? factors : heuristicAnalyzeArticle(article).factors;
    const marketImpactScore = sumMarketImpact(normalizedFactors);
    const category = result.category && ISSUE_CATEGORIES.includes(result.category as (typeof ISSUE_CATEGORIES)[number])
      ? result.category
      : article.category || "농산물 수급";

    return {
      summary: result.summary || heuristicAnalyzeArticle(article).summary,
      country: result.country || article.country || null,
      crop: result.crop || article.crop || null,
      category,
      factors: normalizedFactors,
      related_products: result.related_products || [],
      market_impact_score: marketImpactScore
    };
  } catch {
    return heuristicAnalyzeArticle(article);
  }
}

export async function generateDailyReportFromAi(serializedInput: string): Promise<Omit<DailyReportContent, "evidence"> | null> {
  try {
    return await callOpenAIJson<Omit<DailyReportContent, "evidence">>([
      { role: "system", content: DAILY_REPORT_SYSTEM_PROMPT },
      { role: "user", content: buildDailyReportPrompt(serializedInput) }
    ]);
  } catch {
    return null;
  }
}

export async function generatePeriodStrategyFromAi<T>(serializedInput: string): Promise<T | null> {
  try {
    return await callOpenAIJson<T>([
      { role: "system", content: PERIOD_STRATEGY_SYSTEM_PROMPT },
      { role: "user", content: buildPeriodStrategyPrompt(serializedInput) }
    ]);
  } catch {
    return null;
  }
}
