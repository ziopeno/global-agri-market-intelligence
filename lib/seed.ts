import { DEFAULT_SENSITIVITY, MARKET_FACTORS, NEWS_SOURCE_SEEDS, PRODUCT_SEEDS, SAMPLE_ARTICLES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { createArticleDuplicateKey, normalizeArticleUrl } from "@/lib/dedupe";

let productSeedsReady = false;
let newsSourceSeedsReady = false;

const LEGACY_BROKEN_SOURCE_NAMES = [
  "World Bank Agriculture",
  "Reuters Commodities",
  "Agropages",
  "FeedNavigator",
  "Successful Farming"
];

const FARMHANNONG_WEEKLY_SOURCE_NAME = "Farmhannong Agro Weekly DB";

export async function ensureProductSeeds() {
  if (productSeedsReady) return;

  const [productCount, sensitivityCount] = await Promise.all([
    prisma.product.count(),
    prisma.productSensitivity.count()
  ]);
  if (productCount >= PRODUCT_SEEDS.length && sensitivityCount >= PRODUCT_SEEDS.length * MARKET_FACTORS.length) {
    productSeedsReady = true;
    return;
  }

  for (const seed of PRODUCT_SEEDS) {
    const product = await prisma.product.upsert({
      where: { name: seed.name },
      update: {
        category: seed.category,
        targetCrop: seed.targetCrop,
        targetCountry: seed.targetCountry,
        description: seed.description
      },
      create: {
        name: seed.name,
        category: seed.category,
        targetCrop: seed.targetCrop,
        targetCountry: seed.targetCountry,
        description: seed.description
      }
    });

    const sensitivity = DEFAULT_SENSITIVITY[seed.name];
    await prisma.productSensitivity.createMany({
      data: MARKET_FACTORS.map((factorName) => ({
        productId: product.id,
        factorName,
        sensitivityScore: sensitivity[factorName]
      })),
      skipDuplicates: true
    });
  }

  productSeedsReady = true;
}

export async function ensureSampleArticles() {
  for (const article of SAMPLE_ARTICLES) {
    await prisma.article.upsert({
      where: { url: normalizeArticleUrl(article.url) },
      update: {},
      create: {
        ...article,
        url: normalizeArticleUrl(article.url),
        rawContent: article.originalText,
        fetchStatus: "manual",
        analysisStatus: "pending",
        duplicateKey: createArticleDuplicateKey({
          title: article.title,
          source: article.source
        })
      }
    });
  }
}

export async function ensureNewsSourceSeeds() {
  if (newsSourceSeedsReady) return;

  for (const source of NEWS_SOURCE_SEEDS) {
    const existing = await prisma.newsSource.findFirst({
      where: {
        OR: [{ url: source.url }, { name: source.name }]
      },
      select: { id: true }
    });

    if (existing) {
      await prisma.newsSource.update({
        where: { id: existing.id },
        data: {
          name: source.name,
          url: source.url,
          category: source.category,
          country: source.country,
          isActive: source.isActive
        }
      });
      continue;
    }

    await prisma.newsSource.create({
      data: {
        name: source.name,
        url: source.url,
        category: source.category,
        country: source.country,
        isActive: source.isActive
      }
    });
  }

  await prisma.newsSource.updateMany({
    where: {
      OR: [
        { name: { in: LEGACY_BROKEN_SOURCE_NAMES } },
        { name: { not: FARMHANNONG_WEEKLY_SOURCE_NAME } }
      ]
    },
    data: { isActive: false }
  });

  await prisma.newsSource.updateMany({
    where: { name: FARMHANNONG_WEEKLY_SOURCE_NAME },
    data: { isActive: true }
  });

  newsSourceSeedsReady = true;
}
