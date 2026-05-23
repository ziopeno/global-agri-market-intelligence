import { SensitivityMatrix } from "@/components/sensitivity-matrix";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getFallbackProducts } from "@/lib/fallback-data";
import { ensureProductSeeds } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function MatrixPage() {
  let products: any[] = getFallbackProducts();

  try {
    await ensureProductSeeds();
    products = await prisma.product.findMany({
      include: {
        sensitivities: true,
        productImpacts: {
          orderBy: { createdAt: "desc" },
          take: 20
        }
      },
      orderBy: { name: "asc" }
    });
  } catch (error) {
    console.warn("Matrix page fallback: database is not available.", error);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>제품 영향 매트릭스</CardTitle>
          <CardDescription>제품별 시장 변수 민감도를 수정하고 기존 제품 영향 점수를 재계산합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <SensitivityMatrix products={products} />
        </CardContent>
      </Card>
    </div>
  );
}
