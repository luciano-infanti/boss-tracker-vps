import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Kills are attributed to the "Tibia Day" which starts at 10:00 AM America/Sao_Paulo.
 * We shift the current time back by 10 hours, so anything before 10 AM today
 * still counts as "yesterday's" Tibia Day.
 */
export function getEffectiveKillDate(): string {
  const now = new Date();
  const shiftedTime = new Date(now.getTime() - 10 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  return formatter.format(shiftedTime);
}

export function encodeBossName(name: string): string {
  return encodeURIComponent(name);
}

export function decodeBossName(encoded: string): string {
  return decodeURIComponent(encoded);
}
