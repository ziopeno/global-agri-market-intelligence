import { prisma } from "@/lib/db";
import { runNewsFetchJob } from "@/lib/news-fetcher";

async function main() {
  const result = await runNewsFetchJob();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
