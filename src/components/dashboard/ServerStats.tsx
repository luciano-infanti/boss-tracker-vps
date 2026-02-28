"use client";

import Link from "next/link";
import Image from "next/image";
import { CREATURE_MAP, WORLD_PVP, PVP_ICONS } from "@/lib/constants";
import type { ServerStat } from "@/lib/types";

interface ServerStatsProps {
  stats: ServerStat[];
}

export function ServerStats({ stats }: ServerStatsProps) {
  const maxKills = Math.max(...stats.map((s) => s.totalKills), 1);

  return (
    <div className="mt-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {stats.map((s) => {
          const creature = CREATURE_MAP.get(s.topBoss);
          const barWidth = (s.totalKills / maxKills) * 100;
          const pvpType = WORLD_PVP[s.worldId];
          const pvpIcon = pvpType ? PVP_ICONS[pvpType] : undefined;

          return (
            <Link
              key={s.worldId}
              href={`/?worldId=${s.worldId}`}
              className="group relative overflow-hidden rounded-lg border border-border bg-surface p-4 hover:border-purple-500/30 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {pvpIcon && (
                      <Image
                        src={pvpIcon}
                        alt={pvpType || ""}
                        width={16}
                        height={16}
                        className="object-contain"
                        unoptimized
                      />
                    )}
                    <h3 className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors">
                      {s.worldName}
                    </h3>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-white mt-0.5">
                    {s.totalKills.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                    total 24h kills
                  </p>
                </div>
                {creature?.img && (
                  <Image
                    src={creature.img}
                    alt={s.topBoss}
                    width={36}
                    height={36}
                    className="object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                    unoptimized
                  />
                )}
              </div>

              {s.topBoss !== "—" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    Top: <strong className="text-white">{s.topBoss}</strong>
                  </span>
                  <span className="tabular-nums text-muted-foreground/60">
                    ({s.topBossKills})
                  </span>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-border">
                <div
                  className="h-full bg-purple-500/50 transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
