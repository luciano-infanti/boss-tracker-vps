export type PredictionStatus = "WINDOW_OPEN" | "OVERDUE" | "COOLDOWN";

export interface SpawnPrediction {
  bossName: string;
  averageInterval: number;
  lastKillDate: Date;
  isOverdue: boolean;
  daysUntil: number;
  totalKills: number;
  intervals: number[];
  dateRange: string;
  minGap: number;
  maxGap: number;
  tightMinGap: number;
  tightMaxGap: number;
  daysSince: number;
  status: PredictionStatus;
  windowStartDate: Date;
  windowEndDate: Date;
  tightStartDate: Date;
  tightEndDate: Date;
}

function formatDateBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function calculateSpawnPrediction(
  bossName: string,
  dates: string[],
  totalKills: number
): SpawnPrediction | null {
  if (!dates || dates.length < 2) return null;

  const sortedDates = [...dates]
    .map((d) => new Date(d + "T00:00:00"))
    .sort((a, b) => a.getTime() - b.getTime());

  const intervals: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const diffMs = Math.abs(sortedDates[i].getTime() - sortedDates[i - 1].getTime());
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) intervals.push(diffDays);
  }

  if (intervals.length === 0) return null;

  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const totalInterval = intervals.reduce((sum, val) => sum + val, 0);
  const averageInterval = totalInterval / intervals.length;

  const minGap = sortedIntervals[0];
  const maxGap = sortedIntervals[sortedIntervals.length - 1];

  const tightMinGap = Math.round(percentile(sortedIntervals, 25));
  const tightMaxGap = Math.round(percentile(sortedIntervals, 75));

  const lastKillDate = sortedDates[sortedDates.length - 1];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSince = Math.ceil(
    (today.getTime() - lastKillDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const windowStartDate = addDays(lastKillDate, minGap);
  const windowEndDate = addDays(lastKillDate, maxGap);
  const tightStartDate = addDays(lastKillDate, tightMinGap);
  const tightEndDate = addDays(lastKillDate, tightMaxGap);

  let status: PredictionStatus;
  if (daysSince > maxGap) {
    status = "OVERDUE";
  } else if (daysSince >= minGap) {
    status = "WINDOW_OPEN";
  } else {
    status = "COOLDOWN";
  }

  const daysUntil = minGap - daysSince;
  const isOverdue = status === "OVERDUE";

  const dateRange = `${formatDateBR(windowStartDate)} — ${formatDateBR(windowEndDate)}`;

  return {
    bossName,
    averageInterval,
    lastKillDate,
    isOverdue,
    daysUntil,
    totalKills,
    intervals,
    dateRange,
    minGap,
    maxGap,
    tightMinGap,
    tightMaxGap,
    daysSince,
    status,
    windowStartDate,
    windowEndDate,
    tightStartDate,
    tightEndDate,
  };
}
