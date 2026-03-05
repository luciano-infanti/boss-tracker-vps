import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { TRACKED_BOSSES, WORLDS, WORLD_ID_TO_SUPABASE_NAME } from "../src/lib/constants";
import { launchSession, establishSession, fetchApiData } from "./browser";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BOSS_SET = new Set<string>(TRACKED_BOSSES);

/** Returns date in dd/mm/yyyy for Supabase `kill_history.date` */
function getEffectiveKillDate(): string {
  // Use current local time (BRT) without SS offset since we are scraping the last 24h
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  
  const parts = formatter.formatToParts(now);
  const day = parts.find(p => p.type === "day")?.value;
  const month = parts.find(p => p.type === "month")?.value;
  const year = parts.find(p => p.type === "year")?.value;
  
  return `${day}/${month}/${year}`;
}

interface KillStatsEntry {
  race_name: string;
  creatures_killed_24h: number;
}

async function scrapeAllWorlds() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  
  const effectiveDate = getEffectiveKillDate();
  console.log(`Starting scrape for Tibia Day: ${effectiveDate}`);
  if (dryRun) console.log("  (DRY RUN — no DB writes)\n");

  const { browser, page } = await launchSession();

  try {
    await establishSession(page);
    console.log();

    for (const world of WORLDS) {
      try {
        const apiUrl = `https://rubinot.com.br/api/killstats?world=${world.id}`;
        const data = (await fetchApiData(page, apiUrl)) as {
          entries: KillStatsEntry[];
        };

        if (!data.entries || !Array.isArray(data.entries)) {
          console.error(
            `[ERR] ${world.name}: unexpected response — ${JSON.stringify(data).slice(0, 200)}`
          );
          continue;
        }

        const bossEntries = data.entries.filter((e) =>
          BOSS_SET.has(e.race_name)
        );

        // We only care about bosses that were actually killed today
        const killed = bossEntries.filter((e) => e.creatures_killed_24h > 0);

        if (killed.length > 0) {
          const supabaseWorldName = WORLD_ID_TO_SUPABASE_NAME[world.id] || world.name;
          const rowsToUpsert = killed.map((boss) => ({
            boss_name: boss.race_name,
            world: supabaseWorldName,
            date: effectiveDate,
            count: boss.creatures_killed_24h
          }));

          if (dryRun) {
            console.log(`[DRY RUN] Would upsert ${rowsToUpsert.length} records for ${supabaseWorldName}:`);
            for (const row of rowsToUpsert) {
              console.log(`     ${row.boss_name}: ${row.count} kills`);
            }
          } else {
            const { error } = await supabase
              .from("kill_history")
              .upsert(rowsToUpsert, { onConflict: "boss_name,world,date" });

            if (error) {
              console.error(`[ERR] Failed to upsert for ${supabaseWorldName}:`, error.message);
            }
          }
        }

        console.log(
          `[OK] ${world.name} — ${bossEntries.length} tracked bosses found, ${killed.length} killed today${dryRun && killed.length > 0 ? ' (Skipped DB Write)' : ''}`
        );
        if (!dryRun && killed.length > 0) {
          for (const b of killed) {
            console.log(`     ${b.race_name}: ${b.creatures_killed_24h} kills`);
          }
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[ERR] ${world.name}: ${msg}`);
      }
    }
  } finally {
    await browser.close();
  }
}

scrapeAllWorlds()
  .then(() => {
    console.log("\nScrape complete.");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
