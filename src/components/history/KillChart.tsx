"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { BossHistoryEntry } from "@/lib/types";

interface KillChartProps {
  data: BossHistoryEntry[];
}

export function KillChart({ data }: KillChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No historical data available yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradient24h" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d303b" />
        <XAxis
          dataKey="effectiveDate"
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "#1e2028",
            border: "1px solid #2d303b",
            borderRadius: "0.5rem",
            color: "#f0f0f0",
          }}
        />
        <Area
          type="monotone"
          dataKey="kills24h"
          name="Kills"
          stroke="#9333ea"
          fill="url(#gradient24h)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
