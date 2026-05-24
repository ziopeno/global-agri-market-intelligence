# Global Agri Market Intelligence MVP

글로벌 농업·농약·비료·작물·기상·무역·정책 뉴스를 제품 전략으로 연결하는 Market Intelligence System MVP입니다.

핵심 흐름:

```text
News -> Signal -> Trend -> Insight -> Strategy
```

## MVP 포함 범위

- 등록된 Farmhannong Weekly DB/RSS Source 기반 자동 뉴스 수집
- URL 및 title + source 기준 중복 제거
- Source별 fetch 실패 격리와 DB 로그 저장
- 기사 수동 입력은 `Manual Add` 보조 기능으로 유지
- AI 기사 요약
- 시장 요인 추출
- 공식 기반 점수화
- 제품 민감도 매트릭스 기반 제품 영향 점수 계산
- Daily Report 생성
- 기본 대시보드
- 제품 민감도 수정
- AI 점수 수동 수정 및 재계산
- Vercel Cron / node-cron 자동화 코드

## 폴더 구조

```text
app/
  api/
    articles/
    articles/analyze/
    cron/daily/
    dashboard/
    factors/[id]/
    jobs/fetch-news/
    news-sources/
    products/
    reports/daily/
  matrix/
  news/
  reports/
  sources/
  strategy/
components/
  ui/
lib/
  ai.ts
  constants.ts
  dashboard.ts
  db.ts
  dedupe.ts
  news-fetcher.ts
  pipeline.ts
  prompts.ts
  rss.ts
  scoring.ts
  seed.ts
prisma/
  schema.prisma
  seed.ts
prompts/
  market-analysis.md
scripts/
  automation.ts
```

## 기술 스택

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn 스타일 로컬 UI 컴포넌트, Recharts
- Backend: Next.js API Routes
- Database: PostgreSQL
- ORM: Prisma
- AI: OpenAI API
- Automation: Vercel Cron 또는 node-cron

## 데이터베이스

요청 테이블을 Prisma 모델로 구현했습니다.

- `articles`
- `news_sources`
- `article_analyses`
- `article_factors`
- `news_fetch_logs`
- `market_signals`
- `products`
- `product_sensitivity`
- `product_impact`
- `reports`

추가로 근거와 수정 이력을 위해 아래 필드를 보강했습니다.

- `articles.market_impact_score`
- `articles.source_id`
- `articles.raw_content`
- `articles.fetch_status`
- `articles.analysis_status`
- `articles.duplicate_key`
- `articles.fetched_at`
- `articles.review_status`
- `article_analyses.raw_response`
- `article_factors.evidence`
- `article_factors.manual_factor_score`
- `product_impact.rationale`
- `reports.source_article_ids`

## 점수 공식

```text
Factor Score = Direction x Impact x Likelihood x Duration x Reliability
Market Impact Score = sum(Factor Score)
Product Impact Score = sum(Factor Score x Product Sensitivity)
```

제품 영향 점수는 기사 안의 여러 요인이 서로 다른 민감도와 연결될 수 있으므로, MVP에서는 요인별 곱을 합산합니다.

## 실행 방법

1. 의존성 설치

```bash
npm install
```

2. 환경 변수 생성

```bash
cp .env.example .env
```

3. PostgreSQL 준비

예시:

```bash
createdb agri_market_intelligence
```

또는 Docker:

```bash
docker run --name agri-mi-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=agri_market_intelligence -p 5432:5432 -d postgres:16
```

4. Prisma 적용 및 샘플 데이터 생성

```bash
npm run prisma:generate
npm run db:push
npm run db:seed
```

5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## OpenAI 설정

`.env`에 값을 넣으면 실제 AI 분석을 사용합니다.

```text
OPENAI_API_KEY="..."
OPENAI_MODEL="gpt-4.1-mini"
```

키가 없으면 데모용 휴리스틱 분석기가 작동합니다.

## Weekly DB/RSS Source 관리

기본 수집 흐름은 `/sources` 화면에서 관리하는 `news_sources` 테이블을 사용합니다.

Source 필드:

- `name`
- `url`
- `category`
- `country`
- `is_active`
- `last_fetched_at`

새 Source 추가 방법:

1. `/sources`로 이동합니다.
2. Name, Source URL, Category, Country를 입력합니다.
3. Active 체크 상태로 저장하면 다음 자동 수집부터 포함됩니다.
4. 특정 Source를 잠시 제외하려면 Active 체크를 끕니다.

