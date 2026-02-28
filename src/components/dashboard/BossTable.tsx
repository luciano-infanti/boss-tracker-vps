"use client";

import { useState, useMemo, Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Search, ArrowUpDown, LayoutGrid, List, Trophy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { TRACKED_BOSSES, CREATURE_MAP, ALL_CATEGORIES, CATEGORY_ICONS } from "@/lib/constants";
import { encodeBossName } from "@/lib/utils";
import type { BossKillData } from "@/lib/types";

type SortKey = "name" | "kills24h" | "totalKills" | "category";
type SortDir = "asc" | "desc";
type FilterKey = "todos" | "mortos_hoje" | "nunca_mortos" | "Archdemons" | "POI" | "Criaturas" | "RubinOT";
type ViewMode = "card" | "list";

interface BossTableProps {
  bossKills: BossKillData[];
  worldId: number | null;
}

interface BossRow {
  name: string;
  kills24h: number;
  totalKills: number;
  category: string;
  img: string;
  isCriatura: boolean;
  eventTag?: string;
  lastKillDate?: string;
}

function getImageContainerClasses(row: BossRow): string {
  if (row.kills24h > 0) return "bg-emerald-500/20 border-emerald-500/30";
  if (row.totalKills === 0) return "bg-surface-hover border-border/50";
  return "bg-surface-hover border-border/50";
}

function getImageFilter(row: BossRow): string {
  if (row.totalKills === 0) return "grayscale opacity-40";
  return "";
}

function TagDots({ row }: { row: BossRow }) {
  const tags: { label: string; dotColor: string; bgColor: string; textColor: string; borderColor: string }[] = [];

  if (row.kills24h > 0) {
    tags.push({
      label: "HOJE",
      dotColor: "bg-emerald-500",
      bgColor: "bg-emerald-500/20",
      textColor: "text-emerald-400",
      borderColor: "border-emerald-500/30",
    });
  }

  if (row.totalKills > 0 && row.totalKills === row.kills24h && row.kills24h > 0) {
    tags.push({
      label: "NOVO",
      dotColor: "bg-yellow-500",
      bgColor: "bg-yellow-500/20",
      textColor: "text-yellow-500",
      borderColor: "border-yellow-500/30",
    });
  }

  if (row.eventTag) {
    tags.push({
      label: row.eventTag.toUpperCase(),
      dotColor: "bg-cyan-500",
      bgColor: "bg-cyan-500/20",
      textColor: "text-cyan-400",
      borderColor: "border-cyan-500/30",
    });
  }

  if (tags.length === 0) return null;

  return (
    <div className="absolute top-2 right-2 flex gap-1.5 z-10">
      {tags.map((tag, i) => (
        <motion.div
          key={tag.label}
          className={`group/tag flex items-center overflow-hidden cursor-default ${tag.dotColor} rounded-full`}
          initial={{ width: 8, height: 8 }}
          whileHover={{ width: "auto", height: "auto", borderRadius: 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30, delay: i * 0.03 }}
        >
          <span className={`hidden group-hover/tag:block px-1.5 py-0.5 text-[9px] font-bold whitespace-nowrap ${tag.bgColor} ${tag.textColor} border ${tag.borderColor} rounded`}>
            {tag.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

export function BossTable({ bossKills, worldId }: BossTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("kills24h");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("todos");
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const killMap = useMemo(() => {
    const map = new Map<string, BossKillData>();
    for (const k of bossKills) map.set(k.name, k);
    return map;
  }, [bossKills]);

  const rows: BossRow[] = useMemo(() => {
    return TRACKED_BOSSES.map((name) => {
      const entry = killMap.get(name);
      const creature = CREATURE_MAP.get(name);
      const category = creature?.category ?? "Nemesis";
      const totalKills = entry?.totalKills ?? 0;
      return {
        name,
        kills24h: entry?.kills24h ?? 0,
        totalKills,
        category,
        img: creature?.img ?? "",
        isCriatura: category === "Criaturas",
        eventTag: creature?.eventTag,
        lastKillDate: entry?.lastKillDate,
      };
    });
  }, [killMap]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: rows.length, mortos_hoje: 0, nunca_mortos: 0 };
    for (const cat of ALL_CATEGORIES) counts[cat] = 0;
    for (const r of rows) {
      if (r.kills24h > 0) counts.mortos_hoje++;
      if (r.totalKills === 0) counts.nunca_mortos++;
      if (counts[r.category] !== undefined) counts[r.category]++;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    let result = rows.filter(
      (r) => r.name.toLowerCase().includes(term) || r.category.toLowerCase().includes(term)
    );
    if (activeFilter === "mortos_hoje") result = result.filter((r) => r.kills24h > 0);
    else if (activeFilter === "nunca_mortos") result = result.filter((r) => r.totalKills === 0);
    else if (activeFilter !== "todos") result = result.filter((r) => r.category === activeFilter);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "kills24h") cmp = a.kills24h - b.kills24h;
      else if (sortKey === "totalKills") cmp = a.totalKills - b.totalKills;
      else if (sortKey === "category") cmp = a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [rows, search, sortKey, sortDir, activeFilter]);

  const shouldGroup = activeFilter === "todos" && !search && sortKey === "kills24h" && sortDir === "desc";
  const bossRows = useMemo(() => shouldGroup ? filtered.filter((r) => !r.isCriatura) : null, [filtered, shouldGroup]);
  const criaturaRows = useMemo(() => shouldGroup ? filtered.filter((r) => r.isCriatura) : null, [filtered, shouldGroup]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
  }

  function getBossHref(name: string) {
    return worldId ? `/boss/${encodeBossName(name)}?worldId=${worldId}` : `/boss/${encodeBossName(name)}`;
  }

  const FILTERS: { key: FilterKey; label: string; icon?: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "mortos_hoje", label: "Mortos Hoje" },
    { key: "nunca_mortos", label: "Nunca Mortos" },
    { key: "Archdemons", label: "Archdemons", icon: CATEGORY_ICONS.Archdemons },
    { key: "POI", label: "POI", icon: CATEGORY_ICONS.POI },
    { key: "Criaturas", label: "Criaturas", icon: CATEGORY_ICONS.Criaturas },
    { key: "RubinOT", label: "RubinOT", icon: CATEGORY_ICONS.RubinOT },
  ];

  function renderCard(row: BossRow) {
    return (
      <Link
        key={row.name}
        href={getBossHref(row.name)}
        className={`relative rounded-lg p-5 border transition-colors cursor-pointer group hover:bg-surface-hover h-full flex flex-col bg-surface border-border ${row.totalKills === 0 ? "opacity-80" : ""}`}
      >
        <TagDots row={row} />

        <div className="flex items-start gap-4 mb-3">
          <div className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0 border relative overflow-visible ${getImageContainerClasses(row)}`}>
            {row.img && (
              <Image
                src={row.img}
                alt={row.name}
                width={77}
                height={77}
                className={`w-[120%] h-[120%] max-w-none object-contain absolute -top-[20%] drop-shadow-lg ${getImageFilter(row)}`}
                unoptimized
              />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-medium text-white/80 text-sm truncate group-hover:text-white transition-colors">
              {row.name}
            </p>

            <div className="mt-1.5">
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <Trophy size={12} className="text-white/30" />
                <span>
                  {row.totalKills.toLocaleString()} mortes
                  {row.kills24h > 0 && (
                    <span className="text-emerald-400"> ({row.kills24h} hoje)</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  function renderListRow(row: BossRow) {
    return (
      <Link
        key={row.name}
        href={getBossHref(row.name)}
        className={`relative rounded-lg p-4 border transition-colors cursor-pointer group hover:bg-surface-hover flex items-center gap-6 bg-surface border-border ${row.totalKills === 0 ? "opacity-80" : ""}`}
      >
        <TagDots row={row} />

        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border relative overflow-visible ${getImageContainerClasses(row)}`}>
          {row.img && (
            <Image
              src={row.img}
              alt={row.name}
              width={58}
              height={58}
              className={`w-[120%] h-[120%] max-w-none object-contain absolute -top-[20%] drop-shadow-lg ${getImageFilter(row)}`}
              unoptimized
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-white/80 text-sm truncate group-hover:text-white transition-colors">
            {row.name}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs min-w-[80px] justify-end">
          <Trophy size={12} className="text-secondary/70" />
          <span className="text-white tabular-nums font-medium">{row.totalKills.toLocaleString()}</span>
          {row.kills24h > 0 && (
            <span className="text-emerald-400 tabular-nums">+{row.kills24h}</span>
          )}
        </div>
      </Link>
    );
  }

  function renderSectionHeader(label: string, count: number) {
    return (
      <div key={`header-${label}`} className="col-span-full">
        <div className="flex items-center gap-2.5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className="text-xs text-muted-foreground/50">{count}</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      </div>
    );
  }

  function renderContent() {
    if (viewMode === "card") {
      const cardRenderer = renderCard;
      if (shouldGroup && bossRows && criaturaRows) {
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {bossRows.map(cardRenderer)}
            {criaturaRows.length > 0 && (
              <Fragment>
                {renderSectionHeader("Criaturas", criaturaRows.length)}
                {criaturaRows.map(cardRenderer)}
              </Fragment>
            )}
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(cardRenderer)}
        </div>
      );
    }

    if (viewMode === "list") {
      if (shouldGroup && bossRows && criaturaRows) {
        return (
          <div className="space-y-2">
            {bossRows.map(renderListRow)}
            {criaturaRows.length > 0 && (
              <Fragment>
                {renderSectionHeader("Criaturas", criaturaRows.length)}
                {criaturaRows.map(renderListRow)}
              </Fragment>
            )}
          </div>
        );
      }
      return <div className="space-y-2">{filtered.map(renderListRow)}</div>;
    }

    return null;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(activeFilter === f.key ? "todos" : f.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border ${
              activeFilter === f.key
                ? "bg-white/10 text-white border-white/20"
                : "text-muted-foreground border-border hover:text-white hover:border-white/20"
            }`}
          >
            {f.icon && <Image src={f.icon} alt="" width={14} height={14} className="object-contain" unoptimized />}
            {f.label} ({filterCounts[f.key] ?? 0})
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setViewMode("card")}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "card" ? "text-white bg-white/10" : "text-muted-foreground hover:text-white"}`}
            aria-label="Card view"><LayoutGrid size={16} /></button>
          <button onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "text-white bg-white/10" : "text-muted-foreground hover:text-white"}`}
            aria-label="List view"><List size={16} /></button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
