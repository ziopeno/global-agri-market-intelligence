# 자동 뉴스 수집 운영 설정

이 문서는 매주 월요일 오전 9시 10분(Asia/Seoul)에 Farmhannong Agro Weekly DB 수집, 중복 제거, AI 분석, Daily Report 업데이트가 자동으로 실행되도록 준비하는 절차입니다.

## 이미 코드에 준비된 것

- 자동 실행 API: `GET/POST /api/jobs/fetch-news`
- Vercel Cron 설정: `vercel.json`
- 실행 시간: UTC 월요일 `00:10`, Asia/Seoul 월요일 `09:10`
- Farmhannong Agro Weekly DB 연계: `https://ziopeno.github.io/farmhannong-agro-weekly-db/`
- Source별 에러 격리와 fetch log 저장
- URL 또는 `title + source` 기준 중복 제거
- 신규 기사 AI 분석
- 제품 영향 점수 계산
- Daily Report 업데이트
- 관리자 수동 실행 버튼: `/sources`, `/news`
- 터미널 수동 실행 명령: `pnpm fetch-news`
- 자동화 준비상태 점검 명령: `pnpm automation:check`

## 운영 환경변수

Vercel Project Settings 또는 `.env.local`에 아래 값을 설정합니다.

```text
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="..."
OPENAI_MODEL="gpt-4.1-mini"
OPENAI_TIMEOUT_MS="30000"
CRON_SECRET="16자_이상의_랜덤_문자열"
APP_BASE_URL="https://배포주소"
```

### 필수 값

- `DATABASE_URL`: 기사, 분석 결과, 리포트, 로그를 저장할 PostgreSQL 연결 문자열입니다.
- `OPENAI_API_KEY`: 실제 AI 요약과 요인 추출을 위해 필요합니다.
- `CRON_SECRET`: 외부에서 자동화 API를 임의 호출하지 못하도록 보호하는 실행 키입니다.
`OPENAI_API_KEY`가 없으면 데모용 휴리스틱 분석으로 동작하지만, 실제 운영 품질은 OpenAI API 연결이 필요합니다.

## DB 초기화

환경변수 설정 후 아래 순서로 실행합니다.

```bash
pnpm prisma generate
pnpm db:push
pnpm db:seed
```

`db:seed`는 기본 제품, 제품 민감도, 샘플 기사, Farmhannong Agro Weekly DB Source를 생성합니다.

## 자동화 준비상태 확인

```bash
pnpm automation:check
```

확인 항목:

- `vercel.json` cron 설정
- `CRON_SECRET`
- `OPENAI_API_KEY`
- PostgreSQL 연결
- Farmhannong Agro Weekly DB Source seed 데이터
- Active Source 개수

`FAIL`이 있으면 자동 수집 운영 전에 해결해야 합니다. `WARN`은 운영 품질에 영향을 줄 수 있는 권장 보완 항목입니다.

## 수동 실행 테스트

배포 전 또는 운영 중 즉시 테스트하려면 아래 중 하나를 사용합니다.

### 사이트 화면에서 실행

1. `/sources` 또는 `/news`로 이동합니다.
2. `Run News Fetch Now` 버튼을 누릅니다.
3. 운영 환경에서 실행 키를 요구하면 `CRON_SECRET` 값을 입력합니다.
4. 결과 메시지에서 신규/중복/분석 건수를 확인합니다.

### 터미널에서 실행

```bash
pnpm fetch-news
```

### API로 실행

```bash
curl -X POST "https://배포주소/api/jobs/fetch-news?secret=CRON_SECRET값"
```

## Vercel Cron 설정

`vercel.json`에는 이미 아래 설정이 들어 있습니다.

```json
{
  "crons": [
    {
      "path": "/api/jobs/fetch-news",
      "schedule": "10 0 * * 1"
    }
  ]
}
```

Vercel Cron은 UTC 기준으로 동작합니다. `10 0 * * 1`은 Asia/Seoul 기준 매주 월요일 오전 9시 10분입니다. 기존 카드뉴스 사이트의 월요일 오전 9시 업데이트가 끝난 직후 이 사이트가 해당 데이터를 수집하도록 10분 뒤 실행합니다.

Vercel에 `CRON_SECRET` 환경변수를 설정하면 Vercel이 자동 호출 시 `Authorization: Bearer <CRON_SECRET>` 헤더를 붙입니다. API는 이 헤더 또는 `?secret=` query 값을 검증합니다.

## 운영 후 확인 방법

1. `/sources` 화면에서 최근 Fetch 로그를 확인합니다.
2. 신규 기사, 중복 제외, 분석 완료 건수를 확인합니다.
3. 실패 Source가 있으면 URL 변경, Weekly DB 형식 오류를 점검합니다.
4. `/news`에서 신규 기사와 AI 분석 상태를 확인합니다.
5. `/reports`에서 Daily Report가 업데이트되었는지 확인합니다.

## 관리 원칙

- 자동 수집 Source는 Farmhannong Agro Weekly DB만 사용합니다.
- Source별 실패는 전체 작업을 멈추지 않으므로, 로그를 보고 개별 Source만 조정합니다.
- 제품 민감도는 사업부 합의값으로 관리합니다.
- AI 점수는 근거와 함께 검토하고, 중요한 기사일수록 사람이 수정합니다.
- 사람이 수정한 점수는 다음 리포트와 전략 판단에 반영됩니다.
