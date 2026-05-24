import { prisma } from "@/lib/db";
import { ensureCountryWeightSeeds, ensureNewsSourceSeeds, ensureProductSeeds, ensureSampleArticles } from "@/lib/seed";

async function main() {
  await ensureProductSeeds();
  await ensureCountryWeightSeeds();
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
