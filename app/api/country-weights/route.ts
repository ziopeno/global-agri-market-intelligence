import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureCountryWeightSeeds } from "@/lib/seed";
import { clamp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureCountryWeightSeeds();
  const weights = await prisma.countryBusinessWeight.findMany({
    orderBy: { country: "asc" }
  });

  return NextResponse.json({ weights });
}

export async function PUT(request: Request) {
  await ensureCountryWeightSeeds();
  const body = await request.json().catch(() => ({}));
  const updates = Array.isArray(body.weights)
    ? body.weights
    : [
        {
          country: body.country,
          marketSizeWeight: body.marketSizeWeight,
          businessImportanceWeight: body.businessImportanceWeight,
          notes: body.notes
        }
      ];

  const results = [];
  for (const update of updates) {
    const country = String(update.country || "").trim();
    if (!country) continue;

    results.push(
      await prisma.countryBusinessWeight.upsert({
        where: { country },
        update: {
          marketSizeWeight: clamp(Number(update.marketSizeWeight ?? 1), 0.2, 3),
          businessImportanceWeight: clamp(Number(update.businessImportanceWeight ?? 1), 0.2, 3),
          notes: update.notes === undefined ? undefined : String(update.notes || "")
        },
        create: {
          country,
          marketSizeWeight: clamp(Number(update.marketSizeWeight ?? 1), 0.2, 3),
          businessImportanceWeight: clamp(Number(update.businessImportanceWeight ?? 1), 0.2, 3),
          notes: update.notes ? String(update.notes) : null
        }
      })
    );
  }

  return NextResponse.json({ updated: results.length, weights: results });
}
