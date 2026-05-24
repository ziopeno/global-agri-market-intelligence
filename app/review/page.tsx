import { CountryWeightManager } from "@/components/country-weight-manager";
import { FactorReviewTable } from "@/components/factor-review-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { ensureCountryWeightSeeds, ensureProductSeeds } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  let factors: any[] = [];
  let countryWeights: any[] = [];

  try {
    await Promise.all([ensureProductSeeds(), ensureCountryWeightSeeds()]);
    [factors, countryWeights] = await Promise.all([
      prisma.articleFactor.findMany({
        include: {
          article: true,
          factorEvidence: {
            orderBy: { createdAt: "desc" },
            take: 1
          },
          revisions: {
            orderBy: { createdAt: "desc" },
            take: 5
          }
        },
        orderBy: { createdAt: "desc" },
        take: 80
      }),
      prisma.countryBusinessWeight.findMany({
        orderBy: { country: "asc" }
      })
    ]);
  } catch (error) {
    console.warn("Review page fallback: database is not available.", error);
  }

  const serializedFactors = JSON.parse(JSON.stringify(factors));
  const serializedWeights = JSON.parse(JSON.stringify(countryWeights));

  return (
    <div className="space-y-6">
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Factor Review</CardTitle>
            <CardDescription>
              AI가 추출한 근거 문장, 점수, 보정 가중치를 사람이 확인하고 수정하면 다음 제품 영향 점수와 리포트에 반영됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
              <div className="rounded-md border bg-white p-3">
                <div className="font-semibold text-slate-950">Adjusted Market Score</div>
                <p className="mt-1">Factor Score에 시장 규모, 제품 관련성, 최신성, 근거 강도를 곱해 계산합니다.</p>
              </div>
              <div className="rounded-md border bg-white p-3">
                <div className="font-semibold text-slate-950">Normalized Country Score</div>
                <p className="mt-1">국가 총점을 기사 수로 나눠 기사 수 편향을 줄입니다.</p>
              </div>
              <div className="rounded-md border bg-white p-3">
                <div className="font-semibold text-slate-950">Weighted Country Score</div>
                <p className="mt-1">정규화 점수에 관리자가 정한 사업 중요도 가중치를 곱합니다.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>국가 가중치 관리</CardTitle>
            <CardDescription>Philippines, Vietnam, Brazil, USA 같은 전략 시장의 중요도 값을 조정합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <CountryWeightManager initialWeights={serializedWeights} />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>요인별 근거 및 점수 검토</CardTitle>
            <CardDescription>Impact, Likelihood, Duration, Reliability와 근거 문장을 수정할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <FactorReviewTable factors={serializedFactors} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
