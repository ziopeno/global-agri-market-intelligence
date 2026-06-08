import {
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  Database,
  LineChart,
  Rss,
  Settings2,
  ShieldCheck,
  Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DURATION_SCORE_CRITERIA,
  DURATION_WEIGHT_RATIONALE,
  IMPACT_SCORE_CRITERIA,
  LIKELIHOOD_SCORE_CRITERIA,
  RELIABILITY_SCORE_CRITERIA
} from "@/lib/constants";

const flow = [
  { title: "News", description: "Farmhannong Agro Weekly DB에서 농업·농약·비료·정책 카드뉴스를 자동 수집" },
  { title: "Signal", description: "기사에서 국가, 작물, 이슈 유형, 시장 요인을 추출" },
  { title: "Trend", description: "같은 이슈가 반복되는 국가·작물·카테고리를 누적 추적" },
  { title: "Insight", description: "시장 영향 점수와 제품 영향 점수로 기회와 위험을 구분" },
  { title: "Strategy", description: "제품별 추천 전략, 국가 우선순위, 영업 액션으로 전환" }
];

const pages = [
  {
    name: "대시보드",
    purpose: "오늘 시장이 어느 방향으로 움직이는지 한 화면에서 확인합니다.",
    use: "시장 영향 점수, 제품 랭킹, 국가별 리스크, 핵심 뉴스를 먼저 확인합니다.",
    decision: "오늘 집중해야 할 제품, 국가, 리스크 이슈를 빠르게 선별합니다."
  },
  {
    name: "소스",
    purpose: "자동 수집에 사용할 Farmhannong Agro Weekly DB Source를 관리합니다.",
    use: "Source를 추가·수정·비활성화하고 Run News Fetch Now로 즉시 수집을 실행합니다.",
    decision: "어떤 외부 정보가 시스템 판단에 들어오는지 관리합니다."
  },
  {
    name: "뉴스",
    purpose: "수집된 기사와 AI 분석 결과를 검토합니다.",
    use: "기사별 요약, 국가, 작물, 카테고리, 영향 점수, 관련 제품, 원문 링크를 확인합니다.",
    decision: "AI 분석이 타당한지 보고 필요한 경우 점수 근거를 수정합니다."
  },
  {
    name: "검토",
    purpose: "AI가 산출한 요인 점수와 근거 문장을 사람이 확인합니다.",
    use: "영향 크기, 발생 가능성, 지속 기간 보정, 출처 신뢰도 보정, 근거 문장, 국가별 사업 중요도 보정값을 수정합니다.",
    decision: "검토된 점수만 다음 제품 영향 점수와 리포트에 반영되도록 품질을 관리합니다."
  },
  {
    name: "매트릭스",
    purpose: "시장 변화가 각 제품에 얼마나 민감하게 작용하는지 관리합니다.",
    use: "제품별로 재배면적, 작물 가격, 병해충 압력, 환율, 규제 등 변수 민감도를 조정합니다.",
    decision: "제품 전략의 기준값을 관리하고 다음 리포트에 반영합니다."
  },
  {
    name: "리포트",
    purpose: "Daily부터 Annual까지 인사이트 리포트를 생성하고 저장합니다.",
    use: "현재 MVP는 Daily Report 중심이며, 누적 리포트 구조로 확장됩니다.",
    decision: "회의, 영업 브리핑, 월간 전략 리뷰의 공통 자료로 사용합니다."
  },
  {
    name: "전략",
    purpose: "뉴스 분석 결과를 제품·국가·영업 액션으로 전환합니다.",
    use: "제품별 추천 전략, 국가별 우선순위, 리스크 경고, 기회 요인을 확인합니다.",
    decision: "어디에 팔고, 무엇을 조심하고, 어떤 고객에게 먼저 연락할지 정합니다."
  }
];

const operatingTasks = [
  "Farmhannong Agro Weekly DB Source가 실제로 작동하는지 정기적으로 확인합니다.",
  "제품 민감도 매트릭스는 제품 담당자와 함께 조정하고, 변경 후 영향 점수를 재계산합니다.",
  "AI가 만든 요인 점수는 근거 문장을 확인한 뒤 필요하면 사람이 수정합니다.",
  "Fetch 로그에서 실패 Source를 확인하고 URL 변경, 접근 제한, 데이터 형식 오류를 점검합니다.",
  "Daily Report는 영업팀 공유 전에 핵심 리스크와 기회 요인을 검토합니다."
];

