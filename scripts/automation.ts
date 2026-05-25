import cron from "node-cron";
import { runNewsFetchJob } from "@/lib/news-fetcher";
import { createRollupReport } from "@/lib/pipeline";

async function runScheduledPipeline() {
  const result = await runNewsFetchJob();
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));

  if (kst.getDay() === 1) await createRollupReport("weekly", now);
  if (kst.getDate() === 1) await createRollupReport("monthly", now);
  if (kst.getDate() === 1 && [0, 3, 6, 9].includes(kst.getMonth())) {
    await createRollupReport("quarterly", now);
  }
  if (kst.getDate() === 1 && [0, 6].includes(kst.getMonth())) {
    await createRollupReport("half_year", now);
  }
  if (kst.getDate() === 1 && kst.getMonth() === 0) {
    await createRollupReport("annual", now);
  }

  console.log(`[automation] daily pipeline complete`, result);
}

cron.schedule("0 10 * * 1", runScheduledPipeline, {
  timezone: "Asia/Seoul"
});

console.log("[automation] scheduler started: weekly Monday 10:00 Asia/Seoul");