Seed에는 아래 Source가 들어갑니다. Farmhannong Agro Weekly DB는 정적 HTML 안의 최신 주차 `newsDatabase`를 전용 수집기로 읽고, 나머지는 RSS로 읽습니다. 일부 매체는 정책이 바뀔 수 있으므로 `/sources`에서 URL을 수정할 수 있게 해두었습니다.

- Farmhannong Agro Weekly DB
- FAO News
- USDA NASS News
- USDA NASS Reports
- USDA ARS Research News
- World Grain Trade

## 자동 뉴스 수집 Job

중심 API는 다음입니다.

```text
POST /api/jobs/fetch-news
```

실행 순서:

1. active Weekly DB/RSS Source 조회
2. Farmhannong Weekly DB 또는 RSS Source별 fetch
3. 기사 title, url, published_at, source, snippet/raw content 저장
4. 같은 URL 또는 같은 title + source 조합 중복 제외
5. 신규 기사 AI 분석
6. `article_analyses`, `article_factors`, `product_impact` 저장
7. Daily Report 업데이트
8. Source별 fetch log 저장

수동 실행:

- `/sources` 또는 `/news` 화면에서 `Run News Fetch Now` 버튼을 누릅니다.
- 실행 결과 예: `신규 기사 12개 수집, 중복 8개 제외, 분석 완료 12개`.

자동화 준비상태 점검:

```bash
pnpm automation:check
```

터미널에서 수집 작업을 한 번 실행:

```bash
pnpm fetch-news
```

터미널/API로 실행:

```bash
curl -X POST http://localhost:3000/api/jobs/fetch-news
```

`CRON_SECRET`을 설정한 경우:

```bash
curl -X POST "http://localhost:3000/api/jobs/fetch-news?secret=change-me"
```

## Cron 설정

Vercel Cron은 GET 요청을 보내므로 `vercel.json`은 `/api/jobs/fetch-news`를 매주 월요일 UTC 00:10에 호출합니다.

```json
{
  "path": "/api/jobs/fetch-news",
  "schedule": "10 0 * * 1"
}
```

UTC 월요일 00:10은 Asia/Seoul 기준 월요일 오전 9시 10분입니다. 카드뉴스 사이트의 월요일 오전 9시 업데이트 직후 연계되도록 10분 뒤 실행합니다. API는 `POST /api/jobs/fetch-news`를 중심으로 제공하고, Vercel Cron 호환을 위해 같은 경로의 GET도 허용합니다.

해당 엔드포인트는 매주 아래 작업을 수행합니다.

1. Farmhannong Agro Weekly DB 및 RSS 수집
2. 중복 제거
3. 기사 요약
4. 시장 요인 추출
5. 점수화
6. 제품 영향 계산
7. Daily Report 생성
8. 대시보드 데이터 갱신

운영 준비 절차는 `AUTOMATION_SETUP.md`에 별도로 정리되어 있습니다.

`/api/cron/daily`도 호환용으로 남겨두었고, 내부적으로 같은 자동 수집 Job을 호출한 뒤 한국시간 기준 월요일, 월초, 분기초, 1월/7월 1일, 1월 1일이면 상위 리포트도 함께 생성합니다.

로컬 장기 실행 자동화:

```bash
npm run automation
```

## 주요 화면

- `/` 메인 대시보드
- `/sources` News Sources 관리 및 수동 fetch 실행
- `/news` 뉴스 관리
- `/matrix` 제품 영향 매트릭스
- `/reports` 리포트 생성 및 저장
- `/strategy` 전략 인사이트

## 주요 API

- `GET /api/articles`
- `POST /api/articles`
- `POST /api/articles/analyze`
- `GET /api/news-sources`
- `POST /api/news-sources`
- `PUT /api/news-sources`
- `DELETE /api/news-sources`
- `POST /api/jobs/fetch-news`
- `PATCH /api/factors/:id`
- `GET /api/products`
- `PUT /api/products`
- `GET /api/dashboard`
- `GET /api/reports/daily`
- `POST /api/reports/daily`
- `GET /api/cron/daily`

## AI 프롬프트

프롬프트 원문은 [prompts/market-analysis.md](./prompts/market-analysis.md)에 있습니다.

핵심 원칙:

- 기사 밖의 사실을 임의로 만들지 않음
- 모든 점수에 근거 저장
- 허용된 카테고리와 시장 변수만 사용
- 사람이 점수를 수정할 수 있고, 수정 값은 제품 영향과 다음 리포트에 반영
- 뉴스 원문, AI 분석 결과, 최종 리포트를 분리 저장
