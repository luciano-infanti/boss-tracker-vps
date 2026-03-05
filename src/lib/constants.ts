import creaturesData from "@/data/creatures.json";
import type { Creature } from "./types";

export const CREATURES: Creature[] = creaturesData;

export const CREATURE_MAP = new Map<string, Creature>(
  CREATURES.map((c) => [c.name, c])
);

export const TRACKED_BOSSES = [
  "Acolyte of Darkness", "Albino Dragon", "Arachir the Ancient One", "Arthom the Hunter",
  "Bakragore", "Bane Bringer", "Bane of Light", "Barbaria", "Battlemaster Zunzu", "Berrypest",
  "Big Boss Trolliver", "Bride of Night", "Burster", "Cake Golem", "Captain Jones",
  "Chizzoron the Distorter", "Countess Sorrow", "Crustacea Gigantica", "Crystal Wolf",
  "Cublarc the Plunderer", "Dharalion", "Diamond Servant", "Diblis the Fair", "Dire Penguin",
  "Doomsday Cultist", "Dracola", "Draptor", "Dreadful Disruptor", "Dreadmaw", "Dryad",
  "Duskbringer", "Elf Overseer", "Elvira Hammerthrust", "Fernfang", "Ferumbras",
  "Ferumbras Mortal Shell", "Flamecaller Zazrak", "Fleabringer", "Foreman Kneebiter",
  "Frostbell", "Frostreaper", "Furyosa", "Gaz'haragoth", "General Murius", "Ghazbaran",
  "Goblin Leader", "Golden Servant", "Grand Mother Foulscale", "Grandfather Tridian",
  "Gravelord Oshuran", "Groam", "Grorlam", "Grynch Clan Goblin", "Hairman The Huge",
  "Hatebreeder", "Herald of Gloom", "High Templar Cobrass", "Hirintror", "Iks Ahpututu",
  "Imperial", "Irahsae", "Iron Servant", "Jesse the Wicked", "King Chuck",
  "Lizard Gate Guardian", "Mad Mage", "Mahatheb", "Man In The Cave", "Massacre",
  "Midnight Panther", "Midnight Spawn", "Midnight Warrior", "Morgaroth", "Mornenion",
  "Morshabaal", "Mr. Punish", "Nightfiend", "Nightslayer", "Ocyakao", "Omrafir",
  "Oodok Witchmaster", "Orshabaal", "Raging Fire", "Raxias", "Robby the Reckless",
  "Rotrender", "Rotworm Queen", "Rukor Zad", "Shadow Hound", "Shlorg", "Sir Leopold",
  "Sir Valorcrest", "Smuggler Baron Silvertoe", "Teneshpar", "The Abomination",
  "The Big Bad One", "The Blightfather", "The Evil Eye", "The Frog Prince", "The Handmaiden",
  "The Hungerer", "The Imperor", "The Last Lore Keeper", "The Manhunter", "The Mean Masher",
  "The Old Whopper", "The Pale Count", "The Percht Queen", "The Plasmother",
  "The Voice of Ruin", "The Welter", "Thornfire Wolf", "Troll Guard", "Tyrn",
  "Tzumrah the Dazzler", "Undead Cavebear", "Undead Jester", "Vicious Manbat", "Warlord Ruzad",
  "Water Buffalo", "White Pale", "Wild Horse", "Willi Wasp", "World Devourer", "Xenia",
  "Yaga the Crone", "Yakchal", "Yeti", "Zarabustor", "Zevelon Duskbringer", "Zomba",
  "Zulazza the Corruptor", "Zushuka",
] as const;

export type TrackedBoss = (typeof TRACKED_BOSSES)[number];

export const WORLDS = [
  { id: 1, name: "Elysian" },
  { id: 9, name: "Lunarian" },
  { id: 10, name: "Spectrum" },
  { id: 11, name: "Auroria" },
  { id: 12, name: "Solarian" },
  { id: 15, name: "Belaria" },
  { id: 16, name: "Vesperia" },
  { id: 17, name: "Bellum" },
  { id: 18, name: "Mystian" },
  { id: 21, name: "Tenebrium" },
  { id: 22, name: "SerenianI" },
  { id: 23, name: "SerenianII" },
  { id: 24, name: "SerenianIII" },
  { id: 25, name: "SerenianIV" },
] as const;

export type World = (typeof WORLDS)[number];

export const WORLD_MAP = new Map<number, string>(
  WORLDS.map((w) => [w.id, w.name])
);

/** Maps VPS world IDs → Supabase `kill_history.world` names */
export const WORLD_ID_TO_SUPABASE_NAME: Record<number, string> = {
  1: "Elysian",
  9: "Lunarian",
  10: "Spectrum",
  11: "Auroria",
  12: "Solarian",
  15: "Belaria",
  16: "Vesperia",
  17: "Bellum",
  18: "Mystian",
  21: "Tenebrium",
  22: "Serenian",
  23: "Serenian II",
  24: "Serenian III",
  25: "Serenian IV",
};

export const CATEGORY_ORDER: Record<string, number> = {
  Archdemons: 0,
  POI: 1,
  RubinOT: 2,
  Nemesis: 3,
  Criaturas: 4,
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_ORDER);

export const CATEGORY_ICONS: Record<string, string> = {
  Archdemons: "https://www.tibiawiki.com.br/images/1/15/Bosstiary_Nemesis.png",
  POI: "https://www.tibiawiki.com.br/images/9/94/The_Holy_Tible.gif",
  Criaturas: "https://wiki.rubinot.com/icons/ranked-icon.gif",
  RubinOT: "/images/formulas/image.png",
};

export type PvpType = "Open PvP" | "Retro Open PvP" | "Optional PvP";

export const WORLD_PVP: Record<number, PvpType> = {
  1: "Optional PvP",
  9: "Optional PvP",
  10: "Retro Open PvP",
  11: "Open PvP",
  12: "Optional PvP",
  15: "Open PvP",
  16: "Optional PvP",
  17: "Retro Open PvP",
  18: "Optional PvP",
  21: "Retro Open PvP",
  22: "Optional PvP",
  23: "Optional PvP",
  24: "Optional PvP",
  25: "Optional PvP",
};

export const PVP_ICONS: Record<PvpType, string> = {
  "Open PvP": "https://wiki.rubinot.com/icons/open-pvp.gif",
  "Retro Open PvP": "https://wiki.rubinot.com/icons/retro-open-pvp.gif",
  "Optional PvP": "https://wiki.rubinot.com/icons/optional-pvp.gif",
};
