import type { MARKET_FACTORS, REPORT_TYPES } from "@/lib/constants";

export type MarketFactorName = (typeof MARKET_FACTORS)[number];
export type ReportTypeValue = (typeof REPORT_TYPES)[number];

export type ArticleInput = {
  title: string;
  source: string;
  url: string;
  sourceId?: string | null;
  publishedAt?: string;
  country?: string | null;
  crop?: string | null;
  category?: string | null;
  originalText: string;
  rawContent?: string | null;
  fetchedAt?: string | null;
};

export type ExtractedFactor = {
  factor_name: string;
  direction: 1 | -1;
  impact: number;
  likelihood: number;
  duration: number;
  reliability: number;
  factor_score: number;
  evidence: string;
};

export type ArticleAnalysis = {
  summary: string;
  country: string | null;
  crop: string | null;
  category: string | null;
  factors: ExtractedFactor[];
  related_products: string[];
  market_impact_score: number;
};

export type DailyReportContent = {
  today_headlines: string[];
  country_issues: string[];
  crop_issues: string[];
  market_impact_summary: string;
  product_impact_summary: string[];
  risks: string[];
  opportunities: string[];
  sales_action_items: string[];
  evidence: Array<{
    article_id: string;
    title: string;
    market_impact_score: number;
    factor_scores: Array<{
      factor_name: string;
      score: number;
      evidence: string | null;
    }>;
  }>;
};

export type NewsFetchSourceResult = {
  sourceId: string;
  sourceName: string;
  fetched: number;
  created: number;
  duplicates: number;
  analyzed: number;
  errors: string[];
};

export type NewsFetchJobResult = {
  startedAt: string;
  finishedAt: string;
  fetched: number;
  created: number;
  duplicates: number;
  analyzed: number;
  failedSources: number;
  reportId: string | null;
  sources: NewsFetchSourceResult[];
};
