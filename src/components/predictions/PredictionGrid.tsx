"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar } from "lucide-react";
import { WORLDS, WORLD_PVP, PVP_ICONS } from "@/lib/constants";
import type { PredictionStatus } from "@/lib/predictions";
import { BossTimeline } from "./BossTimeline";

export interface SerializedPrediction {
  bossName: string;
  img: string;
  category: string;
  dateRange: string;
  daysUntil: number;
  isOverdue: boolean;
  averageInterval: number;
  totalKills: number;
  lastKillDate: string;
  minGap: number;
  maxGap: number;
  tightMinGap: number;
  tightMaxGap: number;
  daysSince: number;
  status: PredictionStatus;
  windowStart: string;
  windowEnd: string;
  tightStart: string;
  tightEnd: string;
}

interface PredictionGridProps {
  predictions: SerializedPrediction[];
  worldId: number;
}

type GroupKey =
  | "window_open"
  | "opens_today"
  | "overdue"
  | "tomorrow"
  | "next_7"
  | "later";

interface GroupDef {
  key: GroupKey;
  label: string;
  headerColor: string;
  subtitle?: string;
  pulseDot?: boolean;
}

const GROUPS: GroupDef[] = [
  {
    key: "window_open",
    label: "Janela Aberta",
    headerColor: "text-emerald-400",
    subtitle: "Janela de spawn aberta. Verificar agora!",
    pulseDot: true,
  },
  { key: "opens_today", label: "Abre Hoje", headerColor: "text-amber-400" },
  { key: "overdue", label: "Atrasados", headerColor: "text-red-400" },
  { key: "tomorrow", label: "Amanhã", headerColor: "text-secondary" },
  { key: "next_7", label: "Próximos 7 Dias", headerColor: "text-secondary" },
  { key: "later", label: "Mais Tarde", headerColor: "text-secondary" },
];

function classifyPrediction(p: SerializedPrediction): GroupKey {
  if (p.status === "OVERDUE") return "overdue";
  if (p.status === "WINDOW_OPEN") return "window_open";
  if (p.daysUntil === 0) return "opens_today";
  if (p.daysUntil === 1) return "tomorrow";
  if (p.daysUntil <= 7) return "next_7";
  return "later";
}

