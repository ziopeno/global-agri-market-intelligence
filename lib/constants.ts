export const ISSUE_CATEGORIES = [
  "농산물 가격",
  "농산물 수급",
  "재배면적",
  "기상재해",
  "병해충/잡초 발생",
  "정부 정책",
  "수출입 규제",
  "농약/비료 시장",
  "원제 가격",
  "환율",
  "금리/인플레이션",
  "물류/공급망",
  "경쟁사 동향",
  "등록/규제 이슈"
] as const;

export const MARKET_FACTORS = [
  "벼 재배면적",
  "대두 재배면적",
  "옥수수 재배면적",
  "작물 가격",
  "농가 소득",
  "병해충 압력",
  "잡초 압력",
  "홍수",
  "가뭄",
  "정부 보조금",
  "수입 규제",
  "환율",
  "원제 가격",
  "경쟁 제품 출시",
  "등록 규제"
] as const;

export const REPORT_TYPES = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "half_year",
  "annual"
] as const;

export const REPORT_LABELS: Record<(typeof REPORT_TYPES)[number], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_year: "Half-year",
  annual: "Annual"
};

export const RELIABILITY_LABELS = [
  { score: 1.0, label: "공식기관 / 정부 / 국제기구" },
  { score: 0.8, label: "주요 언론 / 전문지" },
  { score: 0.6, label: "업계지 / 기업 발표" },
  { score: 0.4, label: "블로그 / 불명확한 출처" }
] as const;

export const PRODUCT_SEEDS = [
  {
    name: "Metamifop",
    category: "Herbicide",
    targetCrop: "Rice",
    targetCountry: "Asia",
    description: "벼 경엽처리 제초제. 벼 재배면적과 잡초 압력 변화에 민감합니다."
  },
  {
    name: "Pyribenzoxim",
    category: "Herbicide",
    targetCrop: "Rice",
    targetCountry: "Asia",
    description: "벼 제초제 포트폴리오 제품. 보조금, 등록 규제, 경쟁 제품 이슈를 함께 봅니다."
  },
  {
    name: "Flucetosulfuron",
    category: "Herbicide",
    targetCrop: "Rice",
    targetCountry: "Asia",
    description: "설포닐우레아계 벼 제초제. 등록 규제와 저항성 잡초 신호에 민감합니다."
  },
  {
    name: "Tiafenacil",
    category: "Herbicide",
    targetCrop: "Soybean/Corn",
    targetCountry: "Global",
    description: "비선택성/광엽 잡초 관리 전략 제품. 대두·옥수수 면적과 경쟁 제품 출시에 반응합니다."
  },
  {
    name: "Bistrifluron",
    category: "Insecticide",
    targetCrop: "Fruit/Vegetable",
    targetCountry: "Global",
    description: "해충 방제 제품. 병해충 압력과 기상재해 이후 발생 신호를 중점 추적합니다."
  },
  {
    name: "Lambda-cyhalothrin",
    category: "Insecticide",
    targetCrop: "Field crop",
    targetCountry: "Global",
    description: "광범위 살충제. 작물 가격, 병해충 압력, 규제 리스크를 동시에 반영합니다."
  },
  {
    name: "Cypermethrin",
    category: "Insecticide",
    targetCrop: "Field crop",
    targetCountry: "Global",
    description: "피레스로이드계 살충제. 병해충 압력과 등록 규제 이슈가 핵심 변수입니다."
  },
  {
    name: "Difenoconazole",
    category: "Fungicide",
    targetCrop: "Fruit/Vegetable/Field crop",
    targetCountry: "Global",
    description: "트리아졸계 살균제. 다습·홍수 이후 병 발생 가능성과 규제 신호에 민감합니다."
  },
  {
    name: "Cyhalofop",
    category: "Herbicide",
    targetCrop: "Rice",
    targetCountry: "Asia",
    description: "벼 제초제. 벼 재배면적, 잡초 압력, 경쟁 제품 출시를 추적합니다."
  },
  {
    name: "Pretilachlor",
    category: "Herbicide",
    targetCrop: "Rice",
    targetCountry: "Asia",
    description: "이앙·직파 벼 제초제. 홍수·재배시기 변화와 벼 면적에 민감합니다."
  }
] as const;

