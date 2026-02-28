import { Suspense } from "react";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getEffectiveKillDate } from "@/lib/utils";
import { WORLDS, WORLD_MAP, WORLD_PVP, PVP_ICONS, TRACKED_BOSSES, CREATURE_MAP } from "@/lib/constants";
import { BossTable } from "@/components/dashboard/BossTable";
import { ServerStats } from "@/components/dashboard/ServerStats";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { PageTransition } from "@/components/layout/PageTransition";
import type { BossKillData, ServerStat } from "@/lib/types";

interface DashboardProps {
  searchParams: Promise<{ worldId?: string }>;
}

async function DashboardContent({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const worldId = params.worldId ? parseInt(params.worldId, 10) : null;
  const effectiveDate = getEffectiveKillDate();
  const isAggregate = worldId === null;
  const worldName = worldId ? WORLD_MAP.get(worldId) || `World ${worldId}` : null;
  const pvpType = worldId ? WORLD_PVP[worldId] : undefined;
  const pvpIcon = pvpType ? PVP_ICONS[pvpType] : undefined;

  let bossKills: BossKillData[] = [];
  let serverStats: ServerStat[] = [];
  let totalKillsAllWorlds = 0;
  let topBossesAll: { name: string; kills: number }[] = [];
  let dbError = false;

  try {
    const whereClause = worldId ? { worldId } : {};
    const totalKillsQuery = prisma.killRecord.groupBy({
      by: ["creatureName"],
      where: { ...whereClause, kills24h: { gt: 0 } },
      _sum: { kills24h: true },
      _max: { effectiveDate: true },
    });

    if (isAggregate) {
      const [allRecords, totalKillsResult] = await Promise.all([
        prisma.killRecord.findMany({
          where: { effectiveDate },
          select: { worldId: true, creatureName: true, kills24h: true },
        }),
        totalKillsQuery,
      ]);

      const totalMap = new Map(
        totalKillsResult.map((t) => [t.creatureName, { total: t._sum.kills24h ?? 0, lastDate: t._max.effectiveDate ?? undefined }])
      );

      topBossesAll = totalKillsResult
        .map((t) => ({ name: t.creatureName, kills: t._sum.kills24h ?? 0 }))
        .filter((t) => CREATURE_MAP.get(t.name)?.category !== "Criaturas")
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 10);

      totalKillsAllWorlds = totalKillsResult.reduce((sum, t) => sum + (t._sum.kills24h ?? 0), 0);

      const bossMap = new Map<string, { kills24h: number }>();
      const worldStats = new Map<number, { totalKills: number; topBoss: string; topBossKills: number }>();

      for (const r of allRecords) {
        const existing = bossMap.get(r.creatureName) || { kills24h: 0 };
        existing.kills24h += r.kills24h;
        bossMap.set(r.creatureName, existing);

        const ws = worldStats.get(r.worldId) || { totalKills: 0, topBoss: "", topBossKills: 0 };
        ws.totalKills += r.kills24h;
        if (r.kills24h > ws.topBossKills) {
          ws.topBossKills = r.kills24h;
          ws.topBoss = r.creatureName;
        }
        worldStats.set(r.worldId, ws);
      }

      bossKills = Array.from(bossMap.entries()).map(([name, data]) => {
        const stats = totalMap.get(name);
        return {
          name,
          kills24h: data.kills24h,
          totalKills: stats?.total ?? 0,
          lastKillDate: stats?.lastDate,
        };
      });

      serverStats = WORLDS.map((w) => {
        const ws = worldStats.get(w.id);
        return {
          worldId: w.id,
          worldName: w.name,
          totalKills: ws?.totalKills ?? 0,
          topBoss: ws?.topBoss ?? "—",
          topBossKills: ws?.topBossKills ?? 0,
        };
      }).sort((a, b) => b.totalKills - a.totalKills);
    } else {
      const [records, totalKillsResult] = await Promise.all([
        prisma.killRecord.findMany({
          where: { worldId, effectiveDate },
        }),
        totalKillsQuery,
      ]);

      const totalMap = new Map(
        totalKillsResult.map((t) => [t.creatureName, { total: t._sum.kills24h ?? 0, lastDate: t._max.effectiveDate ?? undefined }])
      );

      totalKillsAllWorlds = totalKillsResult.reduce((sum, t) => sum + (t._sum.kills24h ?? 0), 0);

      topBossesAll = totalKillsResult
        .map((t) => ({ name: t.creatureName, kills: t._sum.kills24h ?? 0 }))
        .filter((t) => CREATURE_MAP.get(t.name)?.category !== "Criaturas")
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 10);

      bossKills = records.map((r) => {
        const stats = totalMap.get(r.creatureName);
        return {
          name: r.creatureName,
          kills24h: r.kills24h,
          totalKills: stats?.total ?? 0,
          lastKillDate: stats?.lastDate,
        };
      });
    }
  } catch {
    dbError = true;
  }

  const topServer = serverStats[0] ?? null;

  return (
    <PageTransition>
      {worldId && worldName && (
        <div className="flex items-center gap-3 mb-6">
          {pvpIcon && (
            <Image
              src={pvpIcon}
              alt={pvpType || ""}
              width={24}
              height={24}
              className="object-contain"
              unoptimized
            />
          )}
          <h1 className="text-2xl font-bold tracking-tight text-white">{worldName}</h1>
        </div>
      )}

      {dbError && (
        <div className="mb-4 p-4 rounded-lg border border-rose-500/30 bg-rose-500/10 text-sm text-rose-500">
          Could not connect to the database. Make sure PostgreSQL is running
          and your <code>DATABASE_URL</code> in <code>.env</code> is correct,
          then run <code>npx prisma migrate dev</code>.
        </div>
      )}

      {isAggregate && (
        <DashboardStats
          topBosses={topBossesAll}
          serverStats={serverStats}
          totalBosses={TRACKED_BOSSES.length}
          totalKills={totalKillsAllWorlds}
          topServer={topServer}
        />
      )}

      <BossTable bossKills={bossKills} worldId={worldId} />

      {isAggregate && serverStats.length > 0 && (
        <ServerStats stats={serverStats} />
      )}
    </PageTransition>
  );
}

export default function DashboardPage(props: DashboardProps) {
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
      <DashboardContent searchParams={props.searchParams} />
    </Suspense>
  );
}
