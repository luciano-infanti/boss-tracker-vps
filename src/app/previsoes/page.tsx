import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { TRACKED_BOSSES, CREATURE_MAP } from "@/lib/constants";
import { calculateSpawnPrediction } from "@/lib/predictions";
import type { SpawnPrediction } from "@/lib/predictions";
import { PredictionGrid } from "@/components/predictions/PredictionGrid";
import type { SerializedPrediction } from "@/components/predictions/PredictionGrid";
import { PageTransition } from "@/components/layout/PageTransition";

interface PrevisoesProp {
  searchParams: Promise<{ worldId?: string }>;
}

function serializePrediction(
  p: SpawnPrediction & { img: string; category: string }
): SerializedPrediction {
  return {
    bossName: p.bossName,
    img: p.img,
    category: p.category,
    dateRange: p.dateRange,
    daysUntil: p.daysUntil,
    isOverdue: p.isOverdue,
    averageInterval: Math.round(p.averageInterval),
    totalKills: p.totalKills,
    lastKillDate: p.lastKillDate.toISOString().split("T")[0],
    minGap: p.minGap,
    maxGap: p.maxGap,
    tightMinGap: p.tightMinGap,
    tightMaxGap: p.tightMaxGap,
    daysSince: p.daysSince,
    status: p.status,
    windowStart: p.windowStartDate.toISOString().split("T")[0],
    windowEnd: p.windowEndDate.toISOString().split("T")[0],
    tightStart: p.tightStartDate.toISOString().split("T")[0],
    tightEnd: p.tightEndDate.toISOString().split("T")[0],
  };
}

async function PrevisoesContent({ searchParams }: PrevisoesProp) {
  const sp = await searchParams;
  const worldId = parseInt(sp.worldId || "1", 10);

  let predictions: SerializedPrediction[] = [];

  try {
    const records = await prisma.killRecord.findMany({
      where: { worldId },
      select: { creatureName: true, effectiveDate: true, kills24h: true },
      orderBy: { effectiveDate: "asc" },
    });

    const bossDateMap = new Map<string, { dates: Set<string>; totalKills: number }>();

    for (const r of records) {
      if (r.kills24h === 0) continue;
      const existing = bossDateMap.get(r.creatureName) || {
        dates: new Set<string>(),
        totalKills: 0,
      };
      existing.dates.add(r.effectiveDate);
      existing.totalKills += r.kills24h;
      bossDateMap.set(r.creatureName, existing);
    }

    for (const name of TRACKED_BOSSES) {
      const data = bossDateMap.get(name);
      if (!data) continue;
      const creature = CREATURE_MAP.get(name);
      if (creature?.category === "Criaturas") continue;

      const prediction = calculateSpawnPrediction(
        name,
        Array.from(data.dates),
        data.totalKills
      );
      if (prediction) {
        predictions.push(
          serializePrediction({
            ...prediction,
            img: creature?.img ?? "",
            category: creature?.category ?? "Nemesis",
          })
        );
      }
    }

    predictions.sort((a, b) => a.daysUntil - b.daysUntil);
  } catch {
    // DB not available
  }

  return (
    <PageTransition>
      <PredictionGrid predictions={predictions} worldId={worldId} />
    </PageTransition>
  );
}

export default function PrevisoesPage(props: PrevisoesProp) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface rounded w-64" />
          <div className="h-4 bg-surface rounded w-96" />
          <div className="h-96 bg-surface rounded" />
        </div>
      }
    >
      <PrevisoesContent searchParams={props.searchParams} />
    </Suspense>
  );
}