type ProductName = (typeof PRODUCT_SEEDS)[number]["name"];
type FactorName = (typeof MARKET_FACTORS)[number];

const baseSensitivity = Object.fromEntries(MARKET_FACTORS.map((factor) => [factor, 0])) as Record<
  FactorName,
  number
>;

export const DEFAULT_SENSITIVITY: Record<ProductName, Record<FactorName, number>> = {
  Metamifop: {
    ...baseSensitivity,
    "벼 재배면적": 0.85,
    "작물 가격": 0.35,
    "농가 소득": 0.45,
    "잡초 압력": 0.9,
    홍수: -0.15,
    가뭄: -0.25,
    "정부 보조금": 0.3,
    환율: 0.2,
    "원제 가격": -0.45,
    "경쟁 제품 출시": -0.55,
    "등록 규제": -0.8
  },
  Pyribenzoxim: {
    ...baseSensitivity,
    "벼 재배면적": 0.75,
    "작물 가격": 0.3,
    "농가 소득": 0.35,
    "잡초 압력": 0.85,
    홍수: -0.1,
    가뭄: -0.25,
    "정부 보조금": 0.35,
    "수입 규제": -0.25,
    환율: 0.15,
    "원제 가격": -0.35,
    "경쟁 제품 출시": -0.6,
    "등록 규제": -0.75
  },
  Flucetosulfuron: {
    ...baseSensitivity,
    "벼 재배면적": 0.7,
    "작물 가격": 0.25,
    "농가 소득": 0.3,
    "잡초 압력": 0.95,
    홍수: -0.15,
    가뭄: -0.2,
    "정부 보조금": 0.25,
    환율: 0.15,
    "원제 가격": -0.4,
    "경쟁 제품 출시": -0.5,
    "등록 규제": -0.85
  },
  Tiafenacil: {
    ...baseSensitivity,
    "대두 재배면적": 0.75,
    "옥수수 재배면적": 0.65,
    "작물 가격": 0.45,
    "농가 소득": 0.4,
    "잡초 압력": 0.9,
    가뭄: -0.2,
    "정부 보조금": 0.2,
    "수입 규제": -0.2,
    환율: 0.25,
    "원제 가격": -0.35,
    "경쟁 제품 출시": -0.65,
    "등록 규제": -0.75
  },
  Bistrifluron: {
    ...baseSensitivity,
    "작물 가격": 0.25,
    "농가 소득": 0.35,
    "병해충 압력": 0.95,
    홍수: 0.25,
    가뭄: 0.1,
    "정부 보조금": 0.2,
    환율: 0.2,
    "원제 가격": -0.35,
    "경쟁 제품 출시": -0.45,
    "등록 규제": -0.8
  },
  "Lambda-cyhalothrin": {
    ...baseSensitivity,
    "대두 재배면적": 0.25,
    "옥수수 재배면적": 0.35,
    "작물 가격": 0.35,
    "농가 소득": 0.35,
    "병해충 압력": 0.9,
    홍수: 0.2,
    가뭄: 0.1,
    환율: 0.25,
    "원제 가격": -0.5,
    "경쟁 제품 출시": -0.4,
    "등록 규제": -0.85
  },
  Cypermethrin: {
    ...baseSensitivity,
    "작물 가격": 0.25,
    "농가 소득": 0.3,
    "병해충 압력": 0.85,
    홍수: 0.2,
    가뭄: 0.1,
    "수입 규제": -0.25,
    환율: 0.25,
    "원제 가격": -0.45,
    "경쟁 제품 출시": -0.35,
    "등록 규제": -0.9
  },
  Difenoconazole: {
    ...baseSensitivity,
    "작물 가격": 0.35,
    "농가 소득": 0.4,
    "병해충 압력": 0.85,
    홍수: 0.45,
    가뭄: -0.05,
    "정부 보조금": 0.2,
    환율: 0.2,
    "원제 가격": -0.4,
    "경쟁 제품 출시": -0.35,
    "등록 규제": -0.75
  },
  Cyhalofop: {
    ...baseSensitivity,
    "벼 재배면적": 0.85,
    "작물 가격": 0.35,
    "농가 소득": 0.4,
    "잡초 압력": 0.95,
    홍수: -0.1,
    가뭄: -0.25,
    "정부 보조금": 0.3,
    환율: 0.2,
    "원제 가격": -0.45,
    "경쟁 제품 출시": -0.6,
    "등록 규제": -0.8
  },
  Pretilachlor: {
    ...baseSensitivity,
    "벼 재배면적": 0.8,
    "작물 가격": 0.3,
    "농가 소득": 0.35,
    "잡초 압력": 0.85,
    홍수: 0.05,
    가뭄: -0.25,
    "정부 보조금": 0.25,
    환율: 0.15,
    "원제 가격": -0.4,
    "경쟁 제품 출시": -0.5,
    "등록 규제": -0.75
  }
};

