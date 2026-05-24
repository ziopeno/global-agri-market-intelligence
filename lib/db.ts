import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function normalizeConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    if (url.searchParams.get("sslmode") === "require") {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    return connectionString;
  }

  return connectionString;
}

function createPrismaClient() {
  const log: Prisma.LogLevel[] = process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return new PrismaClient({ log });
  }

  const adapter = new PrismaPg({ connectionString: normalizeConnectionString(connectionString) });
  return new PrismaClient({ adapter, log });
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
