"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FactorScoreEditor({
  factorId,
  value
}: {
  factorId: string;
  value: number;
}) {
  const router = useRouter();
  const [score, setScore] = useState(value);
  const [isPending, startTransition] = useTransition();

  async function save() {
    const response = await fetch(`/api/factors/${factorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manualFactorScore: score })
    });
    if (response.ok) router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        step={0.1}
        value={score}
        onChange={(event) => setScore(Number(event.target.value))}
        className="h-8 w-20 rounded-md border bg-white px-2 text-right text-xs outline-none focus:ring-2 focus:ring-ring"
        aria-label="factor score"
      />
      <Button type="button" size="icon" variant="ghost" onClick={() => startTransition(save)} disabled={isPending}>
        <Save className="h-4 w-4" />
      </Button>
    </div>
  );
}