export const SAMPLE_ARTICLES = [
  {
    title: "Vietnam expands rice export controls as El Nino trims Mekong yields",
    source: "Sample Wire",
    url: "https://example.com/vietnam-rice-el-nino",
    publishedAt: new Date("2026-05-22T00:00:00.000Z"),
    country: "Vietnam",
    crop: "Rice",
    category: "기상재해",
    originalText:
      "Vietnamese officials warned that El Nino-related drought conditions are reducing Mekong Delta rice yields. Export licenses may be tightened if domestic supply falls further.",
    summary:
      "베트남 메콩 지역 가뭄으로 쌀 생산 차질 가능성이 커졌고, 정부는 내수 공급 안정을 위해 수출 관리를 강화할 수 있다고 밝혔습니다."
  },
  {
    title: "Brazil soybean area expected to rise as farm margins recover",
    source: "Sample Agri News",
    url: "https://example.com/brazil-soybean-area",
    publishedAt: new Date("2026-05-21T00:00:00.000Z"),
    country: "Brazil",
    crop: "Soybean",
    category: "재배면적",
    originalText:
      "Brazilian analysts expect soybean planted area to increase next season as farmer margins recover on stronger export demand and a favorable currency backdrop.",
    summary:
      "브라질 대두 재배면적 확대 전망이 나오며, 수출 수요와 환율 여건이 농가 수익성을 개선하고 있습니다."
  },
  {
    title: "EU review may tighten registration rules for selected pyrethroids",
    source: "Sample Regulatory Brief",
    url: "https://example.com/eu-pyrethroid-review",
    publishedAt: new Date("2026-05-20T00:00:00.000Z"),
    country: "European Union",
    crop: "Field crop",
    category: "등록/규제 이슈",
    originalText:
      "A draft EU regulatory review signals stricter data requirements for selected pyrethroid insecticides, increasing uncertainty for renewal timelines.",
    summary:
      "EU 규제 검토 초안이 일부 피레스로이드계 살충제의 자료 요건을 강화할 가능성을 시사했습니다."
  }
] as const;

export const NEWS_SOURCE_SEEDS = [
  {
    name: "FAO News",
    url: "https://www.fao.org/feeds/fao-newsroom-rss",
    category: "농산물 수급",
    country: "Global",
    isActive: true
  },
  {
    name: "USDA News",
    url: "https://www.usda.gov/rss/latest-releases.xml",
    category: "정부 정책",
    country: "United States",
    isActive: false
  },
  {
    name: "USDA NASS News",
    url: "https://www.nass.usda.gov/rss/news.xml",
    category: "재배면적",
    country: "United States",
    isActive: true
  },
  {
    name: "USDA NASS Reports",
    url: "https://www.nass.usda.gov/rss/reports.xml",
    category: "농산물 가격",
    country: "United States",
    isActive: true
  },
  {
    name: "USDA ARS Research News",
    url: "https://www.ars.usda.gov/rss/?productName=Research+News",
    category: "병해충/잡초 발생",
    country: "United States",
    isActive: true
  },
  {
    name: "USDA Rural Development",
    url: "https://www.rd.usda.gov/rss.xml",
    category: "정부 정책",
    country: "United States",
    isActive: false
  },
  {
    name: "World Grain Trade",
    url: "https://www.world-grain.com/rss/topic/1034-trade",
    category: "농산물 수급",
    country: "Global",
    isActive: true
  }
] as const;
