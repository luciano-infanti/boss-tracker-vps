export interface BossLootItem {
  name: string;
  image?: string;
}

export interface BossLocation {
  x: number;
  y: number;
  z: number;
  description?: string;
}

export interface Creature {
  name: string;
  link: string;
  img: string;
  location: string;
  category: string;
  notableLoot: string;
  extraInfo: string;
  eventTag?: string;
  loot?: BossLootItem[];
  locations?: BossLocation[];
}

export interface KillEntry {
  id: string;
  worldId: number;
  creatureName: string;
  kills24h: number;
  effectiveDate: string;
  updatedAt: string;
}

export interface KillsApiResponse {
  data: KillEntry[];
  effectiveDate: string;
  worldId: number;
}

export interface BossHistoryEntry {
  effectiveDate: string;
  kills24h: number;
}

export interface BossHistoryResponse {
  boss: string;
  worldId: number;
  history: BossHistoryEntry[];
}

export interface BossKillData {
  name: string;
  kills24h: number;
  totalKills: number;
  lastKillDate?: string;
}

export interface ServerStat {
  worldId: number;
  worldName: string;
  totalKills: number;
  topBoss: string;
  topBossKills: number;
}

