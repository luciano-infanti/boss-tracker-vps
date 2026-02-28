import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { WORLD_MAP, CREATURE_MAP } from "@/lib/constants";
import { decodeBossName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KillChart } from "@/components/history/KillChart";
import { HistoryWorldSelector } from "@/components/history/HistoryWorldSelector";
import { DaysSelector } from "@/components/history/DaysSelector";
import { PageTransition } from "@/components/layout/PageTransition";
import type { BossHistoryEntry } from "@/lib/types";

interface BossHistoryPageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ worldId?: string; days?: string }>;
}

async function BossHistoryContent({
  params,
  searchParams,
}: BossHistoryPageProps) {
  const { name } = await params;
  const sp = await searchParams;
  const bossName = decodeBossName(name);
  const worldId = parseInt(sp.worldId || "1", 10);
  const days = parseInt(sp.days || "30", 10);
  const worldName = WORLD_MAP.get(worldId) || `World ${worldId}`;
  const creature = CREATURE_MAP.get(bossName);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  let history: BossHistoryEntry[] = [];
  let killLog: { effectiveDate: string; worldId: number; kills24h: number }[] = [];

  try {
    [history, killLog] = await Promise.all([
      prisma.killRecord.findMany({
        where: {
          worldId,
          creatureName: bossName,
          effectiveDate: { gte: cutoffStr },
        },
        orderBy: { effectiveDate: "asc" },
        select: { effectiveDate: true, kills24h: true },
      }),
      prisma.killRecord.findMany({
        where: { creatureName: bossName },
        orderBy: { effectiveDate: "desc" },
        select: { effectiveDate: true, worldId: true, kills24h: true },
      }),
    ]);
  } catch {
    // DB not available
  }

  return (
    <PageTransition>
      <Link
        href={`/?worldId=${worldId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>

      <div className="flex items-center gap-4 mb-2">
        {creature?.img && (
          <Image
            src={creature.img}
            alt={bossName}
            width={40}
            height={40}
            className="object-contain"
            unoptimized
          />
        )}
        <div className="flex items-center gap-3">
          <h1 className="page__title mb-0">{bossName}</h1>
          {creature?.category && (
            <Badge
              variant="secondary"
              className="bg-purple-500/10 text-purple-400 border-purple-500/20"
            >
              {creature.category}
            </Badge>
          )}
        </div>
      </div>

      {creature?.link && (
        <a
          href={creature.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors mb-2"
        >
          <ExternalLink size={12} />
          Wiki
        </a>
      )}

      {(creature?.location || creature?.notableLoot) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground mb-1">
          {creature.location && (
            <span>
              Location: <strong className="text-white">{creature.location}</strong>
            </span>
          )}
          {creature.notableLoot && (
            <span>
              Notable Loot: <strong className="text-white">{creature.notableLoot}</strong>
            </span>
          )}
        </div>
      )}

      {creature?.extraInfo && (
        <p className="text-sm text-muted-foreground mb-3 max-w-2xl">
          {creature.extraInfo}
        </p>
      )}

      {creature?.eventTag && (
        <Badge variant="secondary" className="mb-3 bg-orange-800/20 text-orange-200 border-orange-800/30 text-xs">
          {creature.eventTag}
        </Badge>
      )}

      <p className="page__subtitle">
        Kill history on <strong>{worldName}</strong> — last {days} days
      </p>

      <div className="controls">
        <Suspense fallback={null}>
          <HistoryWorldSelector />
        </Suspense>
        <Suspense fallback={null}>
          <DaysSelector />
        </Suspense>
      </div>

      <div className="chart-card">
        <KillChart data={history} />
      </div>

      {creature?.loot && creature.loot.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Notable Loot
          </h3>
          <div className="flex flex-wrap gap-3">
            {creature.loot.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface border border-border text-sm"
              >
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={20}
                    height={20}
                    className="object-contain"
                    unoptimized
                  />
                )}
                <span className="text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {killLog.length > 0 && (
        <div className="mt-8">
          <div className="flex items-baseline gap-3 mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Kill Log — All Worlds
            </h3>
            <span className="text-xs text-muted-foreground/60">
              {killLog.length} records
            </span>
          </div>
          <div className="table-wrapper">
            <Table>
              <TableHeader className="sticky top-0 bg-surface z-10">
                <TableRow>
                  <TableHead className="text-muted-foreground text-xs">Date</TableHead>
                  <TableHead className="text-muted-foreground text-xs">World</TableHead>
                  <TableHead className="text-right text-muted-foreground text-xs">Kills</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {killLog.map((entry, i) => (
                  <TableRow key={`${entry.effectiveDate}-${entry.worldId}-${i}`} className="border-b border-border hover:bg-surface-hover/50 transition-colors">
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {entry.effectiveDate}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Link
                        href={`/?worldId=${entry.worldId}`}
                        className="text-white hover:text-purple-400 transition-colors"
                      >
                        {WORLD_MAP.get(entry.worldId) || `World ${entry.worldId}`}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {entry.kills24h}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </PageTransition>
  );
}

export default function BossHistoryPage(props: BossHistoryPageProps) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-surface rounded w-32" />
          <div className="h-8 bg-surface rounded w-64" />
          <div className="h-4 bg-surface rounded w-48" />
          <div className="h-96 bg-surface rounded" />
        </div>
      }
    >
      <BossHistoryContent
        params={props.params}
        searchParams={props.searchParams}
      />
    </Suspense>
  );
}