function formatDateShort(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

function getImageContainerClasses(status: PredictionStatus): string {
  if (status === "WINDOW_OPEN") return "bg-emerald-500/20 border-emerald-500/30";
  if (status === "OVERDUE") return "bg-red-500/10 border-red-500/30";
  return "bg-surface-hover border-border/50";
}

function getImageFilter(status: PredictionStatus): string {
  if (status === "COOLDOWN") return "grayscale";
  if (status === "OVERDUE") return "sepia saturate-200 hue-rotate-[-50deg]";
  return "";
}

function getStatusLabel(p: SerializedPrediction): {
  text: string;
  color: string;
} {
  if (p.status === "OVERDUE") {
    const overdueDays = p.daysSince - p.maxGap;
    return { text: `Atrasado ${overdueDays}d`, color: "text-red-400" };
  }
  if (p.status === "WINDOW_OPEN") {
    const daysLeft = p.maxGap - p.daysSince;
    return { text: `Fecha em ${daysLeft}d`, color: "text-emerald-400" };
  }
  return { text: `Abre em ${p.daysUntil}d`, color: "text-secondary" };
}

function PredictionCard({ pred }: { pred: SerializedPrediction }) {
  const outerStatus = getStatusLabel(pred);

  return (
    <div className="group/legend relative">
      <div
        className={`relative rounded-lg p-5 border transition-colors cursor-pointer group hover:bg-surface-hover h-full flex flex-col bg-surface border-border`}
      >
        <div className="flex items-start gap-4 mb-1">
          <div
            className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0 border relative overflow-visible ${getImageContainerClasses(pred.status)}`}
          >
            {pred.img && (
              <Image
                src={pred.img}
                alt={pred.bossName}
                width={77}
                height={77}
                className={`w-[120%] h-[120%] max-w-none object-contain absolute -top-[20%] drop-shadow-lg ${getImageFilter(pred.status)}`}
                unoptimized
              />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-medium text-white/80 text-sm truncate">
              {pred.bossName}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-white/50 mt-1">
              <Calendar size={12} className="text-white/30" />
              <span>{pred.dateRange}</span>
            </div>
          </div>
        </div>

        <BossTimeline
          minGap={pred.minGap}
          maxGap={pred.maxGap}
          tightMinGap={pred.tightMinGap}
          tightMaxGap={pred.tightMaxGap}
          daysSince={pred.daysSince}
          status={pred.status}
        />
      </div>

      {/* Hover Legend */}
      <div className="absolute left-0 right-0 -bottom-1 translate-y-full opacity-0 group-hover/legend:opacity-100 transition-opacity duration-150 z-30 pointer-events-none">
        <div className="bg-black/95 border border-white/10 rounded-lg px-3 py-2 text-[11px] space-y-2 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-emerald-800/60 border border-emerald-700/50 shrink-0" />
              <span className="text-secondary font-medium">Possível</span>
            </div>
            <span className="text-white">
              {formatDateShort(pred.windowStart)} até{" "}
              {formatDateShort(pred.windowEnd)}
            </span>
            <span className={`text-[10px] ${outerStatus.color}`}>
              {outerStatus.text}
            </span>
          </div>
          <div className="border-t border-white/5" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-emerald-400 shrink-0" />
              <span className="text-emerald-300 font-medium">Provável</span>
            </div>
            <span className="text-white">
              {formatDateShort(pred.tightStart)} até{" "}
              {formatDateShort(pred.tightEnd)}
            </span>
            <span className={`text-[10px] ${outerStatus.color}`}>
              {outerStatus.text}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupHeader({ group, count }: { group: GroupDef; count: number }) {
  return (
    <div className="col-span-full mb-1 mt-4 first:mt-0">
      <div className={`text-lg font-semibold flex items-center gap-2 ${group.headerColor}`}>
        {group.pulseDot && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        )}
        {group.label}
        <span className="text-xs font-normal text-secondary bg-surface-hover px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      {group.subtitle && (
        <p className="text-xs text-secondary/70 mt-0.5">{group.subtitle}</p>
      )}
    </div>
  );
}

export function PredictionGrid({
  predictions,
  worldId,
}: PredictionGridProps) {
  const router = useRouter();

  const grouped = new Map<GroupKey, SerializedPrediction[]>();
  for (const p of predictions) {
    const key = classifyPrediction(p);
    const arr = grouped.get(key) || [];
    arr.push(p);
    grouped.set(key, arr);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Previsões</h1>

      <div className="flex flex-wrap items-center gap-2">
        {WORLDS.map((w) => {
          const isActive = w.id === worldId;
          const pvpType = WORLD_PVP[w.id];
          const pvpIcon = pvpType ? PVP_ICONS[pvpType] : undefined;
          return (
            <button
              key={w.id}
              onClick={() => router.push(`/previsoes?worldId=${w.id}`)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 border ${
                isActive
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-surface text-secondary hover:text-white hover:bg-surface-hover border border-border/50"
              }`}
            >
              {pvpIcon && (
                <Image
                  src={pvpIcon}
                  alt=""
                  width={12}
                  height={12}
                  className="object-contain"
                  unoptimized
                />
              )}
              {w.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {GROUPS.map((group) => {
          const items = grouped.get(group.key);
          if (!items || items.length === 0) return null;
          return (
            <GroupSection key={group.key} group={group} items={items} />
          );
        })}
      </div>

      {predictions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Sem dados suficientes para previsões neste mundo.</p>
          <p className="text-xs mt-1">
            É necessário pelo menos 2 registros de kill por boss.
          </p>
        </div>
      )}
    </div>
  );
}

function GroupSection({
  group,
  items,
}: {
  group: GroupDef;
  items: SerializedPrediction[];
}) {
  return (
    <>
      <GroupHeader group={group} count={items.length} />
      {items.map((pred) => (
        <PredictionCard key={pred.bossName} pred={pred} />
      ))}
    </>
  );
}
