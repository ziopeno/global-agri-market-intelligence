import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db";

type CheckStatus = "pass" | "warn" | "fail";

type Check = {
  name: string;
  status: CheckStatus;
  message: string;
};

const checks: Check[] = [];

function addCheck(name: string, status: CheckStatus, message: string) {
  checks.push({ name, status, message });
}

async function checkVercelCron() {
  try {
    const raw = await readFile("vercel.json", "utf8");
    const config = JSON.parse(raw) as {
      crons?: Array<{ path?: string; schedule?: string }>;
    };
    const cron = config.crons?.find((item) => item.path === "/api/jobs/fetch-news");
    if (!cron) {
      addCheck("Vercel Cron", "fail", "vercel.json에 /api/jobs/fetch-news cron이 없습니다.");
      return;
    }
    if (cron.schedule !== "0 0 * * 1") {
      addCheck("Vercel Cron", "warn", `현재 schedule은 ${cron.schedule}입니다. KST 월요일 09:00은 0 0 * * 1입니다.`);
      return;
    }
    addCheck("Vercel Cron", "pass", "매주 월요일 Asia/Seoul 오전 9시 실행 설정이 있습니다.");
  } catch (error) {
    addCheck("Vercel Cron", "fail", error instanceof Error ? error.message : "vercel.json 확인 실패");
  }
}

async function checkDatabase() {
  if (!process.env.DATABASE_URL) {
    addCheck("DATABASE_URL", "fail", "DATABASE_URL 환경변수가 없습니다.");
    return;
  }

  addCheck("DATABASE_URL", "pass", "DATABASE_URL 환경변수가 설정되어 있습니다.");

  try {
    await prisma.$queryRaw`SELECT 1`;
    addCheck("Database connection", "pass", "PostgreSQL 연결이 정상입니다.");
  } catch (error) {
    addCheck("Database connection", "fail", error instanceof Error ? error.message : "PostgreSQL 연결 실패");
    return;
  }

  try {
    const [sourceCount, activeSourceCount, productCount] = await Promise.all([
      prisma.newsSource.count(),
      prisma.newsSource.count({ where: { isActive: true } }),
      prisma.product.count()
    ]);
    addCheck("Seed data", sourceCount > 0 && productCount > 0 ? "pass" : "warn", `RSS Source ${sourceCount}개, active ${activeSourceCount}개, 제품 ${productCount}개`);
    if (activeSourceCount === 0) {
      addCheck("Active RSS sources", "fail", "active RSS Source가 없습니다. /sources에서 Source를 활성화하세요.");
    } else {
      addCheck("Active RSS sources", "pass", `자동 수집 대상 Source ${activeSourceCount}개가 있습니다.`);
    }
  } catch (error) {
    addCheck("Seed data", "fail", error instanceof Error ? error.message : "Seed 데이터 확인 실패");
  }
}

function checkOpenAi() {
  if (!process.env.OPENAI_API_KEY) {
    addCheck("OPENAI_API_KEY", "warn", "키가 없으면 데모용 휴리스틱 분석으로 동작합니다. 실제 운영에는 OpenAI API 키가 필요합니다.");
    return;
  }
  addCheck("OPENAI_API_KEY", "pass", `OpenAI 모델: ${process.env.OPENAI_MODEL || "gpt-4.1-mini"}`);
}

function checkCronSecret() {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    addCheck("CRON_SECRET", "warn", "로컬 개발에서는 없어도 되지만, Vercel 운영 환경에는 반드시 설정하세요.");
    return;
  }
  if (secret.length < 16 || secret === "change-me") {
    addCheck("CRON_SECRET", "warn", "CRON_SECRET은 16자 이상의 랜덤 문자열을 권장합니다.");
    return;
  }
  addCheck("CRON_SECRET", "pass", "CRON_SECRET이 설정되어 있습니다.");
}

async function main() {
  await checkVercelCron();
  checkCronSecret();
  checkOpenAi();
  await checkDatabase();

  const icon: Record<CheckStatus, string> = {
    pass: "PASS",
    warn: "WARN",
    fail: "FAIL"
  };

  for (const check of checks) {
    console.log(`[${icon[check.status]}] ${check.name}: ${check.message}`);
  }

  const failed = checks.some((check) => check.status === "fail");
  process.exit(failed ? 1 : 0);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
