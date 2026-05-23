import { prisma } from "@/lib/db";
import { ensureNewsSourceSeeds, ensureProductSeeds, ensureSampleArticles } from "@/lib/seed";

async function main() {
  await ensureProductSeeds();
  await ensureNewsSourceSeeds();
  await ensureSampleArticles();

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
