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

export const IMPACT_SCORE_CRITERIA = [
  {
    score: 1,
    label: "매우 낮음",
    criterion: "시장 가격, 수급, 원가, 등록, 판매 기회에 직접 영향이 없거나 단순 배경 정보입니다. 예상 변화폭은 1% 미만, 또는 한 지역·한 고객군의 제한적 신호입니다."
  },
  {
    score: 2,
    label: "낮음",
    criterion: "한 국가의 일부 지역, 단일 작물, 제한된 제품군에 영향을 줍니다. 예상 변화폭은 1% 이상 3% 미만이거나 단기 영업 참고 수준입니다."
  },
  {
    score: 3,
    label: "보통",
    criterion: "특정 국가·작물·제품군의 수요, 가격, 공급, 원가에 의미 있는 영향을 줍니다. 예상 변화폭은 3% 이상 7% 미만입니다."
  },
  {
    score: 4,
    label: "높음",
    criterion: "전국 단위 정책, 주요 작물 가격·수급, 원제 가격, 병해충 확산, 등록 이슈처럼 시장을 직접 움직입니다. 예상 변화폭은 7% 이상 15% 미만입니다."
  },
  {
    score: 5,
    label: "매우 높음",
    criterion: "여러 국가·주요 작물·제품 포트폴리오에 동시에 영향을 주는 구조적 충격입니다. 예상 변화폭은 15% 이상이거나 수출입 금지, 대규모 재해, 핵심 등록 취소급 이슈입니다."
  }
] as const;

export const LIKELIHOOD_SCORE_CRITERIA = [
  {
    score: 1,
    label: "매우 낮음",
    criterion: "루머, 의견, 가능성 언급 수준입니다. 수치·일정·공식 발표가 없고 실제 발생 가능성은 20% 미만으로 봅니다."
  },
  {
    score: 2,
    label: "낮음",
    criterion: "초기 관측 또는 조건부 전망입니다. 단일 출처이거나 전제 조건이 크며 발생 가능성은 20% 이상 40% 미만입니다."
  },
  {
    score: 3,
    label: "보통",
    criterion: "신뢰 가능한 전망, 조사, 모니터링 결과가 있으나 아직 확정은 아닙니다. 발생 가능성은 40% 이상 60% 미만입니다."
  },
  {
    score: 4,
    label: "높음",
    criterion: "공식 일정, 구체 수치, 복수 출처, 실행 계획이 확인됩니다. 발생 가능성은 60% 이상 80% 미만입니다."
  },
  {
    score: 5,
    label: "매우 높음",
    criterion: "이미 발생했거나 공식 발표·시행·확정 자료가 있습니다. 발생 가능성은 80% 이상으로 봅니다."
  }
] as const;

export const DURATION_SCORE_CRITERIA = [
  {
    score: 1.0,
    label: "단기",
    criterion: "영향 기간이 4주 이하입니다. 일시적 가격 반응, 단기 물류 차질, 단발성 기상 이벤트, 즉시성 뉴스에 적용합니다."
  },
  {
    score: 1.3,
    label: "중기",
    criterion: "영향 기간이 4주 초과 6개월 이하입니다. 한 작기, 파종·방제·구매 시즌, 분기 단위 정책·수급 변화에 적용합니다."
  },
  {
    score: 1.6,
    label: "장기",
    criterion: "영향 기간이 6개월 초과입니다. 등록 규제, 구조적 정책 변화, 다년 공급능력, 무역 구조 변화, 저항성·포트폴리오 이슈에 적용합니다."
  }
] as const;

export const RELIABILITY_SCORE_CRITERIA = [
  {
    score: 1.0,
    label: "공식",
    criterion: "정부, 국제기구, 통계기관, 규제기관, 공식 보고서처럼 1차 출처에 가깝습니다."
  },
  {
    score: 0.8,
    label: "검증 매체",
    criterion: "Reuters, Bloomberg, 주요 전문지처럼 편집·검증 절차가 있는 언론 또는 전문 매체입니다."
  },
  {
    score: 0.6,
    label: "업계·기업",
    criterion: "기업 발표, 업계지, 협회 자료처럼 정보 출처는 식별되지만 이해관계나 검증 한계가 있습니다."
  },
  {
    score: 0.4,
    label: "불명확",
    criterion: "블로그, 개인 의견, 출처 불명확한 재가공 정보처럼 검증 근거가 약합니다."
  }
] as const;

export const DURATION_WEIGHT_RATIONALE = [
  "지속 기간 보정은 독립 점수가 아니라 시간 보정계수입니다.",
  "단기는 기준값 1.0으로 두고, 중기는 같은 강도의 신호가 한 시즌까지 이어질 수 있으므로 30%를 가산합니다.",
  "장기는 등록·정책·공급 구조처럼 반년 이상 영향을 줄 수 있으므로 60%를 가산합니다.",
  "1.0/1.3/1.6의 3단계는 과도한 세밀함을 피하면서도 장기 이슈를 단기 뉴스보다 우선 보게 하려는 업무용 가중치입니다.",
  "검증 결과, 기간 경계가 없으면 모호하지만 4주 이하, 4주 초과~6개월 이하, 6개월 초과로 정의하면 운영 기준은 명확합니다. 다만 계수 자체는 시장 법칙이 아니라 내부 정책값이므로 실제 성과 데이터로 주기적 보정이 필요합니다."
] as const;

export function scoringCriteriaForPrompt() {
  const lines = [
    "Quantitative scoring criteria:",
    "Impact:",
    ...IMPACT_SCORE_CRITERIA.map((item) => `- ${item.score}: ${item.label}. ${item.criterion}`),
    "Likelihood:",
    ...LIKELIHOOD_SCORE_CRITERIA.map((item) => `- ${item.score}: ${item.label}. ${item.criterion}`),
    "Duration multiplier:",
    ...DURATION_SCORE_CRITERIA.map((item) => `- ${item.score}: ${item.label}. ${item.criterion}`),
    "Reliability multiplier:",
    ...RELIABILITY_SCORE_CRITERIA.map((item) => `- ${item.score}: ${item.label}. ${item.criterion}`)
  ];
  return lines.join("\n");
}

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
    name: "Farmhannong Agro Weekly DB",
    url: "https://ziopeno.github.io/farmhannong-agro-weekly-db/",
    category: "농약/비료 시장",
    country: "Global",
    isActive: true
  }
] as const;

export const COUNTRY_WEIGHT_SEEDS = [
  {
    country: "Philippines",
    marketSizeWeight: 1.25,
    businessImportanceWeight: 1.5,
    notes: "동남아 벼 제초제 전략 우선 시장"
  },
  {
    country: "Vietnam",
    marketSizeWeight: 1.2,
    businessImportanceWeight: 1.3,
    notes: "벼 중심 전략 시장"
  },
  {
    country: "Brazil",
    marketSizeWeight: 1.3,
    businessImportanceWeight: 1.2,
    notes: "대두·옥수수 대형 시장"
  },
  {
    country: "USA",
    marketSizeWeight: 1.4,
    businessImportanceWeight: 0.8,
    notes: "정보 신뢰도는 높지만 직접 영업 우선순위는 낮게 시작"
  },
  {
    country: "미국",
    marketSizeWeight: 1.4,
    businessImportanceWeight: 0.8,
    notes: "USA와 동일한 기본값"
  },
  {
    country: "Global",
    marketSizeWeight: 1,
    businessImportanceWeight: 1,
    notes: "국가 미지정 기본값"
  }
] as const;
