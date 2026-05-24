import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isFarmhannongWeeklySource } from "@/lib/farmhannong-weekly";

export const dynamic = "force-dynamic";

export async function GET() {
  const [sources, logs] = await Promise.all([
    prisma.newsSource.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { articles: true }
        }
      }
    }),
    prisma.newsFetchLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return NextResponse.json({ sources, logs });
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name || "Untitled source");
  const url = String(body.url);
  if (!isFarmhannongWeeklySource(url, name)) {
    return NextResponse.json({ error: "Only Farmhannong Agro Weekly DB source is allowed." }, { status: 400 });
  }
  const source = await prisma.newsSource.create({
    data: {
      name,
      url,
      category: body.category ? String(body.category) : null,
      country: body.country ? String(body.country) : null,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive)
    }
  });

  return NextResponse.json({ source });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const current = await prisma.newsSource.findUnique({
    where: { id: String(body.id) }
  });
  const nextName = body.name === undefined ? current?.name : String(body.name);
  const nextUrl = body.url === undefined ? current?.url : String(body.url);
  if (!nextUrl || !isFarmhannongWeeklySource(nextUrl, nextName)) {
    return NextResponse.json({ error: "Only Farmhannong Agro Weekly DB source is allowed." }, { status: 400 });
  }
  const source = await prisma.newsSource.update({
    where: { id: String(body.id) },
    data: {
      name: body.name === undefined ? undefined : String(body.name),
      url: body.url === undefined ? undefined : String(body.url),
      category: body.category === undefined ? undefined : body.category ? String(body.category) : null,
      country: body.country === undefined ? undefined : body.country ? String(body.country) : null,
      isActive: body.isActive === undefined ? undefined : Boolean(body.isActive)
    }
  });

  return NextResponse.json({ source });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { searchParams } = new URL(request.url);
  const id = body.id || searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.newsSource.delete({
    where: { id: String(id) }
  });

  return NextResponse.json({ deleted: true });
}