const scoreRows = [
  ["영향 방향", "+1 또는 -1", "시장에 긍정적이면 +1, 부정적이면 -1"],
  ["영향 크기", "1~5", "시장에 미치는 크기"],
  ["발생 가능성", "1~5", "실제로 발생하거나 지속될 가능성"],
  ["지속 기간 보정", "1.0 / 1.3 / 1.6", "단기, 중기, 장기 영향"],
  ["출처 신뢰도 보정", "1.0 / 0.8 / 0.6 / 0.4", "점수가 아니라 출처 신뢰도 보정계수이며, 1.0이 가장 높음"]
];

const impactScaleRows = IMPACT_SCORE_CRITERIA.map((item) => [String(item.score), item.label, item.criterion] as const);
const likelihoodScaleRows = LIKELIHOOD_SCORE_CRITERIA.map((item) => [String(item.score), item.label, item.criterion] as const);
const durationScaleRows = DURATION_SCORE_CRITERIA.map((item) => [`${item.score.toFixed(1)}x`, item.label, item.criterion] as const);
const reliabilityScaleRows = RELIABILITY_SCORE_CRITERIA.map((item) => [`${item.score.toFixed(1)}x`, item.label, item.criterion] as const);

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone="green">Market Intelligence System</Badge>
              <Badge tone="blue">News to Strategy</Badge>
            </div>
            <CardTitle>사이트 개요와 사용법</CardTitle>
            <CardDescription>
              이 사이트는 글로벌 농업시장 뉴스를 회사 제품 전략으로 연결하기 위한 업무용 인텔리전스 시스템입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-slate-700">
            <p>
              핵심 목적은 뉴스를 단순히 모아 보여주는 것이 아니라, 기사 속 시장 요인을 점수화하고 제품별 민감도와 연결해
              영업·제품·해외사업 의사결정에 바로 쓸 수 있는 결론을 만드는 것입니다.
            </p>
            <p>
              기본 운영 흐름은 자동 수집입니다. 관리자는 Farmhannong Agro Weekly DB Source를 관리하고, 시스템은 신규 카드뉴스를 수집한 뒤 중복을 제거하고
              AI 분석, 점수화, 제품 영향 계산, Daily Report 업데이트까지 이어서 실행합니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-700" />
              최종 활용
            </CardTitle>
            <CardDescription>사업부가 이 화면에서 얻어야 하는 결론</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
              <span>오늘 어떤 국가와 작물을 우선 볼 것인가</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
              <span>어떤 제품에 기회 또는 위험 신호가 있는가</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
              <span>영업팀이 오늘 취해야 할 액션은 무엇인가</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>전체 분석 흐름</CardTitle>
          <CardDescription>News → Signal → Trend → Insight → Strategy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            {flow.map((item, index) => (
              <div key={item.title} className="relative rounded-md border bg-white p-4">
                <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                {index < flow.length - 1 && (
                  <ArrowRight className="absolute -right-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-slate-300 md:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rss className="h-4 w-4 text-sky-700" />
              자동 뉴스 수집 로직
            </CardTitle>
            <CardDescription>기본 흐름은 수동 입력이 아니라 Farmhannong Agro Weekly DB 자동 수집입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
            <p>1. Active 상태인 Farmhannong Agro Weekly DB Source를 조회합니다.</p>
            <p>2. 최신 주차 카드뉴스의 원문 제목, 요약, 링크를 가져옵니다.</p>
            <p>3. 같은 URL 또는 같은 제목과 출처 조합은 중복 기사로 제외합니다.</p>
            <p>4. 신규 기사만 저장하고 AI 분석 대상으로 넘깁니다.</p>
            <p>5. Source별 오류는 로그로 남기며, 한 Source 실패가 전체 작업을 멈추지 않습니다.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-sky-700" />
              AI 분석 로직
            </CardTitle>
            <CardDescription>AI 판단 결과와 원문 기사는 분리 저장됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
            <p>AI는 기사 요약, 국가, 작물, 이슈 유형, 시장 요인을 추출합니다.</p>
            <p>각 요인은 영향 방향, 영향 크기, 발생 가능성, 지속 기간 보정, 출처 신뢰도 보정 기준으로 계산됩니다.</p>
            <p>모든 점수는 기사와 요인 근거에 연결되어 나중에 사람이 검토하고 수정할 수 있습니다.</p>
            <p>OpenAI API 키가 없을 때는 데모용 휴리스틱 분석으로 화면 동작을 확인할 수 있습니다.</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>점수 계산과 해석</CardTitle>
          <CardDescription>AI가 결론만 내는 구조가 아니라, 근거와 계산식을 남기는 구조입니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3 rounded-md border bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-semibold text-slate-950">요인 기본 점수</div>
            <div className="rounded-md bg-white p-3 font-mono text-xs text-slate-700">
              영향 방향 × 영향 크기 × 발생 가능성 × 지속 기간 보정 × 출처 신뢰도 보정
            </div>
            <div className="font-semibold text-slate-950">시장 영향 점수</div>
            <div className="rounded-md bg-white p-3 font-mono text-xs text-slate-700">기사 내 모든 요인 기본 점수 합산</div>
            <div className="font-semibold text-slate-950">보정 시장 점수</div>
            <div className="rounded-md bg-white p-3 font-mono text-xs text-slate-700">
              요인 기본 점수 × 시장 규모 보정 × 제품 관련성 보정 × 최신성 보정 × 근거 강도 보정
            </div>
            <div className="font-semibold text-slate-950">정규화 국가 점수</div>
            <div className="rounded-md bg-white p-3 font-mono text-xs text-slate-700">국가 총점 ÷ 기사 수</div>
            <div className="font-semibold text-slate-950">가중 국가 점수</div>
            <div className="rounded-md bg-white p-3 font-mono text-xs text-slate-700">정규화 국가 점수 × 사업 중요도 보정</div>
            <div className="font-semibold text-slate-950">제품 영향 점수</div>
            <div className="rounded-md bg-white p-3 font-mono text-xs text-slate-700">보정 시장 점수 × 제품 민감도</div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[620px] border-collapse bg-white text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b px-3 py-3 text-left font-semibold">항목</th>
                  <th className="border-b px-3 py-3 text-left font-semibold">값</th>
                  <th className="border-b px-3 py-3 text-left font-semibold">의미</th>
                </tr>
              </thead>
              <tbody>
                {scoreRows.map(([name, value, meaning]) => (
                  <tr key={name} className="border-b last:border-b-0">
                    <td className="px-3 py-3 font-medium text-slate-900">{name}</td>
                    <td className="px-3 py-3 text-slate-700">{value}</td>
                    <td className="px-3 py-3 text-slate-600">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-md border bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
              영향 크기와 발생 가능성은 1~5점 척도이며, 아래 정량 구간에 맞춰 점수를 선택합니다.
              지속 기간 보정과 출처 신뢰도 보정은 점수가 아니라 보정계수입니다. 근거가 애매하면 높은 구간이 아니라 낮은 구간을 적용합니다.
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="overflow-hidden rounded-md border bg-white">
                <div className="border-b bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950">영향 크기 1~5점 기준</div>
                <table className="w-full text-sm">
                  <tbody>
                    {impactScaleRows.map(([score, label, meaning]) => (
                      <tr key={score} className="border-b last:border-b-0">
                        <td className="w-20 px-3 py-3 font-semibold text-slate-900">{score}점</td>
                        <td className="w-24 px-3 py-3 text-slate-700">{label}</td>
                        <td className="px-3 py-3 leading-6 text-slate-600">{meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-hidden rounded-md border bg-white">
                <div className="border-b bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950">발생 가능성 1~5점 기준</div>
                <table className="w-full text-sm">
                  <tbody>
                    {likelihoodScaleRows.map(([score, label, meaning]) => (
                      <tr key={score} className="border-b last:border-b-0">
                        <td className="w-20 px-3 py-3 font-semibold text-slate-900">{score}점</td>
                        <td className="w-24 px-3 py-3 text-slate-700">{label}</td>
                        <td className="px-3 py-3 leading-6 text-slate-600">{meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-hidden rounded-md border bg-white">
                <div className="border-b bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950">지속 기간 보정계수</div>
                <table className="w-full text-sm">
                  <tbody>
                    {durationScaleRows.map(([score, label, meaning]) => (
                      <tr key={score} className="border-b last:border-b-0">
                        <td className="w-20 px-3 py-3 font-semibold text-slate-900">{score}</td>
                        <td className="w-20 px-3 py-3 text-slate-700">{label}</td>
                        <td className="px-3 py-3 leading-6 text-slate-600">{meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-hidden rounded-md border bg-white">
                <div className="border-b bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950">출처 신뢰도 보정계수</div>
                <table className="w-full text-sm">
                  <tbody>
                    {reliabilityScaleRows.map(([score, label, meaning]) => (
                      <tr key={score} className="border-b last:border-b-0">
                        <td className="w-20 px-3 py-3 font-semibold text-slate-900">{score}</td>
                        <td className="w-20 px-3 py-3 text-slate-700">{label}</td>
                        <td className="px-3 py-3 leading-6 text-slate-600">{meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-md border bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-950">지속 기간 보정 1.0 / 1.3 / 1.6 검증과 해석</div>
              <div className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                {DURATION_WEIGHT_RATIONALE.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
            <div className="rounded-md border bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-950">보정 가중치 운영 기준</div>
              <div className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                <p>시장 규모 보정은 국가·작물·수입 규모와 우리 회사 매출 규모를 반영하는 내부 정책값입니다.</p>
                <p>제품 관련성 보정은 대상 작물, 등록 가능 국가, 판매 가능성, 제품 포지셔닝이 맞을수록 높아집니다.</p>
                <p>최신성 보정은 최근 기사일수록 높고, 90일 이상 지난 신호는 낮게 반영합니다.</p>
                <p>근거 강도 보정은 같은 요인을 지지하는 기사 수와 공식 출처 여부가 확인될수록 높아집니다.</p>
                <p>사업 중요도 보정은 검토 탭에서 관리자가 수정하며, 국가별 우선순위 산정에 직접 반영됩니다.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>화면별 사용법과 사업적 결론</CardTitle>
          <CardDescription>각 탭에서 확인할 내용과 관리 포인트입니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <div key={page.name} className="rounded-md border bg-white p-4">
              <div className="text-base font-semibold text-slate-950">{page.name}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{page.purpose}</p>
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                <div className="font-medium text-slate-950">사용법</div>
                <p>{page.use}</p>
              </div>
              <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
                <div className="font-medium">사업적 결론</div>
                <p>{page.decision}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-slate-700" />
              관리자 운영 방법
            </CardTitle>
            <CardDescription>시스템 품질을 유지하기 위한 반복 업무</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
            {operatingTasks.map((task) => (
              <div key={task} className="flex gap-2">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                <span>{task}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-slate-700" />
              자동화 운영
            </CardTitle>
            <CardDescription>매주 월요일 오전 10시 기준으로 자동 수집 흐름을 갱신합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
            <p>자동 실행 API는 POST /api/jobs/fetch-news입니다.</p>
            <p>Vercel Cron은 Farmhannong Agro Weekly DB의 월요일 오전 9시 업데이트와 GitHub Pages 캐시 반영 시간을 감안해 UTC 월요일 01:00 기준으로 설정합니다.</p>
            <div className="rounded-md border bg-slate-50 p-3 font-mono text-xs">0 1 * * 1</div>
            <p>수동으로 즉시 실행하려면 소스 또는 뉴스 화면의 Run News Fetch Now 버튼을 사용합니다.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              검토 원칙
            </CardTitle>
            <CardDescription>AI 결과를 업무 판단에 쓰기 위한 기준</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
            <p>점수는 결론이 아니라 우선순위 신호입니다.</p>
            <p>큰 점수일수록 원문 링크와 근거 문장을 함께 확인합니다.</p>
            <p>제품 민감도는 사업부 합의값으로 관리해야 합니다.</p>
            <p>사람이 수정한 점수는 다음 리포트와 전략 화면에 반영됩니다.</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4 text-slate-700" />
            현재 MVP와 확장 방향
          </CardTitle>
          <CardDescription>지금 가능한 범위와 다음 단계입니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-white p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-slate-950">
              <LineChart className="h-4 w-4 text-emerald-700" />
              현재 MVP
            </div>
            <div className="space-y-2 text-sm leading-6 text-slate-700">
              <p>Farmhannong Agro Weekly DB 자동 수집, 중복 제거, AI 분석, 제품 영향 계산, Daily Report 생성 흐름을 제공합니다.</p>
              <p>Manual Add는 누락 기사 보완용으로만 사용합니다.</p>
              <p>DB가 연결되지 않은 로컬 환경에서는 샘플 데이터로 화면 구성을 확인할 수 있습니다.</p>
            </div>
          </div>
          <div className="rounded-md border bg-white p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-slate-950">
              <Target className="h-4 w-4 text-sky-700" />
              다음 확장
            </div>
            <div className="space-y-2 text-sm leading-6 text-slate-700">
              <p>Weekly, Monthly, Quarterly, Half-year, Annual 리포트를 하위 리포트 기반으로 누적 생성합니다.</p>
              <p>국가별·작물별 상세 대시보드와 데이터 검증 기능을 강화합니다.</p>
              <p>관리자 승인, 수정 이력, 조직별 배포 워크플로를 추가할 수 있습니다.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
