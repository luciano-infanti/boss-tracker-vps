"use client";

import { useState } from "react";
import type { PredictionStatus } from "@/lib/predictions";

interface BossTimelineProps {
  minGap: number;
  maxGap: number;
  tightMinGap: number;
  tightMaxGap: number;
  daysSince: number;
  status: PredictionStatus;
}

function clamp(min: number, max: number, val: number): number {
  return Math.min(max, Math.max(min, val));
}

export function BossTimeline({
  minGap,
  maxGap,
  tightMinGap,
  tightMaxGap,
  daysSince,
  status,
}: BossTimelineProps) {
  const [hovered, setHovered] = useState(false);

  const visualMax = Math.max(maxGap * 1.3, daysSince + 1);

  const windowStartPct = (minGap / visualMax) * 100;
  const windowEndPct = (maxGap / visualMax) * 100;
  const tightStartPct = (tightMinGap / visualMax) * 100;
  const tightEndPct = (tightMaxGap / visualMax) * 100;
  const tickPos = clamp(0, 100, (daysSince / visualMax) * 100);

  const outerBg =
    status === "WINDOW_OPEN"
      ? "bg-emerald-700/60"
      : status === "OVERDUE"
        ? "bg-red-700/40"
        : "bg-emerald-800/40";

  const innerBg =
    status === "WINDOW_OPEN"
      ? "bg-emerald-400/90"
      : status === "OVERDUE"
        ? "bg-red-400/60"
        : "bg-emerald-400/50";

  return (
    <div
      className="relative mt-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 h-full rounded-full ${outerBg}`}
          style={{
            left: `${windowStartPct}%`,
            width: `${windowEndPct - windowStartPct}%`,
          }}
        />
        <div
          className={`absolute top-0 h-full rounded-full ${innerBg}`}
          style={{
            left: `${tightStartPct}%`,
            width: `${tightEndPct - tightStartPct}%`,
          }}
        />
      </div>

      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white ring-1 ring-black/30 transition-all duration-300"
        style={{ left: `${tickPos}%` }}
      />

      {hovered && (
        <div className="absolute -top-8 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 border border-white/10"
          style={{ left: `${tickPos}%` }}
        >
          Dia {daysSince} de {maxGap}
        </div>
      )}
    </div>
  );
}
