"use client";

import Image from "next/image";
import Link from "next/link";
import { Trophy, Server, BarChart3 } from "lucide-react";
import { CREATURE_MAP, WORLD_PVP, PVP_ICONS } from "@/lib/constants";
import type { ServerStat } from "@/lib/types";

interface DashboardStatsProps {
  topBosses: { name: string; kills: number }[];
  serverStats: ServerStat[];
  totalBosses: number;
  totalKills: number;
  topServer: ServerStat | null;
}

export function DashboardStats({
  topBosses,
  serverStats,
  totalBosses,
  totalKills,
  topServer,
}: DashboardStatsProps) {
  const topServers = serverStats.slice(0, 10);
  const topServerPvp = topServer ? WORLD_PVP[topServer.worldId] : undefined;
  const topServerPvpIcon = topServerPvp ? PVP_ICONS[topServerPvp] : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-white">Top 10 Mais Mortos</h3>
          </div>
        </div>
        <div className="space-y-1.5">
          {topBosses.map((boss, i) => {
            const creature = CREATURE_MAP.get(boss.name);
            return (
              <div key={boss.name} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-right text-muted-foreground/50 text-xs tabular-nums">
                  {i + 1}
                </span>
                {creature?.img && (
                  <Image
                    src={creature.img}
                    alt={boss.name}
                    width={18}
                    height={18}
                    className="object-contain"
                    unoptimized
                  />
                )}
                <span className="flex-1 text-white truncate">{boss.name}</span>
                <span className="text-muted-foreground tabular-nums text-xs">
                  {boss.kills.toLocaleString()} mortes
                </span>
              </div>
            );
          })}
          {topBosses.length === 0 && (
            <p className="text-xs text-muted-foreground/50">No data yet</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-white">Top Servidores Ativos</h3>
          </div>
        </div>
        <div className="space-y-1.5">
          {topServers.map((s, i) => {
            const pvpType = WORLD_PVP[s.worldId];
            const pvpIcon = pvpType ? PVP_ICONS[pvpType] : undefined;
            return (
              <Link
                key={s.worldId}
                href={`/?worldId=${s.worldId}`}
                className="flex items-center gap-3 text-sm hover:bg-surface-hover/50 rounded px-1 -mx-1 py-0.5 transition-colors"
              >
                <span className="w-5 text-right text-muted-foreground/50 text-xs tabular-nums">
                  {i + 1}
                </span>
                {pvpIcon && (
                  <Image
                    src={pvpIcon}
                    alt={pvpType || ""}
                    width={14}
                    height={14}
                    className="object-contain"
                    unoptimized
                  />
                )}
                <span className="flex-1 text-white truncate">{s.worldName}</span>
                <span className="text-muted-foreground tabular-nums text-xs">
                  {s.totalKills.toLocaleString()} mortes
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={14} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-white">Resumo de Estatísticas</h3>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-0.5">
              Total de Bosses Rastreados
            </p>
            <p className="text-3xl font-bold tabular-nums text-white">
              {totalBosses}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-0.5">
              Total de Mortes (Todos Mundos)
            </p>
            <p className="text-3xl font-bold tabular-nums text-emerald-400">
              {totalKills.toLocaleString()}
            </p>
          </div>
          {topServer && (
            <div>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-0.5">
                Mundo Mais Ativo (Geral)
              </p>
              <div className="flex items-center gap-2">
                {topServerPvpIcon && (
                  <Image
                    src={topServerPvpIcon}
                    alt=""
                    width={16}
                    height={16}
                    className="object-contain"
                    unoptimized
                  />
                )}
                <p className="text-2xl font-bold text-white">{topServer.worldName}</p>
                <span className="text-sm text-emerald-400 tabular-nums">
                  {topServer.totalKills.toLocaleString()} mortes
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
